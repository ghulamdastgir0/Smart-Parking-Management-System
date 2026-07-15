import { Injectable, NotFoundException } from '@nestjs/common';
import { ParkingSlot } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FindSlotsDto } from './dto/find-slots.dto';

@Injectable()
export class ParkingSlotService {
  constructor(private readonly prisma: PrismaService) {}

  search(dto: FindSlotsDto): Promise<ParkingSlot[]> {
    return this.prisma.parkingSlot.findMany({
      where: { lotId: dto.lotId, status: dto.status },
      orderBy: { slotNumber: 'asc' },
    });
  }

  async findOne(id: string): Promise<ParkingSlot> {
    const slot = await this.prisma.parkingSlot.findUnique({ where: { id } });
    if (!slot) {
      throw new NotFoundException(`Parking slot ${id} not found`);
    }
    return slot;
  }
}
