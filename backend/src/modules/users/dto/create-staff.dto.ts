import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsPasswordComplex } from '../../../common/validators/password-complexity.validator';

// Public registration always creates a CUSTOMER — MANAGER and ADMIN accounts are the two
// roles an admin still provisions directly, so this deliberately excludes CUSTOMER.
export const STAFF_ROLES = [Role.MANAGER, Role.ADMIN] as const;

export class CreateStaffDto {
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

  @ApiProperty({ enum: STAFF_ROLES, example: Role.MANAGER })
  @IsIn(STAFF_ROLES)
  role!: (typeof STAFF_ROLES)[number];
}
