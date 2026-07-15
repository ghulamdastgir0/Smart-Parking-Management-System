import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LocationService } from './location.service';
import { MapsService } from './maps.service';
import { ParkingLotController } from './parking-lot.controller';
import { ParkingLotService } from './parking-lot.service';

@Module({
  imports: [HttpModule, AuthModule],
  controllers: [ParkingLotController],
  providers: [ParkingLotService, LocationService, MapsService],
  exports: [ParkingLotService, LocationService, MapsService],
})
export class ParkingLotModule {}
