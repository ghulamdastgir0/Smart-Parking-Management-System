import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UploadPolicyDto {
  @ApiProperty({ example: 'Cancellation Policy' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;
}
