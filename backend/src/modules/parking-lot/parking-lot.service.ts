import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ParkingLot, Role, SlotStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  CreateFloorInputDto,
  CreateParkingLotDto,
  MAX_TOTAL_SLOTS,
} from './dto/create-parking-lot.dto';
import { FindNearbyLotsDto } from './dto/find-nearby-lots.dto';
import { NearbyParkingLotDto } from './dto/nearby-parking-lot.dto';
import { ParkingFloorResponseDto } from './dto/parking-floor-response.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { LocationService } from './location.service';
import { MapsService } from './maps.service';
import { rowLabel } from './row-label.util';

const DEFAULT_RADIUS_KM = 10;

interface NearbyLotRow {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
}

export interface LotEnrichment {
  totalSlots: number;
  availableSlots: number;
  minHourlyRate: string | null;
}

export type ParkingLotWithAvailability = ParkingLot & LotEnrichment;

@Injectable()
export class ParkingLotService {
  private readonly logger = new Logger(ParkingLotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
    private readonly mapsService: MapsService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    dto: CreateParkingLotDto,
    requestingManagerId: string,
    requestingUserId: string,
  ): Promise<ParkingLot> {
    this.assertUniqueFloorNumbers(dto.floors);
    const totalSlots = this.assertWithinSlotLimit(dto.floors);

    const verification = await this.locationService.verifyAddress(dto.address);
    if (!verification.verified) {
      this.logger.warn(
        `Address could not be verified with maps provider: ${dto.address}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const lot = await tx.parkingLot.create({
        data: {
          name: dto.name,
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
          managerId: dto.managerId ?? requestingManagerId,
        },
      });

      for (const floorInput of dto.floors) {
        const floor = await tx.parkingFloor.create({
          data: {
            lotId: lot.id,
            name: floorInput.name,
            floorNumber: floorInput.floorNumber,
            rows: floorInput.rows,
            columns: floorInput.columns,
          },
        });

        await tx.parkingSlot.createMany({
          data: this.buildSlotGrid(
            lot.id,
            floor.id,
            floorInput.rows,
            floorInput.columns,
            floorInput.defaultSlotPrice,
          ),
        });
      }

      await this.auditService.log(
        {
          entityType: 'ParkingLot',
          entityId: lot.id,
          action: 'PARKING_LOT_CREATED',
          userId: requestingUserId,
          metadata: { floorCount: dto.floors.length, totalSlots },
        },
        tx,
      );

      return lot;
    });
  }

  async createFloor(
    lotId: string,
    dto: CreateFloorInputDto,
    requestingUser: AuthenticatedUser,
  ): Promise<ParkingFloorResponseDto> {
    const lot = await this.prisma.parkingLot.findUnique({
      where: { id: lotId },
    });
    if (!lot) {
      throw new NotFoundException(`Parking lot ${lotId} not found`);
    }
    if (
      requestingUser.role === Role.MANAGER &&
      lot.managerId !== requestingUser.userId
    ) {
      throw new ForbiddenException('You do not manage this parking lot');
    }

    const totalSlots = dto.rows * dto.columns;
    if (totalSlots > MAX_TOTAL_SLOTS) {
      throw new BadRequestException(
        `rows × columns (${totalSlots}) exceeds the maximum of ${MAX_TOTAL_SLOTS} slots per floor`,
      );
    }

    try {
      const floor = await this.prisma.$transaction(async (tx) => {
        const created = await tx.parkingFloor.create({
          data: {
            lotId,
            name: dto.name,
            floorNumber: dto.floorNumber,
            rows: dto.rows,
            columns: dto.columns,
          },
        });

        await tx.parkingSlot.createMany({
          data: this.buildSlotGrid(
            lotId,
            created.id,
            dto.rows,
            dto.columns,
            dto.defaultSlotPrice,
          ),
        });

        await this.auditService.log(
          {
            entityType: 'ParkingFloor',
            entityId: created.id,
            action: 'PARKING_FLOOR_CREATED',
            userId: requestingUser.userId,
            metadata: { lotId, rows: dto.rows, columns: dto.columns },
          },
          tx,
        );

        return created;
      });

      return {
        ...floor,
        totalSlots: floor.rows * floor.columns,
        availableSlots: floor.rows * floor.columns,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Floor number ${dto.floorNumber} already exists for this lot`,
        );
      }
      throw error;
    }
  }

  async findFloors(lotId: string): Promise<ParkingFloorResponseDto[]> {
    const lot = await this.prisma.parkingLot.findUnique({
      where: { id: lotId },
    });
    if (!lot) {
      throw new NotFoundException(`Parking lot ${lotId} not found`);
    }

    const floors = await this.prisma.parkingFloor.findMany({
      where: { lotId },
      orderBy: { floorNumber: 'asc' },
    });

    const availableByFloor = await this.prisma.parkingSlot.groupBy({
      by: ['floorId'],
      where: { floorId: { in: floors.map((f) => f.id) }, status: SlotStatus.AVAILABLE },
      _count: { _all: true },
    });
    const availabilityMap = new Map(
      availableByFloor.map((row) => [row.floorId, row._count._all]),
    );

    return floors.map((floor) => ({
      ...floor,
      totalSlots: floor.rows * floor.columns,
      availableSlots: availabilityMap.get(floor.id) ?? 0,
    }));
  }

  private assertUniqueFloorNumbers(floors: CreateFloorInputDto[]): void {
    const seen = new Set<number>();
    for (const floor of floors) {
      if (seen.has(floor.floorNumber)) {
        throw new BadRequestException(
          `Duplicate floorNumber ${floor.floorNumber} in floors[]`,
        );
      }
      seen.add(floor.floorNumber);
    }
  }

  private assertWithinSlotLimit(floors: CreateFloorInputDto[]): number {
    let totalSlots = 0;
    for (const floor of floors) {
      const floorSlots = floor.rows * floor.columns;
      if (floorSlots > MAX_TOTAL_SLOTS) {
        throw new BadRequestException(
          `rows × columns (${floorSlots}) for floor "${floor.name}" exceeds the maximum of ${MAX_TOTAL_SLOTS} slots per floor`,
        );
      }
      totalSlots += floorSlots;
    }
    return totalSlots;
  }

  private buildSlotGrid(
    lotId: string,
    floorId: string,
    rows: number,
    columns: number,
    basePrice: number,
  ): Prisma.ParkingSlotCreateManyInput[] {
    const slots: Prisma.ParkingSlotCreateManyInput[] = [];

    for (let row = 1; row <= rows; row += 1) {
      const label = rowLabel(row);
      for (let col = 1; col <= columns; col += 1) {
        slots.push({
          lotId,
          floorId,
          slotNumber: `${label}${col}`,
          basePrice,
        });
      }
    }

    return slots;
  }

  /**
   * Slot counts/pricing aren't denormalized onto ParkingLot, so every list/detail response
   * enriches with grouped aggregate queries rather than one query per lot.
   */
  private async getAvailabilityMap(
    lotIds: string[],
  ): Promise<Map<string, { availableSlots: number; minHourlyRate: string | null }>> {
    if (lotIds.length === 0) {
      return new Map();
    }

    const grouped = await this.prisma.parkingSlot.groupBy({
      by: ['lotId'],
      where: { lotId: { in: lotIds }, status: SlotStatus.AVAILABLE },
      _count: { _all: true },
      _min: { basePrice: true },
    });

    return new Map(
      grouped.map((group) => [
        group.lotId,
        {
          availableSlots: group._count._all,
          minHourlyRate: group._min.basePrice?.toString() ?? null,
        },
      ]),
    );
  }

  private async getTotalSlotsMap(lotIds: string[]): Promise<Map<string, number>> {
    if (lotIds.length === 0) {
      return new Map();
    }

    const floors = await this.prisma.parkingFloor.findMany({
      where: { lotId: { in: lotIds } },
      select: { lotId: true, rows: true, columns: true },
    });

    const totals = new Map<string, number>();
    for (const floor of floors) {
      totals.set(
        floor.lotId,
        (totals.get(floor.lotId) ?? 0) + floor.rows * floor.columns,
      );
    }
    return totals;
  }

  private mergeEnrichment(
    lot: ParkingLot,
    availability: Map<string, { availableSlots: number; minHourlyRate: string | null }>,
    totalSlots: Map<string, number>,
  ): ParkingLotWithAvailability {
    const entry = availability.get(lot.id);
    return {
      ...lot,
      totalSlots: totalSlots.get(lot.id) ?? 0,
      availableSlots: entry?.availableSlots ?? 0,
      minHourlyRate: entry?.minHourlyRate ?? null,
    };
  }

  async findAll(): Promise<ParkingLotWithAvailability[]> {
    const lots = await this.prisma.parkingLot.findMany();
    const lotIds = lots.map((l) => l.id);
    const [availability, totalSlots] = await Promise.all([
      this.getAvailabilityMap(lotIds),
      this.getTotalSlotsMap(lotIds),
    ]);
    return lots.map((lot) => this.mergeEnrichment(lot, availability, totalSlots));
  }

  async findOne(id: string): Promise<ParkingLotWithAvailability> {
    const lot = await this.prisma.parkingLot.findUnique({ where: { id } });
    if (!lot) {
      throw new NotFoundException(`Parking lot ${id} not found`);
    }
    const [availability, totalSlots] = await Promise.all([
      this.getAvailabilityMap([id]),
      this.getTotalSlotsMap([id]),
    ]);
    return this.mergeEnrichment(lot, availability, totalSlots);
  }

  async update(id: string, dto: UpdateParkingLotDto): Promise<ParkingLot> {
    await this.findOne(id);
    return this.prisma.parkingLot.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<ParkingLot> {
    await this.findOne(id);
    return this.prisma.parkingLot.delete({ where: { id } });
  }

  /**
   * Straight-line distance is computed in SQL via the Haversine formula (so filtering and
   * sorting happen in Postgres, not after pulling every row into Node), then each result
   * is enriched with a driving distance/ETA from the maps provider.
   */
  async findNearby(dto: FindNearbyLotsDto): Promise<NearbyParkingLotDto[]> {
    const radiusKm = dto.radiusKm ?? DEFAULT_RADIUS_KM;

    const rows = await this.prisma.$queryRaw<NearbyLotRow[]>`
      WITH distances AS (
        SELECT
          id,
          name,
          address,
          latitude,
          longitude,
          (6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${dto.latitude}::float)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians(${dto.longitude}::float)) +
              sin(radians(${dto.latitude}::float)) * sin(radians(latitude))
            ))
          )) AS "distanceKm"
        FROM "ParkingLot"
      )
      SELECT *
      FROM distances
      WHERE "distanceKm" <= ${radiusKm}::float
      ORDER BY "distanceKm" ASC
    `;

    const origin = { latitude: dto.latitude, longitude: dto.longitude };
    const destinations = rows.map((row) => ({
      latitude: row.latitude,
      longitude: row.longitude,
    }));
    const lotIds = rows.map((row) => row.id);
    const [etas, availability, totalSlots] = await Promise.all([
      this.mapsService.getDrivingEtas(origin, destinations),
      this.getAvailabilityMap(lotIds),
      this.getTotalSlotsMap(lotIds),
    ]);

    return rows.map((row, index) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      distanceKm: Math.round(Number(row.distanceKm) * 100) / 100,
      drivingDistanceKm: etas[index].distanceKm,
      etaMinutes: etas[index].durationMinutes,
      totalSlots: totalSlots.get(row.id) ?? 0,
      availableSlots: availability.get(row.id)?.availableSlots ?? 0,
      minHourlyRate: availability.get(row.id)?.minHourlyRate ?? null,
    }));
  }
}
