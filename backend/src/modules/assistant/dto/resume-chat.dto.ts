import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
} from 'class-validator';

// Node's own IANA tz database — no need for a separate package.
const VALID_TIMEZONES = Intl.supportedValuesOf('timeZone');

// Answers whichever interrupt is currently pending for this thread — a mutating tool's
// approve/decline (`approved`), or a get_user_location request (`latitude`/`longitude`, omitted
// entirely if the user declined or it was unavailable). Only one interrupt is ever pending at a
// time, so which fields are set is enough to tell the two apart server-side.
export class ResumeChatDto {
  @ApiPropertyOptional({
    description: 'Whether the user approved a proposed mutating action',
  })
  @IsOptional()
  @IsBoolean()
  approved?: boolean;

  @ApiPropertyOptional({
    example: 31.5204,
    description:
      "User's latitude, answering a pending get_user_location request",
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

  @ApiPropertyOptional({
    example: 'Asia/Karachi',
    description:
      "User's IANA timezone, resent here since resuming rebuilds the agent's system prompt from " +
      "scratch — without it, the prompt would fall back to 'timezone unknown' partway through a " +
      'turn that already established it, right after the original chat message provided it.',
  })
  @IsOptional()
  @IsString()
  @IsIn(VALID_TIMEZONES)
  timezone?: string;
}
