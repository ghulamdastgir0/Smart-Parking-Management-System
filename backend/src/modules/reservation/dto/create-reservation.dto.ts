import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsUUID, Max, Min } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ description: 'Parking slot to reserve' })
  @IsUUID()
  slotId!: string;

  @ApiProperty({ description: 'Arrival date and time (ISO 8601)' })
  @IsISO8601()
  arrivalTime!: string;

  @ApiProperty({
    example: 120,
    description: 'Expected parking duration, in minutes (15 min – 7 days)',
  })
  @IsInt()
  @Min(15)
  @Max(10080)
  durationMinutes!: number;
}
