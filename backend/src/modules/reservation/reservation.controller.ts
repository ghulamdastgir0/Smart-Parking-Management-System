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
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateReservationDto } from './dto/create-reservation.dto';
import {
  CheckoutPaymentConfirmedResponseDto,
  CreateReservationResponseDto,
} from './dto/reservation-response.dto';
import {
  ReservationService,
  ReservationWithDetails,
} from './reservation.service';

@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a time-slot reservation for a parking slot',
    description:
      'No payment is collected here. Validates the requested interval (arrival → arrival + ' +
      'duration + 30-minute grace buffer) does not overlap any other active reservation for ' +
      'the slot, then confirms the reservation immediately and issues the single-use check-in ' +
      'QR code. Check in within the check-in grace window or the reservation auto-cancels.',
  })
  @ApiResponse({
    status: 201,
    description: 'Reservation confirmed',
    type: CreateReservationResponseDto,
  })
  @ApiResponse({
    status: 409,
    description:
      'Requested interval overlaps another reservation for this slot',
  })
  create(@Body() dto: CreateReservationDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.reservationService.create(dto, user.userId);
  }

  @Get('mine')
  @ApiOperation({ summary: "List the authenticated user's reservations" })
  findMine(@Req() req: Request): Promise<ReservationWithDetails[]> {
    const user = req.user as AuthenticatedUser;
    return this.reservationService.findMine(user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a reservation by id (owner, or Admin/Manager)',
  })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @ApiResponse({ status: 403, description: 'Not the reservation owner' })
  findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ReservationWithDetails> {
    const user = req.user as AuthenticatedUser;
    return this.reservationService.findOne(id, user);
  }

  @Post(':id/checkout-payment/confirm')
  @ApiOperation({
    summary: 'Dummy checkout payment success callback',
    description:
      'Simulates a successful payment gateway callback for the final parking charge computed ' +
      'at checkout: marks the booking COMPLETED, the payment SUCCESSFUL, invalidates the ' +
      'checkout QR, and releases the slot.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment confirmed; booking is now COMPLETED',
    type: CheckoutPaymentConfirmedResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Reservation is not awaiting checkout payment',
  })
  confirmCheckoutPayment(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.reservationService.confirmCheckoutPayment(id, user.userId);
  }

  @Post(':id/checkout-payment/fail')
  @ApiOperation({
    summary: 'Dummy checkout payment failure callback',
    description:
      'Simulates a failed payment. The reservation stays PENDING_PAYMENT and the checkout QR ' +
      'stays valid so staff can retry — the vehicle has not left, so nothing is released.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment marked FAILED; retry available',
  })
  @ApiResponse({
    status: 409,
    description: 'Reservation is not awaiting checkout payment',
  })
  failCheckoutPayment(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.reservationService.failCheckoutPayment(id, user.userId);
  }
}
