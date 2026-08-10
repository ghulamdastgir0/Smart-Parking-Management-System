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
import { UpdateParkingFloorDto } from './dto/update-parking-floor.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { LocationService } from './location.service';
import { MapsService } from './maps.service';
import { rowLabel } from './row-label.util';

const DEFAULT_RADIUS_KM = 10;
const DUPLICATE_LOT_RADIUS_KM = 0.05; // ~50m

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
    await this.assertNoDuplicateLot(dto.name, dto.latitude, dto.longitude);

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
    await this.assertManagerOwnsLot(lotId, requestingUser);

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
      where: {
        floorId: { in: floors.map((f) => f.id) },
        status: SlotStatus.AVAILABLE,
      },
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

  async updateFloor(
    lotId: string,
    floorId: string,
    dto: UpdateParkingFloorDto,
    requestingUser: AuthenticatedUser,
  ): Promise<ParkingFloorResponseDto> {
    await this.assertManagerOwnsLot(lotId, requestingUser);
    const floor = await this.assertFloorBelongsToLot(lotId, floorId);

    const newRows = dto.rows ?? floor.rows;
    const newColumns = dto.columns ?? floor.columns;
    const isResizing = newRows !== floor.rows || newColumns !== floor.columns;

    if (isResizing) {
      const totalSlots = newRows * newColumns;
      if (totalSlots > MAX_TOTAL_SLOTS) {
        throw new BadRequestException(
          `rows × columns (${totalSlots}) exceeds the maximum of ${MAX_TOTAL_SLOTS} slots per floor`,
        );
      }
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const updatedFloor = await tx.parkingFloor.update({
          where: { id: floor.id },
          data: {
            name: dto.name,
            floorNumber: dto.floorNumber,
            rows: newRows,
            columns: newColumns,
          },
        });

        if (dto.defaultSlotPrice !== undefined) {
          await tx.parkingSlot.updateMany({
            where: { floorId: floor.id },
            data: { basePrice: dto.defaultSlotPrice },
          });
        }

        if (isResizing) {
          const existingSlots = await tx.parkingSlot.findMany({
            where: { floorId: floor.id },
            select: { id: true, slotNumber: true },
          });
          const existingNumbers = new Set(
            existingSlots.map((s) => s.slotNumber),
          );
          const targetNumbers = this.buildSlotGridNumbers(newRows, newColumns);

          const toRemoveIds = existingSlots
            .filter((s) => !targetNumbers.has(s.slotNumber))
            .map((s) => s.id);
          const toAddNumbers = [...targetNumbers].filter(
            (slotNumber) => !existingNumbers.has(slotNumber),
          );

          if (toAddNumbers.length > 0 && dto.defaultSlotPrice === undefined) {
            throw new BadRequestException(
              'defaultSlotPrice is required when growing rows/columns adds new slots to this floor',
            );
          }

          if (toRemoveIds.length > 0) {
            await tx.parkingSlot.deleteMany({
              where: { id: { in: toRemoveIds } },
            });
          }
          if (toAddNumbers.length > 0) {
            await tx.parkingSlot.createMany({
              data: toAddNumbers.map((slotNumber) => ({
                lotId,
                floorId: floor.id,
                slotNumber,
                basePrice: dto.defaultSlotPrice!,
              })),
            });
          }
        }

        await this.auditService.log(
          {
            entityType: 'ParkingFloor',
            entityId: updatedFloor.id,
            action: 'PARKING_FLOOR_UPDATED',
            userId: requestingUser.userId,
            metadata: { lotId, ...dto },
          },
          tx,
        );

        return updatedFloor;
      });

      const availableSlots = await this.prisma.parkingSlot.count({
        where: { floorId: updated.id, status: SlotStatus.AVAILABLE },
      });

      return {
        ...updated,
        totalSlots: updated.rows * updated.columns,
        availableSlots,
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot shrink this floor: some of the removed slots have existing reservations',
        );
      }
      throw error;
    }
  }

  private buildSlotGridNumbers(rows: number, columns: number): Set<string> {
    const numbers = new Set<string>();
    for (let row = 1; row <= rows; row += 1) {
      const label = rowLabel(row);
      for (let col = 1; col <= columns; col += 1) {
        numbers.add(`${label}${col}`);
      }
    }
    return numbers;
  }

  async removeFloor(
    lotId: string,
    floorId: string,
    requestingUser: AuthenticatedUser,
  ): Promise<void> {
    await this.assertManagerOwnsLot(lotId, requestingUser);
    const floor = await this.assertFloorBelongsToLot(lotId, floorId);

    try {
      await this.prisma.parkingFloor.delete({ where: { id: floor.id } });

      await this.auditService.log({
        entityType: 'ParkingFloor',
        entityId: floor.id,
        action: 'PARKING_FLOOR_DELETED',
        userId: requestingUser.userId,
        metadata: { lotId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete this floor: it has slots tied to existing reservations',
        );
      }
      throw error;
    }
  }

  private async assertFloorBelongsToLot(lotId: string, floorId: string) {
    const floor = await this.prisma.parkingFloor.findUnique({
      where: { id: floorId },
    });
    if (!floor || floor.lotId !== lotId) {
      throw new NotFoundException(
        `Floor ${floorId} not found on parking lot ${lotId}`,
      );
    }
    return floor;
  }

  /**
   * Rejects an exact (case-insensitive) name match, or coordinates within
   * DUPLICATE_LOT_RADIUS_KM of an existing lot — catches both a copy-pasted name and a
   * near-identical map pin, without false-positiving on legitimately nearby-but-different lots.
   */
  private async assertNoDuplicateLot(
    name: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    const nameMatch = await this.prisma.parkingLot.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (nameMatch) {
      throw new ConflictException(
        `A parking lot named "${name}" already exists`,
      );
    }

    const nearby = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "ParkingLot"
      WHERE (6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(${latitude}::float)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${longitude}::float)) +
          sin(radians(${latitude}::float)) * sin(radians(latitude))
        ))
      )) <= ${DUPLICATE_LOT_RADIUS_KM}::float
      LIMIT 1
    `;
    if (nearby.length > 0) {
      throw new ConflictException(
        'Another parking lot already exists within 50m of this location',
      );
    }
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
  ): Promise<
    Map<string, { availableSlots: number; minHourlyRate: string | null }>
  > {
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

  private async getTotalSlotsMap(
    lotIds: string[],
  ): Promise<Map<string, number>> {
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
    availability: Map<
      string,
      { availableSlots: number; minHourlyRate: string | null }
    >,
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

  async findAll(
    requestingUser?: AuthenticatedUser,
  ): Promise<ParkingLotWithAvailability[]> {
    const lots = await this.prisma.parkingLot.findMany({
      where:
        requestingUser?.role === Role.CUSTOMER ? { isActive: true } : undefined,
    });
    const lotIds = lots.map((l) => l.id);
    const [availability, totalSlots] = await Promise.all([
      this.getAvailabilityMap(lotIds),
      this.getTotalSlotsMap(lotIds),
    ]);
    return lots.map((lot) =>
      this.mergeEnrichment(lot, availability, totalSlots),
    );
  }

  async findOne(
    id: string,
    requestingUser?: AuthenticatedUser,
  ): Promise<ParkingLotWithAvailability> {
    const lot = await this.prisma.parkingLot.findUnique({ where: { id } });
    // A customer gets the same 404 for "doesn't exist" and "exists but is deactivated" —
    // an inactive lot must be fully unreachable to customers, not just hidden from lists.
    if (!lot || (requestingUser?.role === Role.CUSTOMER && !lot.isActive)) {
      throw new NotFoundException(`Parking lot ${id} not found`);
    }
    const [availability, totalSlots] = await Promise.all([
      this.getAvailabilityMap([id]),
      this.getTotalSlotsMap([id]),
    ]);
    return this.mergeEnrichment(lot, availability, totalSlots);
  }

  async update(
    id: string,
    dto: UpdateParkingLotDto,
    requestingUser: AuthenticatedUser,
  ): Promise<ParkingLot> {
    const lot = await this.assertManagerOwnsLot(id, requestingUser);

    const data = { ...dto };
    if (requestingUser.role === Role.MANAGER) {
      // Only an admin may reassign a lot to a different manager.
      delete data.managerId;
    }

    return this.prisma.parkingLot.update({ where: { id: lot.id }, data });
  }

  async remove(
    id: string,
    requestingUser: AuthenticatedUser,
  ): Promise<ParkingLot> {
    const lot = await this.assertManagerOwnsLot(id, requestingUser);
    return this.prisma.parkingLot.delete({ where: { id: lot.id } });
  }

  private async assertManagerOwnsLot(
    id: string,
    requestingUser: AuthenticatedUser,
  ): Promise<ParkingLot> {
    const lot = await this.prisma.parkingLot.findUnique({ where: { id } });
    if (!lot) {
      throw new NotFoundException(`Parking lot ${id} not found`);
    }
    if (
      requestingUser.role === Role.MANAGER &&
      lot.managerId !== requestingUser.userId
    ) {
      throw new ForbiddenException('You do not manage this parking lot');
    }
    return lot;
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
        WHERE "isActive" = true
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
