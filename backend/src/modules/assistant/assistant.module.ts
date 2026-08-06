import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CheckpointModule } from '../checkpoint/checkpoint.module';
import { ParkingLotModule } from '../parking-lot/parking-lot.module';
import { ParkingSlotModule } from '../parking-slot/parking-slot.module';
import { PolicyModule } from '../policy/policy.module';
import { ReservationModule } from '../reservation/reservation.module';
import { UsersModule } from '../users/users.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { ToolRegistry } from './tool-registry';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    ParkingLotModule,
    ParkingSlotModule,
    ReservationModule,
    CheckpointModule,
    PolicyModule,
  ],
  controllers: [AssistantController],
  providers: [AssistantService, ToolRegistry],
})
export class AssistantModule {}
