import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './common/audit/audit.module';
import { NotificationModule } from './common/notification/notification.module';
import { RealtimeModule } from './common/realtime/realtime.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { AuthModule } from './modules/auth/auth.module';
import { CheckpointModule } from './modules/checkpoint/checkpoint.module';
import { NotificationHttpModule } from './modules/notification/notification.module';
import { ParkingLotModule } from './modules/parking-lot/parking-lot.module';
import { ParkingSlotModule } from './modules/parking-slot/parking-slot.module';
import { PolicyModule } from './modules/policy/policy.module';
import { ReservationModule } from './modules/reservation/reservation.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuditModule,
    NotificationModule,
    RealtimeModule,
    AuthModule,
    UsersModule,
    ParkingLotModule,
    ParkingSlotModule,
    ReservationModule,
    CheckpointModule,
    NotificationHttpModule,
    PolicyModule,
    AssistantModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
