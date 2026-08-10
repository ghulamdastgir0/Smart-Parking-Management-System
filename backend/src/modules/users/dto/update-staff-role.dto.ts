import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsIn } from 'class-validator';
import { STAFF_ROLES } from './create-staff.dto';

export class UpdateStaffRoleDto {
  @ApiProperty({ enum: STAFF_ROLES, example: Role.ADMIN })
  @IsIn(STAFF_ROLES)
  role!: (typeof STAFF_ROLES)[number];
}
