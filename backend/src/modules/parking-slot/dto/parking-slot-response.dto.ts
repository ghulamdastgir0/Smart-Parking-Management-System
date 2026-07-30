import { ApiProperty } from '@nestjs/swagger';
import { SlotStatus, SlotType } from '@prisma/client';

export class SlotFloorSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  floorNumber!: number;
}

export class ParkingSlotResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  lotId!: string;

  @ApiProperty()
  floorId!: string;

  @ApiProperty({ type: SlotFloorSummaryDto })
  floor!: SlotFloorSummaryDto;

  @ApiProperty({ example: 'A1' })
  slotNumber!: string;

  @ApiProperty({ enum: SlotType })
  type!: SlotType;

  @ApiProperty({ enum: SlotStatus })
  status!: SlotStatus;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Set when status is MAINTENANCE, cleared when back to AVAILABLE.',
  })
  restrictedReason?: string | null;

  @ApiProperty()
  basePrice!: string;

  @ApiProperty({
    required: false,
    description:
      'Whether this slot is actually free for the requested arrivalTime/durationMinutes ' +
      'window. Only present when both were given in the search request — otherwise the ' +
      'plain status field is the only signal.',
  })
  availableForWindow?: boolean;
}
