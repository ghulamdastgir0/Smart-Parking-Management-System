import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Notification } from '@prisma/client';
import type { Request } from 'express';
import { NotificationService } from '../../common/notification/notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { NotificationResponseDto } from './dto/notification-response.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('mine')
  @ApiOperation({
    summary:
      "List the authenticated user's notifications (customer inbox or manager alerts)",
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications, newest first',
    type: [NotificationResponseDto],
  })
  findMine(@Req() req: Request): Promise<Notification[]> {
    const user = req.user as AuthenticatedUser;
    return this.notificationService.findMine(user.userId);
  }
}
