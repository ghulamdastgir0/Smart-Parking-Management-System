import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationRecipientRole } from '@prisma/client';

export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: NotificationRecipientRole })
  recipientRole!: NotificationRecipientRole;

  @ApiPropertyOptional()
  reservationId?: string | null;

  @ApiProperty({ example: 'CHECKOUT_REMINDER_15MIN' })
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  isRead!: boolean;

  @ApiProperty()
  createdAt!: Date;
}
