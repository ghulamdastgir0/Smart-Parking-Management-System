import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ParkingSlotController } from './parking-slot.controller';
import { ParkingSlotService } from './parking-slot.service';

@Module({
  imports: [AuthModule],
  controllers: [ParkingSlotController],
  providers: [ParkingSlotService],
  exports: [ParkingSlotService],
})
export class ParkingSlotModule {}
