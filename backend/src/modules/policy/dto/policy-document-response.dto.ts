import { ApiProperty } from '@nestjs/swagger';

export class PolicyDocumentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  filename!: string;

  @ApiProperty()
  chunkCount!: number;

  @ApiProperty()
  createdAt!: Date;
}
