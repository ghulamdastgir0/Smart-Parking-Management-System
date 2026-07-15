import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({
    description: 'Parking slot to reserve — must currently be AVAILABLE',
  })
  @IsUUID()
  slotId!: string;

  @ApiPropertyOptional({
    description: 'Reservation start time (ISO 8601). Defaults to now.',
  })
  @IsOptional()
  @IsISO8601()
  startTime?: string;

  @ApiProperty({
    example: 120,
    description: 'Intended parking duration, in minutes (15 min – 7 days)',
  })
  @IsInt()
  @Min(15)
  @Max(10080)
  durationMinutes!: number;
}
