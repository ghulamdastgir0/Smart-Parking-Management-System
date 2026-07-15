import { ApiProperty } from '@nestjs/swagger';
import { SlotStatus, SlotType } from '@prisma/client';

export class ParkingSlotResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  lotId!: string;

  @ApiProperty({ example: 'A1' })
  slotNumber!: string;

  @ApiProperty({ enum: SlotType })
  type!: SlotType;

  @ApiProperty({ enum: SlotStatus })
  status!: SlotStatus;

  @ApiProperty()
  basePrice!: string;
}
