import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingService } from './billing.service';
import { ReservationController } from './reservation.controller';
import { ReservationMonitoringService } from './reservation-monitoring.service';
import { ReservationService } from './reservation.service';

@Module({
  imports: [AuthModule],
  controllers: [ReservationController],
  providers: [ReservationService, ReservationMonitoringService, BillingService],
  exports: [ReservationService, BillingService],
})
export class ReservationModule {}
