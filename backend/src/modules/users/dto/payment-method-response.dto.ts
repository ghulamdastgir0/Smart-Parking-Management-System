import { ApiProperty } from '@nestjs/swagger';

export class PaymentMethodResponseDto {
  @ApiProperty()
  cardholderName!: string;

  @ApiProperty({ example: 'Visa' })
  brand!: string;

  @ApiProperty({ example: '4242' })
  last4!: string;

  @ApiProperty({ example: 12 })
  expiryMonth!: number;

  @ApiProperty({ example: 2030 })
  expiryYear!: number;
}
