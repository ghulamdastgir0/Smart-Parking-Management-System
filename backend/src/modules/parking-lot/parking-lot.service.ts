import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ParkingLot, SlotStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateParkingLotDto,
  MAX_TOTAL_SLOTS,
} from './dto/create-parking-lot.dto';
import { FindNearbyLotsDto } from './dto/find-nearby-lots.dto';
import { NearbyParkingLotDto } from './dto/nearby-parking-lot.dto';
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

export interface LotAvailability {
  availableSlots: number;
  minHourlyRate: string | null;
}

export type ParkingLotWithAvailability = ParkingLot & LotAvailability;

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
    const totalSlots = dto.rows * dto.columns;
    if (totalSlots > MAX_TOTAL_SLOTS) {
      throw new BadRequestException(
        `rows × columns (${totalSlots}) exceeds the maximum of ${MAX_TOTAL_SLOTS} slots per lot`,
      );
    }

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
          rows: dto.rows,
          columns: dto.columns,
        },
      });

      await tx.parkingSlot.createMany({
        data: this.buildSlotGrid(
          lot.id,
          dto.rows,
          dto.columns,
          dto.defaultSlotPrice,
        ),
      });

      await this.auditService.log(
        {
          entityType: 'ParkingLot',
          entityId: lot.id,
          action: 'PARKING_LOT_CREATED',
          userId: requestingUserId,
          metadata: { rows: dto.rows, columns: dto.columns, totalSlots },
        },
        tx,
      );

      return lot;
    });
  }

  private buildSlotGrid(
    lotId: string,
    rows: number,
    columns: number,
    basePrice: number,
  ): Prisma.ParkingSlotCreateManyInput[] {
    const slots: Prisma.ParkingSlotCreateManyInput[] = [];

    for (let row = 1; row <= rows; row += 1) {
      const label = rowLabel(row);
      for (let col = 1; col <= columns; col += 1) {
        slots.push({ lotId, slotNumber: `${label}${col}`, basePrice });
      }
    }

    return slots;
  }

  /**
   * Slot counts/pricing aren't denormalized onto ParkingLot, so every list/detail response
   * enriches with a single grouped aggregate query rather than one query per lot.
   */
  private async getAvailabilityMap(
    lotIds: string[],
  ): Promise<Map<string, LotAvailability>> {
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

  private mergeAvailability(
    lot: ParkingLot,
    availability: Map<string, LotAvailability>,
  ): ParkingLotWithAvailability {
    const entry = availability.get(lot.id);
    return {
      ...lot,
      availableSlots: entry?.availableSlots ?? 0,
      minHourlyRate: entry?.minHourlyRate ?? null,
    };
  }

  async findAll(): Promise<ParkingLotWithAvailability[]> {
    const lots = await this.prisma.parkingLot.findMany();
    const availability = await this.getAvailabilityMap(lots.map((l) => l.id));
    return lots.map((lot) => this.mergeAvailability(lot, availability));
  }

  async findOne(id: string): Promise<ParkingLotWithAvailability> {
    const lot = await this.prisma.parkingLot.findUnique({ where: { id } });
    if (!lot) {
      throw new NotFoundException(`Parking lot ${id} not found`);
    }
    const availability = await this.getAvailabilityMap([id]);
    return this.mergeAvailability(lot, availability);
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
    const [etas, availability] = await Promise.all([
      this.mapsService.getDrivingEtas(origin, destinations),
      this.getAvailabilityMap(rows.map((row) => row.id)),
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
      availableSlots: availability.get(row.id)?.availableSlots ?? 0,
      minHourlyRate: availability.get(row.id)?.minHourlyRate ?? null,
    }));
  }
}
