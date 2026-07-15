import { ApiProperty } from '@nestjs/swagger';
import { ReservationResponseDto } from '../../reservation/dto/reservation-response.dto';

export class CheckInResponseDto {
  @ApiProperty({ type: ReservationResponseDto })
  reservation!: ReservationResponseDto;

  @ApiProperty({ description: 'Newly issued single-use check-out QR token' })
  checkoutQrToken!: string;

  @ApiProperty({
    description: 'Base64 PNG data URI rendering of the check-out QR code',
  })
  checkoutQrCodeImage!: string;
}

export class CheckOutResponseDto {
  @ApiProperty({ type: ReservationResponseDto })
  reservation!: ReservationResponseDto;
}
