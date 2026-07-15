import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationController } from './notification.controller';

@Module({
  imports: [AuthModule],
  controllers: [NotificationController],
})
export class NotificationHttpModule {}
