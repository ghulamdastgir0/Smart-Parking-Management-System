import { ApiProperty } from '@nestjs/swagger';

export class ParkingFloorResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  lotId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  floorNumber!: number;

  @ApiProperty()
  rows!: number;

  @ApiProperty()
  columns!: number;

  @ApiProperty({ description: 'rows × columns' })
  totalSlots!: number;

  @ApiProperty({
    description: 'Count of currently AVAILABLE slots on this floor',
  })
  availableSlots!: number;
}
