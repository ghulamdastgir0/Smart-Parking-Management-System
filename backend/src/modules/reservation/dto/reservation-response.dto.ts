import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChallanType, PaymentStatus, ReservationStatus } from '@prisma/client';

export class ReservationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  lotId!: string;

  @ApiProperty()
  slotId!: string;

  @ApiProperty({ description: 'Arrival time' })
  startTime!: Date;

  @ApiProperty({
    description:
      'Expected checkout time — pushed forward in place by auto-extensions',
  })
  endTime!: Date;

  @ApiProperty({
    description:
      'Estimated base charge (hourly rate × reserved hours), fixed at creation',
  })
  totalPrice!: string;

  @ApiProperty({ enum: ReservationStatus })
  status!: ReservationStatus;

  @ApiPropertyOptional()
  checkedInAt?: Date | null;

  @ApiPropertyOptional()
  checkedOutAt?: Date | null;
}

export class ChallanResponseDto {
  @ApiProperty({ enum: ChallanType })
  type!: ChallanType;

  @ApiProperty()
  amount!: string;

  @ApiPropertyOptional()
  reason?: string | null;

  @ApiProperty()
  createdAt!: Date;
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
    description:
      'Single-use check-in QR token — present it at the parking entrance',
  })
  qrCodeToken!: string;

  @ApiProperty({
    description: 'Base64 PNG data URI rendering of the check-in QR code',
  })
  qrCodeImage!: string;
}

export class CheckoutInitiatedResponseDto {
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

export class CheckoutPaymentConfirmedResponseDto {
  @ApiProperty({ type: ReservationResponseDto })
  reservation!: ReservationResponseDto;

  @ApiProperty({ type: PaymentResponseDto })
  payment!: PaymentResponseDto;
}
