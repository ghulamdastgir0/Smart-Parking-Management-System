import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CheckpointService } from './checkpoint.service';
import {
  CheckInResponseDto,
  CheckOutResponseDto,
} from './dto/checkpoint-response.dto';
import { ScanQrDto } from './dto/scan-qr.dto';

@ApiTags('Checkpoint')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
@Controller('checkpoint')
export class CheckpointController {
  constructor(private readonly checkpointService: CheckpointService) {}

  @Post('check-in')
  @ApiOperation({
    summary: 'Scan a Booking (check-in) QR code at the parking entrance',
  })
  @ApiResponse({
    status: 200,
    description:
      'Checked in: slot is now OCCUPIED, the booking QR is invalidated, and a new checkout QR is issued',
    type: CheckInResponseDto,
  })
  @ApiResponse({ status: 404, description: 'QR code not recognized' })
  @ApiResponse({
    status: 409,
    description: 'Reservation is not confirmed for check-in',
  })
  @ApiResponse({
    status: 410,
    description: 'QR code already used, invalidated, or expired',
  })
  checkIn(@Body() dto: ScanQrDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.checkpointService.checkIn(dto.token, user.userId);
  }

  @Post('check-out')
  @ApiOperation({
    summary: 'Scan a Checkout QR code as the user leaves the facility',
    description:
      'Computes the final charge (base + extension/overtime challans) and creates a PENDING ' +
      'payment. The reservation moves to PENDING_PAYMENT and the QR stays valid — nothing is ' +
      'released until the dummy checkout payment is confirmed via the Reservations endpoints.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Checkout initiated: final charge computed, payment created and awaiting confirmation',
    type: CheckOutResponseDto,
  })
  @ApiResponse({ status: 404, description: 'QR code not recognized' })
  @ApiResponse({
    status: 409,
    description:
      'Reservation is not checked in/overtime, or checkout was already initiated',
  })
  @ApiResponse({
    status: 410,
    description: 'QR code already used, invalidated, or expired',
  })
  checkOut(@Body() dto: ScanQrDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.checkpointService.checkOut(dto.token, user.userId);
  }
}
