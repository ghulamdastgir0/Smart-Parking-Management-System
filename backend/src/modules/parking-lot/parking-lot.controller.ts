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
import { CreateParkingFloorDto } from './dto/create-parking-floor.dto';
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { FindNearbyLotsDto } from './dto/find-nearby-lots.dto';
import { NearbyParkingLotDto } from './dto/nearby-parking-lot.dto';
import { ParkingFloorResponseDto } from './dto/parking-floor-response.dto';
import { UpdateParkingFloorDto } from './dto/update-parking-floor.dto';
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all parking lots' })
  @ApiResponse({ status: 200, description: 'List of parking lots' })
  findAll(@Req() req: Request): Promise<ParkingLotWithAvailability[]> {
    const user = req.user as AuthenticatedUser;
    return this.parkingLotService.findAll(user);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single parking lot by id' })
  @ApiResponse({ status: 200, description: 'Parking lot found' })
  @ApiResponse({ status: 404, description: 'Parking lot not found' })
  findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ParkingLotWithAvailability> {
    const user = req.user as AuthenticatedUser;
    return this.parkingLotService.findOne(id, user);
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
  @ApiOperation({
    summary: 'Update a parking lot (Admin/Manager only)',
    description: 'Managers may only update lots they manage.',
  })
  @ApiResponse({ status: 200, description: 'Parking lot updated' })
  @ApiResponse({ status: 403, description: 'Manager does not own this lot' })
  @ApiResponse({ status: 404, description: 'Parking lot not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateParkingLotDto,
    @Req() req: Request,
  ): Promise<ParkingLot> {
    const user = req.user as AuthenticatedUser;
    return this.parkingLotService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Delete a parking lot (Admin/Manager only)',
    description: 'Managers may only delete lots they manage.',
  })
  @ApiResponse({ status: 200, description: 'Parking lot deleted' })
  @ApiResponse({ status: 403, description: 'Manager does not own this lot' })
  @ApiResponse({ status: 404, description: 'Parking lot not found' })
  remove(@Param('id') id: string, @Req() req: Request): Promise<ParkingLot> {
    const user = req.user as AuthenticatedUser;
    return this.parkingLotService.remove(id, user);
  }

  @Get(':lotId/floors')
  @ApiOperation({
    summary: 'List the floors of a parking lot, with capacity and availability',
  })
  @ApiResponse({
    status: 200,
    description: 'Floors for this lot',
    type: [ParkingFloorResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Parking lot not found' })
  findFloors(
    @Param('lotId') lotId: string,
  ): Promise<ParkingFloorResponseDto[]> {
    return this.parkingLotService.findFloors(lotId);
  }

  @Post(':lotId/floors')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary:
      'Add a floor (and its slot grid) to an existing parking lot (Admin/Manager only)',
    description:
      'Managers may only add floors to lots they manage. Each floor has its own ' +
      'rows/columns/defaultSlotPrice, since different floors commonly have different capacity.',
  })
  @ApiResponse({
    status: 201,
    description: 'Floor created',
    type: ParkingFloorResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Manager does not own this lot' })
  @ApiResponse({ status: 404, description: 'Parking lot not found' })
  @ApiResponse({
    status: 409,
    description: 'Floor number already exists for this lot',
  })
  createFloor(
    @Param('lotId') lotId: string,
    @Body() dto: CreateParkingFloorDto,
    @Req() req: Request,
  ): Promise<ParkingFloorResponseDto> {
    const user = req.user as AuthenticatedUser;
    return this.parkingLotService.createFloor(lotId, dto, user);
  }

  @Patch(':lotId/floors/:floorId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary:
      'Rename/renumber/resize a floor and/or reprice its slots (Admin/Manager only)',
    description:
      'Managers may only update floors on lots they manage. Growing rows/columns adds ' +
      'slots (defaultSlotPrice required); shrinking removes the slots that fall outside ' +
      'the new grid, and fails if any of them has an existing reservation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Floor updated',
    type: ParkingFloorResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Manager does not own this lot' })
  @ApiResponse({ status: 404, description: 'Parking lot or floor not found' })
  @ApiResponse({
    status: 409,
    description:
      'Floor number already exists for this lot, or shrinking would remove slots with existing reservations',
  })
  updateFloor(
    @Param('lotId') lotId: string,
    @Param('floorId') floorId: string,
    @Body() dto: UpdateParkingFloorDto,
    @Req() req: Request,
  ): Promise<ParkingFloorResponseDto> {
    const user = req.user as AuthenticatedUser;
    return this.parkingLotService.updateFloor(lotId, floorId, dto, user);
  }

  @Delete(':lotId/floors/:floorId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Delete a floor and its slots (Admin/Manager only)',
    description:
      'Managers may only delete floors on lots they manage. Blocked if any slot on the ' +
      'floor is tied to an existing reservation.',
  })
  @ApiResponse({ status: 200, description: 'Floor deleted' })
  @ApiResponse({ status: 403, description: 'Manager does not own this lot' })
  @ApiResponse({ status: 404, description: 'Parking lot or floor not found' })
  @ApiResponse({
    status: 409,
    description: 'Floor has slots tied to existing reservations',
  })
  removeFloor(
    @Param('lotId') lotId: string,
    @Param('floorId') floorId: string,
    @Req() req: Request,
  ): Promise<void> {
    const user = req.user as AuthenticatedUser;
    return this.parkingLotService.removeFloor(lotId, floorId, user);
  }
}
