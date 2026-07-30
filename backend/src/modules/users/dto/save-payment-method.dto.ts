import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsLuhnValid } from '../../../common/validators/luhn.validator';

export class SavePaymentMethodDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  cardholderName!: string;

  @ApiProperty({
    example: '4242424242424242',
    description:
      'Used only to derive the brand and last 4 digits — the full number is never stored.',
  })
  @IsString()
  @Matches(/^\d{13,19}$/, { message: 'Card number must be 13-19 digits' })
  @IsLuhnValid()
  cardNumber!: string;

  @ApiProperty({ example: 12, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth!: number;

  @ApiProperty({ example: 2030 })
  @IsInt()
  @Min(new Date().getFullYear())
  @Max(new Date().getFullYear() + 20)
  expiryYear!: number;
}
