import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class FindReservationsDto {
  @ApiProperty({ description: 'Parking lot to list reservations for' })
  @IsUUID()
  lotId!: string;
}
