import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ReservationStatus, Role, SlotStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { DEFAULT_CHECKOUT_BUFFER_MINUTES } from '../reservation/reservation.service';
import { BulkUpdateSlotStatusDto } from './dto/bulk-update-slot-status.dto';
import { FindSlotsDto } from './dto/find-slots.dto';
import { UpdateSlotStatusDto } from './dto/update-slot-status.dto';

const SLOT_WITH_FLOOR_INCLUDE = {
  floor: { select: { id: true, name: true, floorNumber: true } },
} satisfies Prisma.ParkingSlotInclude;

export type ParkingSlotWithFloor = Prisma.ParkingSlotGetPayload<{
  include: typeof SLOT_WITH_FLOOR_INCLUDE;
}>;

export type ParkingSlotSearchResult = ParkingSlotWithFloor & {
  availableForWindow?: boolean;
};

@Injectable()
export class ParkingSlotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async search(dto: FindSlotsDto): Promise<ParkingSlotSearchResult[]> {
    const hasWindow = Boolean(dto.arrivalTime) && dto.durationMinutes != null;

    if (!hasWindow) {
      return this.prisma.parkingSlot.findMany({
        where: {
          lotId: dto.lotId,
          floorId: dto.floorId,
          status: dto.status ?? SlotStatus.AVAILABLE,
        },
        orderBy: { slotNumber: 'asc' },
        include: SLOT_WITH_FLOOR_INCLUDE,
      });
    }

    const slots = await this.prisma.parkingSlot.findMany({
      where: { lotId: dto.lotId, floorId: dto.floorId, status: dto.status },
      orderBy: { slotNumber: 'asc' },
      include: SLOT_WITH_FLOOR_INCLUDE,
    });
    if (slots.length === 0) return [];

    const arrivalTime = new Date(dto.arrivalTime!);
    const expectedCheckout = new Date(
      arrivalTime.getTime() + dto.durationMinutes! * 60_000,
    );
    const bufferMs = this.getCheckoutBufferMinutes() * 60_000;
    const blockEnd = new Date(expectedCheckout.getTime() + bufferMs);
    const windowStart = new Date(arrivalTime.getTime() - bufferMs);

    // Same buffer-inclusive interval overlap the reservation creation check uses, so a slot
    // shown as bookable here is guaranteed to still pass that check.
    const overlapping = await this.prisma.reservation.findMany({
      where: {
        slotId: { in: slots.map((s) => s.id) },
        status: {
          notIn: [ReservationStatus.CANCELLED, ReservationStatus.COMPLETED],
        },
        startTime: { lt: blockEnd },
        endTime: { gt: windowStart },
      },
      select: { slotId: true },
    });
    const blockedSlotIds = new Set(overlapping.map((r) => r.slotId));

    return slots.map((slot) => ({
      ...slot,
      availableForWindow:
        slot.status !== SlotStatus.MAINTENANCE && !blockedSlotIds.has(slot.id),
    }));
  }

  private getCheckoutBufferMinutes(): number {
    return this.configService.get<number>(
      'CHECKOUT_GRACE_BUFFER_MINUTES',
      DEFAULT_CHECKOUT_BUFFER_MINUTES,
    );
  }

  async findOne(id: string): Promise<ParkingSlotWithFloor> {
    const slot = await this.prisma.parkingSlot.findUnique({
      where: { id },
      include: SLOT_WITH_FLOOR_INCLUDE,
    });
    if (!slot) {
      throw new NotFoundException(`Parking slot ${id} not found`);
    }
    return slot;
  }

  /**
   * Lets staff restrict a slot (e.g. for construction) or lift the restriction. Only
   * AVAILABLE <-> MAINTENANCE is allowed here — RESERVED/OCCUPIED are system-managed and
   * can't be restricted mid-use.
   */
  async updateStatus(
    id: string,
    dto: UpdateSlotStatusDto,
    requestingUser: AuthenticatedUser,
  ): Promise<ParkingSlotWithFloor> {
    const slot = await this.prisma.parkingSlot.findUnique({
      where: { id },
      include: { lot: { select: { managerId: true } } },
    });
    if (!slot) {
      throw new NotFoundException(`Parking slot ${id} not found`);
    }
    if (
      requestingUser.role === Role.MANAGER &&
      slot.lot.managerId !== requestingUser.userId
    ) {
      throw new ForbiddenException('You do not manage this parking lot');
    }
    if (
      slot.status === SlotStatus.RESERVED ||
      slot.status === SlotStatus.OCCUPIED
    ) {
      throw new ConflictException(
        'This slot is currently in use and cannot be restricted',
      );
    }

    return this.prisma.parkingSlot.update({
      where: { id },
      data: {
        status: dto.status,
        restrictedReason:
          dto.status === 'MAINTENANCE' ? (dto.reason ?? null) : null,
      },
      include: SLOT_WITH_FLOOR_INCLUDE,
    });
  }

  /**
   * Restricting slots one at a time doesn't scale for a real construction closure spanning
   * dozens of slots — this applies one status + reason to a whole selection in a single
   * query, after validating every slot up front (all-or-nothing, same as the single-slot path).
   */
  async bulkUpdateStatus(
    dto: BulkUpdateSlotStatusDto,
    requestingUser: AuthenticatedUser,
  ): Promise<{ updatedCount: number }> {
    const slots = await this.prisma.parkingSlot.findMany({
      where: { id: { in: dto.slotIds } },
      include: { lot: { select: { managerId: true } } },
    });
    if (slots.length !== dto.slotIds.length) {
      throw new NotFoundException('One or more slots were not found');
    }
    if (requestingUser.role === Role.MANAGER) {
      const unowned = slots.find(
        (s) => s.lot.managerId !== requestingUser.userId,
      );
      if (unowned) {
        throw new ForbiddenException(
          'You do not manage one or more of these parking lots',
        );
      }
    }
    const inUse = slots.find(
      (s) =>
        s.status === SlotStatus.RESERVED || s.status === SlotStatus.OCCUPIED,
    );
    if (inUse) {
      throw new ConflictException(
        `Slot ${inUse.slotNumber} is currently in use and cannot be restricted`,
      );
    }

    const result = await this.prisma.parkingSlot.updateMany({
      where: { id: { in: dto.slotIds } },
      data: {
        status: dto.status,
        restrictedReason:
          dto.status === 'MAINTENANCE' ? (dto.reason ?? null) : null,
      },
    });

    return { updatedCount: result.count };
  }
}
