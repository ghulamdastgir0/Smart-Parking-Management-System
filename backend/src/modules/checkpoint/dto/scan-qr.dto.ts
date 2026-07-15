import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ScanQrDto {
  @ApiProperty({ description: 'The token encoded in the scanned QR code' })
  @IsUUID()
  token!: string;
}
