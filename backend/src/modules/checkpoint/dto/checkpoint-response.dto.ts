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
      'Result of charging the customer\'s saved payment method for the final amount ' +
      '(base charge + extension/overtime challans).',
  })
  payment!: PaymentResponseDto;

  @ApiProperty({ type: [ChallanResponseDto] })
  challans!: ChallanResponseDto[];

  @ApiProperty({
    description:
      'True if the dummy charge was declined — the reservation stays CHECKED_IN and this ' +
      'same QR code can be rescanned to retry.',
  })
  paymentFailed!: boolean;

  @ApiProperty({ description: 'Human-readable outcome for staff to read out' })
  message!: string;
}
