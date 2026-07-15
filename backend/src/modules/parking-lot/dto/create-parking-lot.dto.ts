import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export const MAX_ROWS = 200;
export const MAX_COLUMNS = 500;
export const MAX_TOTAL_SLOTS = 5000;

export class CreateParkingLotDto {
  @ApiProperty({ example: 'Downtown Bus Station Parking' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '123 Main St, Springfield' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: 37.7749 })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: -122.4194 })
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({
    description:
      'Manager to assign as the owner of this lot. Admin only — defaults to the authenticated manager.',
  })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiProperty({
    example: 10,
    description: `Number of row bands (A, B, C, ...). Max ${MAX_ROWS}.`,
  })
  @IsInt()
  @Min(1)
  @Max(MAX_ROWS)
  rows!: number;

  @ApiProperty({
    example: 100,
    description: `Slots per row (1..columns). Max ${MAX_COLUMNS}.`,
  })
  @IsInt()
  @Min(1)
  @Max(MAX_COLUMNS)
  columns!: number;

  @ApiProperty({
    example: 2.5,
    description: 'Base price applied to every auto-generated slot in this lot.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  defaultSlotPrice!: number;
}
