import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FindSlotsDto } from './dto/find-slots.dto';

const SLOT_WITH_FLOOR_INCLUDE = {
  floor: { select: { id: true, name: true, floorNumber: true } },
} satisfies Prisma.ParkingSlotInclude;

export type ParkingSlotWithFloor = Prisma.ParkingSlotGetPayload<{
  include: typeof SLOT_WITH_FLOOR_INCLUDE;
}>;

@Injectable()
export class ParkingSlotService {
  constructor(private readonly prisma: PrismaService) {}

  search(dto: FindSlotsDto): Promise<ParkingSlotWithFloor[]> {
    return this.prisma.parkingSlot.findMany({
      where: { lotId: dto.lotId, floorId: dto.floorId, status: dto.status },
      orderBy: { slotNumber: 'asc' },
      include: SLOT_WITH_FLOOR_INCLUDE,
    });
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
