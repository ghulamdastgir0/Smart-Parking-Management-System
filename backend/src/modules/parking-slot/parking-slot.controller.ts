import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FindSlotsDto } from './dto/find-slots.dto';
import { ParkingSlotResponseDto } from './dto/parking-slot-response.dto';
import {
  ParkingSlotSearchResult,
  ParkingSlotService,
  ParkingSlotWithFloor,
} from './parking-slot.service';

@ApiTags('Parking Slots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('parking-slots')
export class ParkingSlotController {
  constructor(private readonly parkingSlotService: ParkingSlotService) {}

  @Get()
  @ApiOperation({
    summary:
      'Search parking slots within a lot (e.g. to find AVAILABLE ones before booking)',
  })
  @ApiQuery({
    name: 'lotId',
    required: true,
    description: 'Parking lot to search within',
  })
  @ApiQuery({
    name: 'floorId',
    required: false,
    description: 'Restrict the search to a single floor',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Defaults to AVAILABLE (ignored when arrivalTime/durationMinutes are given)',
  })
  @ApiQuery({
    name: 'arrivalTime',
    required: false,
    description: 'Desired arrival time (ISO 8601) — pair with durationMinutes',
  })
  @ApiQuery({
    name: 'durationMinutes',
    required: false,
    description: 'Desired parking duration in minutes — pair with arrivalTime',
  })
  @ApiResponse({
    status: 200,
    description: 'Matching parking slots',
    type: [ParkingSlotResponseDto],
  })
  search(@Query() dto: FindSlotsDto): Promise<ParkingSlotSearchResult[]> {
    return this.parkingSlotService.search(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single parking slot by id' })
  @ApiResponse({
    status: 200,
    description: 'Parking slot found',
    type: ParkingSlotResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Parking slot not found' })
  findOne(@Param('id') id: string): Promise<ParkingSlotWithFloor> {
    return this.parkingSlotService.findOne(id);
  }
}
