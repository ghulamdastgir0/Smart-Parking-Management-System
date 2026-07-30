import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { BulkUpdateSlotStatusDto } from './dto/bulk-update-slot-status.dto';
import { FindSlotsDto } from './dto/find-slots.dto';
import { ParkingSlotResponseDto } from './dto/parking-slot-response.dto';
import { UpdateSlotStatusDto } from './dto/update-slot-status.dto';
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
    description:
      'Defaults to AVAILABLE (ignored when arrivalTime/durationMinutes are given)',
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

  // Registered before @Patch(':id') — Nest/Express matches routes in declaration order for
  // the same HTTP method, and ':id' would otherwise swallow "bulk-status" as a literal id.
  @Patch('bulk-status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary:
      'Restrict or unrestrict multiple slots at once (Admin/Manager only)',
    description:
      'Applies one status + optional reason to a whole selection in a single request — ' +
      'validates every slot up front and fails the whole batch if any is in use or not ' +
      'manager-owned, rather than partially applying.',
  })
  @ApiResponse({ status: 200, description: 'Slots updated' })
  @ApiResponse({
    status: 403,
    description: 'Manager does not manage one of these lots',
  })
  @ApiResponse({ status: 404, description: 'One or more slots were not found' })
  @ApiResponse({
    status: 409,
    description: 'One or more slots are currently in use',
  })
  bulkUpdateStatus(
    @Body() dto: BulkUpdateSlotStatusDto,
    @Req() req: Request,
  ): Promise<{ updatedCount: number }> {
    const user = req.user as AuthenticatedUser;
    return this.parkingSlotService.bulkUpdateStatus(dto, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Restrict or unrestrict a slot (Admin/Manager only)',
    description:
      'Toggles a slot between AVAILABLE and MAINTENANCE (e.g. for construction), with an ' +
      'optional reason. Managers may only update slots in lots they manage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Slot updated',
    type: ParkingSlotResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Manager does not manage this lot' })
  @ApiResponse({ status: 404, description: 'Parking slot not found' })
  @ApiResponse({ status: 409, description: 'Slot is currently in use' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSlotStatusDto,
    @Req() req: Request,
  ): Promise<ParkingSlotWithFloor> {
    const user = req.user as AuthenticatedUser;
    return this.parkingSlotService.updateStatus(id, dto, user);
  }
}
