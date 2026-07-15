import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Reservation } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateReservationDto } from './dto/create-reservation.dto';
import {
  ConfirmPaymentResponseDto,
  CreateReservationResponseDto,
} from './dto/reservation-response.dto';
import { ReservationService } from './reservation.service';

@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a reservation for a parking slot',
    description:
      'Atomically holds the slot (AVAILABLE → RESERVED) and creates a PENDING payment. ' +
      'Redirect the client to the dummy payment flow using the returned payment id next.',
  })
  @ApiResponse({
    status: 201,
    description: 'Reservation created, awaiting payment',
    type: CreateReservationResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Slot is no longer available' })
  create(@Body() dto: CreateReservationDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.reservationService.create(dto, user.userId);
  }

  @Get('mine')
  @ApiOperation({ summary: "List the authenticated user's reservations" })
  findMine(@Req() req: Request): Promise<Reservation[]> {
    const user = req.user as AuthenticatedUser;
    return this.reservationService.findMine(user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a reservation by id (owner, or Admin/Manager)',
  })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @ApiResponse({ status: 403, description: 'Not the reservation owner' })
  findOne(@Param('id') id: string, @Req() req: Request): Promise<Reservation> {
    const user = req.user as AuthenticatedUser;
    return this.reservationService.findOne(id, user);
  }

  @Post(':id/payment/confirm')
  @ApiOperation({
    summary: 'Dummy payment success callback',
    description:
      'Simulates a successful payment gateway callback: confirms the reservation and issues ' +
      'the single-use check-in QR code (the digital parking ticket).',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment confirmed; reservation is now CONFIRMED',
    type: ConfirmPaymentResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Reservation is not awaiting payment',
  })
  @ApiResponse({ status: 410, description: 'Reservation has expired' })
  confirmPayment(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.reservationService.confirmPayment(id, user.userId);
  }

  @Post(':id/payment/fail')
  @ApiOperation({
    summary: 'Dummy payment failure callback',
    description:
      'Simulates a failed payment: cancels the reservation and releases the slot.',
  })
  @ApiResponse({ status: 200, description: 'Reservation cancelled' })
  @ApiResponse({
    status: 409,
    description: 'Reservation is not awaiting payment',
  })
  failPayment(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<Reservation> {
    const user = req.user as AuthenticatedUser;
    return this.reservationService.failPayment(id, user.userId);
  }
}
