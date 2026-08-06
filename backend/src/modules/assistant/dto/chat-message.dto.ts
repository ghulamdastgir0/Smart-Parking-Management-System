import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// Node's own IANA tz database — no need for a separate package.
const VALID_TIMEZONES = Intl.supportedValuesOf('timeZone');

export class ChatMessageDto {
  @ApiProperty({ example: 'Find parking near me for tomorrow at 5pm' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({
    example: 'Asia/Karachi',
    description:
      "IANA timezone the user's device is in (e.g. `Intl.DateTimeFormat().resolvedOptions().timeZone`) — " +
      'lets Adam convert clock times the user mentions ("8pm") into the correct UTC instant instead of assuming UTC.',
  })
  @IsOptional()
  @IsString()
  @IsIn(VALID_TIMEZONES)
  timezone?: string;

  @ApiPropertyOptional({
    example: 31.5204,
    description:
      "User's current browser geolocation (if granted) — lets Adam answer \"find parking near me\" " +
      'style requests directly via find_nearby_parking_lots instead of asking the user to share coordinates.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 74.3587 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;
}
