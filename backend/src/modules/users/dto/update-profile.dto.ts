import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jane', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lastName?: string;

  @ApiPropertyOptional({ example: 'jane.doe@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}
