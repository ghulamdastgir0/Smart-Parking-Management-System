import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty()
  isBlocked!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({
    description: 'Whether this user has a saved payment method on file',
  })
  hasPaymentMethod!: boolean;
}
