import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { RESTRICTABLE_STATUSES } from './update-slot-status.dto';
import type { RestrictableStatus } from './update-slot-status.dto';

export class BulkUpdateSlotStatusDto {
  @ApiProperty({ type: [String] })
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  slotIds!: string[];

  @ApiProperty({ enum: RESTRICTABLE_STATUSES, example: 'MAINTENANCE' })
  @IsIn(RESTRICTABLE_STATUSES)
  status!: RestrictableStatus;

  @ApiPropertyOptional({
    example: 'Under construction until further notice',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
