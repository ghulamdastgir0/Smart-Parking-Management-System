import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ResumeChatDto {
  @ApiProperty({ description: 'Whether the user approved the proposed action' })
  @IsBoolean()
  approved!: boolean;
}
