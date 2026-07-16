import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ParkingLot, Role } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { FindNearbyLotsDto } from './dto/find-nearby-lots.dto';
import { NearbyParkingLotDto } from './dto/nearby-parking-lot.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import {
  ParkingLotService,
  ParkingLotWithAvailability,
} from './parking-lot.service';

@ApiTags('Parking Lots')
@Controller('parking-lots')
export class ParkingLotController {
  constructor(private readonly parkingLotService: ParkingLotService) {}

  @Get('nearby')
  @ApiOperation({
    summary: 'Find parking lots within a radius of a coordinate',
    description:
      'Ranks results by straight-line (Haversine) distance and enriches each with driving ' +
      'distance/ETA from the maps provider where available.',
  })
  @ApiQuery({
    name: 'latitude',
    type: Number,
    required: true,
    example: 37.7749,
    description: 'Latitude of the search origin (-90 to 90)',
  })
  @ApiQuery({
    name: 'longitude',
    type: Number,
    required: true,
    example: -122.4194,
    description: 'Longitude of the search origin (-180 to 180)',
  })
  @ApiQuery({
    name: 'radiusKm',
    type: Number,
    required: false,
    example: 10,
    description: 'Search radius in kilometers (default 10, max 500)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Nearby parking lots, sorted by closest straight-line distance',
    type: [NearbyParkingLotDto],
  })
  findNearby(@Query() dto: FindNearbyLotsDto): Promise<NearbyParkingLotDto[]> {
    return this.parkingLotService.findNearby(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all parking lots' })
  @ApiResponse({ status: 200, description: 'List of parking lots' })
  findAll(): Promise<ParkingLotWithAvailability[]> {
    return this.parkingLotService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single parking lot by id' })
  @ApiResponse({ status: 200, description: 'Parking lot found' })
  @ApiResponse({ status: 404, description: 'Parking lot not found' })
  findOne(@Param('id') id: string): Promise<ParkingLotWithAvailability> {
    return this.parkingLotService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a parking lot (Admin/Manager only)' })
  @ApiResponse({ status: 201, description: 'Parking lot created' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  create(
    @Body() dto: CreateParkingLotDto,
    @Req() req: Request,
  ): Promise<ParkingLot> {
    const user = req.user as AuthenticatedUser;
    return this.parkingLotService.create(dto, user.userId, user.userId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update a parking lot (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Parking lot updated' })
  @ApiResponse({ status: 404, description: 'Parking lot not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateParkingLotDto,
  ): Promise<ParkingLot> {
    return this.parkingLotService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a parking lot (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Parking lot deleted' })
  @ApiResponse({ status: 404, description: 'Parking lot not found' })
  remove(@Param('id') id: string): Promise<ParkingLot> {
    return this.parkingLotService.remove(id);
  }
}
