import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsPasswordComplex } from '../../../common/validators/password-complexity.validator';

export class CreateUserDto {
  @ApiProperty({ example: 'jane.manager@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'StrongPassword123!', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @IsPasswordComplex()
  password!: string;

  @ApiProperty({ example: 'Jane', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  firstName!: string;

  @ApiProperty({ example: 'Doe', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  lastName!: string;

  @ApiProperty({ enum: Role, example: Role.MANAGER })
  @IsEnum(Role)
  role!: Role;
}
