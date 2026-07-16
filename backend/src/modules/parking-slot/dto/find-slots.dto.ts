import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SlotStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

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
    default: SlotStatus.AVAILABLE,
    description:
      'Filter by slot status. Defaults to AVAILABLE (the customer search use case).',
  })
  @IsOptional()
  @IsEnum(SlotStatus)
  status?: SlotStatus = SlotStatus.AVAILABLE;
}
