import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SlotStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class FindSlotsDto {
  @ApiProperty({ description: 'Parking lot to search within' })
  @IsUUID()
  lotId!: string;

  @ApiPropertyOptional({ description: 'Restrict the search to a single floor' })
  @IsOptional()
  @IsUUID()
  floorId?: string;

  @ApiPropertyOptional({
    enum: SlotStatus,
    description:
      'Filter by slot status. Defaults to AVAILABLE when arrivalTime/durationMinutes ' +
      "are not given; otherwise defaults to every status (each slot's real availability " +
      'for that window is reported via availableForWindow instead).',
  })
  @IsOptional()
  @IsEnum(SlotStatus)
  status?: SlotStatus;

  @ApiPropertyOptional({
    description:
      'Desired arrival time (ISO 8601). When given together with durationMinutes, each ' +
      'returned slot is annotated with availableForWindow — whether it is actually free ' +
      'for that specific window, rather than just its current status.',
  })
  @IsOptional()
  @IsISO8601()
  arrivalTime?: string;

  @ApiPropertyOptional({
    example: 120,
    description:
      'Desired parking duration in minutes, paired with arrivalTime.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(10080)
  durationMinutes?: number;
}
