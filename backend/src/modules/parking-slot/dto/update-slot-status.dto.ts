import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

// Staff may only toggle between these two — RESERVED/OCCUPIED are system-managed and can't
// be set directly.
export const RESTRICTABLE_STATUSES = ['AVAILABLE', 'MAINTENANCE'] as const;
export type RestrictableStatus = (typeof RESTRICTABLE_STATUSES)[number];

export class UpdateSlotStatusDto {
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
