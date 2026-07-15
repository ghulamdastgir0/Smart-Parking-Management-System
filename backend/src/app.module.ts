import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './common/audit/audit.module';
import { NotificationModule } from './common/notification/notification.module';
import { AuthModule } from './modules/auth/auth.module';
import { CheckpointModule } from './modules/checkpoint/checkpoint.module';
import { NotificationHttpModule } from './modules/notification/notification.module';
import { ParkingLotModule } from './modules/parking-lot/parking-lot.module';
import { ParkingSlotModule } from './modules/parking-slot/parking-slot.module';
import { ReservationModule } from './modules/reservation/reservation.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    NotificationModule,
    AuthModule,
    ParkingLotModule,
    ParkingSlotModule,
    ReservationModule,
    CheckpointModule,
    NotificationHttpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
