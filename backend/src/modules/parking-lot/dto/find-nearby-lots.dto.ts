import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsPositive,
  Max,
} from 'class-validator';

export class FindNearbyLotsDto {
  @ApiProperty({
    example: 37.7749,
    description: 'Latitude of the search origin (-90 to 90)',
  })
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @ApiProperty({
    example: -122.4194,
    description: 'Longitude of the search origin (-180 to 180)',
  })
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Search radius in kilometers',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(500)
  radiusKm?: number = 10;
}
