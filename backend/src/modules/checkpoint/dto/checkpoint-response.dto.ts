import { ApiProperty } from '@nestjs/swagger';
import {
  ChallanResponseDto,
  PaymentResponseDto,
  ReservationResponseDto,
} from '../../reservation/dto/reservation-response.dto';

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

  @ApiProperty({
    type: PaymentResponseDto,
    description:
      'Final amount due (base charge + extension/overtime challans). Present the dummy payment screen next.',
  })
  payment!: PaymentResponseDto;

  @ApiProperty({ type: [ChallanResponseDto] })
  challans!: ChallanResponseDto[];
}
