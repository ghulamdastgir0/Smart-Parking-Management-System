import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NearbyParkingLotDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  latitude!: number;

  @ApiProperty()
  longitude!: number;

  @ApiProperty({
    description:
      'Straight-line (Haversine) distance from the search origin, in kilometers',
  })
  distanceKm!: number;

  @ApiPropertyOptional({
    description:
      'Driving distance from the maps provider, in kilometers (null if the provider is unavailable)',
    nullable: true,
  })
  drivingDistanceKm!: number | null;

  @ApiPropertyOptional({
    description:
      'Estimated driving time from the maps provider, in minutes (null if the provider is unavailable)',
    nullable: true,
  })
  etaMinutes!: number | null;
}
