import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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
}
