import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_COLUMNS, MAX_ROWS } from './create-parking-lot.dto';

export class UpdateParkingFloorDto {
  @ApiPropertyOptional({ example: 'Ground Floor', maxLength: 50 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Display/sort order; unique within the lot.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  floorNumber?: number;

  @ApiPropertyOptional({
    example: 12,
    description:
      `Number of row bands (A, B, C, ...) on this floor. Max ${MAX_ROWS}. Growing adds new ` +
      'slots; shrinking removes the slots that fall outside the new grid, and fails if any ' +
      'of them has an existing reservation. Requires defaultSlotPrice when it results in new slots.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_ROWS)
  rows?: number;

  @ApiPropertyOptional({
    example: 120,
    description: `Slots per row on this floor. Max ${MAX_COLUMNS}. Same grow/shrink rules as rows.`,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_COLUMNS)
  columns?: number;

  @ApiPropertyOptional({
    example: 3,
    description:
      'New base price applied to every existing slot on this floor, and to any slots ' +
      'created by growing rows/columns in the same request.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  defaultSlotPrice?: number;
}
