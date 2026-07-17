import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ReservationStatus, SlotStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_CHECKOUT_BUFFER_MINUTES } from '../reservation/reservation.service';
import { FindSlotsDto } from './dto/find-slots.dto';

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
        status: { notIn: [ReservationStatus.CANCELLED, ReservationStatus.COMPLETED] },
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
}
