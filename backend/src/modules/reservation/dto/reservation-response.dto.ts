import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, ReservationStatus } from '@prisma/client';

export class ReservationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  lotId!: string;

  @ApiProperty()
  slotId!: string;

  @ApiProperty()
  startTime!: Date;

  @ApiProperty()
  endTime!: Date;

  @ApiProperty()
  totalPrice!: string;

  @ApiProperty({ enum: ReservationStatus })
  status!: ReservationStatus;

  @ApiPropertyOptional()
  checkedInAt?: Date | null;

  @ApiPropertyOptional()
  checkedOutAt?: Date | null;
}

export class PaymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;
}

export class CreateReservationResponseDto {
  @ApiProperty({ type: ReservationResponseDto })
  reservation!: ReservationResponseDto;

  @ApiProperty({
    type: PaymentResponseDto,
    description:
      'Hand this payment id to the dummy payment flow, then call payment/confirm or payment/fail',
  })
  payment!: PaymentResponseDto;
}

export class ConfirmPaymentResponseDto {
  @ApiProperty({ type: ReservationResponseDto })
  reservation!: ReservationResponseDto;

  @ApiProperty({
    description:
      'Single-use check-in QR token — present it at the parking entrance',
  })
  qrCodeToken!: string;

  @ApiProperty({
    description: 'Base64 PNG data URI rendering of the check-in QR code',
  })
  qrCodeImage!: string;
}
