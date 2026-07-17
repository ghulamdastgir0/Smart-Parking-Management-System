import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationRecipientRole,
  Payment,
  PaymentStatus,
  Prisma,
  QrCodeStatus,
  QrCodeType,
  Reservation,
  ReservationStatus,
  Role,
  SlotStatus,
} from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { NotificationService } from '../../common/notification/notification.service';
import { SlotUnavailableException } from '../../common/exceptions/slot-unavailable.exception';
import { toQrCodeImage } from '../../common/qr/qr.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { calculateBaseCharge } from './billing.util';
import { CreateReservationDto } from './dto/create-reservation.dto';

export const DEFAULT_CHECKIN_GRACE_MINUTES = 60;
export const DEFAULT_CHECKOUT_BUFFER_MINUTES = 30;
// 2 = today and tomorrow only.
export const DEFAULT_MAX_ADVANCE_DAYS = 2;

const RESERVATION_DETAIL_INCLUDE = {
  payment: true,
  qrCodes: true,
  challans: true,
  lot: true,
  slot: { include: { floor: true } },
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
} satisfies Prisma.ReservationInclude;

export type ReservationWithDetails = Prisma.ReservationGetPayload<{
  include: typeof RESERVATION_DETAIL_INCLUDE;
}>;

@Injectable()
export class ReservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    dto: CreateReservationDto,
    userId: string,
  ): Promise<{
    reservation: Reservation;
    qrCodeToken: string;
    qrCodeImage: string;
  }> {
    const arrivalTime = new Date(dto.arrivalTime);
    const now = new Date();
    if (arrivalTime.getTime() < now.getTime()) {
      throw new BadRequestException('Arrival time cannot be in the past');
    }

    const maxAdvanceDays = this.getMaxAdvanceDays();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const latestAllowedArrival = new Date(
      startOfToday.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000,
    );
    if (arrivalTime.getTime() >= latestAllowedArrival.getTime()) {
      throw new BadRequestException(
        maxAdvanceDays <= 1
          ? 'Reservations can only be made for today'
          : `Reservations can only be made for today or the next ${maxAdvanceDays - 1} day(s)`,
      );
    }

    const expectedCheckout = new Date(
      arrivalTime.getTime() + dto.durationMinutes * 60_000,
    );
    const bufferMs = this.getCheckoutBufferMinutes() * 60_000;
    const blockEnd = new Date(expectedCheckout.getTime() + bufferMs);

    return this.prisma.$transaction(async (tx) => {
      const slot = await tx.parkingSlot.findUnique({
        where: { id: dto.slotId },
      });
      if (!slot) {
        throw new NotFoundException(`Parking slot ${dto.slotId} not found`);
      }

      // Row-lock the slot so two concurrent reservation attempts for it serialize instead
      // of both passing the overlap check before either commits.
      await tx.$queryRaw`SELECT id FROM "ParkingSlot" WHERE id = ${dto.slotId} FOR UPDATE`;

      // Interval overlap (buffer-inclusive): A overlaps B iff A.start < B.end AND A.end > B.start.
      // "B.end" here is `existing.endTime + buffer`, rewritten as `existing.endTime >
      // arrivalTime - buffer` so it stays a plain column comparison.
      const overlapping = await tx.reservation.findFirst({
        where: {
          slotId: dto.slotId,
          status: {
            notIn: [ReservationStatus.CANCELLED, ReservationStatus.COMPLETED],
          },
          startTime: { lt: blockEnd },
          endTime: { gt: new Date(arrivalTime.getTime() - bufferMs) },
        },
      });
      if (overlapping) {
        throw new SlotUnavailableException(dto.slotId);
      }

      const totalPrice = calculateBaseCharge(
        Number(slot.basePrice),
        dto.durationMinutes,
      );

      const reservation = await tx.reservation.create({
        data: {
          userId,
          lotId: slot.lotId,
          slotId: slot.id,
          startTime: arrivalTime,
          endTime: expectedCheckout,
          totalPrice,
          status: ReservationStatus.CONFIRMED,
        },
      });

      // Denormalized cache for fast search only — the interval check above is what actually
      // prevents double-booking. Best-effort: a currently-OCCUPIED slot legitimately stays
      // OCCUPIED even though this later, non-overlapping reservation was just accepted.
      await tx.parkingSlot.updateMany({
        where: { id: dto.slotId, status: SlotStatus.AVAILABLE },
        data: { status: SlotStatus.RESERVED },
      });

      const qrCode = await tx.qrCode.create({
        data: {
          reservationId: reservation.id,
          type: QrCodeType.CHECK_IN,
          expiresAt: new Date(
            arrivalTime.getTime() + this.getCheckinGraceMinutes() * 60_000,
          ),
        },
      });

      await this.auditService.log(
        {
          entityType: 'Reservation',
          entityId: reservation.id,
          action: 'RESERVATION_CREATED',
          userId,
          metadata: {
            slotId: slot.id,
            arrivalTime,
            expectedCheckout,
            totalPrice,
          },
        },
        tx,
      );

      await this.notificationService.notify(
        {
          recipientId: userId,
          recipientRole: NotificationRecipientRole.USER,
          type: 'RESERVATION_CONFIRMED',
          title: 'Reservation confirmed',
          message:
            `Slot ${slot.slotNumber} is reserved from ${arrivalTime.toISOString()} to ${expectedCheckout.toISOString()}. ` +
            `Check in within ${this.getCheckinGraceMinutes()} minutes of your arrival time or this reservation will be cancelled.`,
          reservationId: reservation.id,
        },
        tx,
      );

      const qrCodeImage = await toQrCodeImage(qrCode.token);

      return { reservation, qrCodeToken: qrCode.token, qrCodeImage };
    });
  }

  findMine(userId: string): Promise<ReservationWithDetails[]> {
    return this.prisma.reservation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: RESERVATION_DETAIL_INCLUDE,
    });
  }

  async findOne(
    id: string,
    requestingUser: AuthenticatedUser,
  ): Promise<ReservationWithDetails> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: RESERVATION_DETAIL_INCLUDE,
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }

    const isStaff =
      requestingUser.role === Role.ADMIN ||
      requestingUser.role === Role.MANAGER;
    if (!isStaff && reservation.userId !== requestingUser.userId) {
      throw new ForbiddenException(
        'You do not have access to this reservation',
      );
    }

    return reservation;
  }

  /**
   * Staff-only: every reservation at a specific lot (not just the requesting staff
   * member's own bookings). Admins may query any lot; managers only lots they manage.
   */
  async findByLot(
    lotId: string,
    requestingUser: AuthenticatedUser,
  ): Promise<ReservationWithDetails[]> {
    const lot = await this.prisma.parkingLot.findUnique({
      where: { id: lotId },
    });
    if (!lot) {
      throw new NotFoundException(`Parking lot ${lotId} not found`);
    }
    if (
      requestingUser.role === Role.MANAGER &&
      lot.managerId !== requestingUser.userId
    ) {
      throw new ForbiddenException('You do not manage this parking lot');
    }

    return this.prisma.reservation.findMany({
      where: { lotId },
      orderBy: { createdAt: 'desc' },
      include: RESERVATION_DETAIL_INCLUDE,
    });
  }

  async confirmCheckoutPayment(
    reservationId: string,
    userId: string,
  ): Promise<{ reservation: Reservation; payment: Payment }> {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await this.loadOwnedReservation(
        tx,
        reservationId,
        userId,
      );
      if (reservation.status !== ReservationStatus.PENDING_PAYMENT) {
        throw new ConflictException(
          `Reservation is not awaiting checkout payment (current status: ${reservation.status})`,
        );
      }

      const payment = await tx.payment.update({
        where: { reservationId },
        data: { status: PaymentStatus.SUCCESSFUL, paidAt: new Date() },
      });

      const updatedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.COMPLETED },
      });

      await tx.qrCode.updateMany({
        where: {
          reservationId,
          type: QrCodeType.CHECK_OUT,
          status: QrCodeStatus.ACTIVE,
        },
        data: { status: QrCodeStatus.USED, usedAt: new Date() },
      });

      const slot = await tx.parkingSlot.update({
        where: { id: reservation.slotId },
        data: { status: SlotStatus.AVAILABLE },
      });

      await this.auditService.log(
        {
          entityType: 'Reservation',
          entityId: reservationId,
          action: 'CHECKOUT_PAYMENT_CONFIRMED',
          userId,
        },
        tx,
      );

      await this.notificationService.notify(
        {
          recipientId: userId,
          recipientRole: NotificationRecipientRole.USER,
          type: 'PAYMENT_COMPLETED',
          title: 'Payment successful',
          message: `Your payment of ${payment.amount.toString()} was successful.`,
          reservationId,
        },
        tx,
      );
      await this.notificationService.notify(
        {
          recipientId: userId,
          recipientRole: NotificationRecipientRole.USER,
          type: 'CHECKOUT_SUCCESS',
          title: 'Checkout complete',
          message:
            'You have successfully checked out. Thanks for parking with us!',
          reservationId,
        },
        tx,
      );

      const lot = await tx.parkingLot.findUnique({
        where: { id: reservation.lotId },
      });
      if (lot) {
        await this.notificationService.notify(
          {
            recipientId: lot.managerId,
            recipientRole: NotificationRecipientRole.MANAGER,
            type: 'CHECKOUT_COMPLETED',
            title: 'Vehicle checked out',
            message: `Slot ${slot.slotNumber} at ${lot.name} is now available again.`,
            reservationId,
          },
          tx,
        );
      }

      return { reservation: updatedReservation, payment };
    });
  }

  async failCheckoutPayment(
    reservationId: string,
    userId: string,
  ): Promise<Payment> {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await this.loadOwnedReservation(
        tx,
        reservationId,
        userId,
      );
      if (reservation.status !== ReservationStatus.PENDING_PAYMENT) {
        throw new ConflictException(
          `Reservation is not awaiting checkout payment (current status: ${reservation.status})`,
        );
      }

      const payment = await tx.payment.update({
        where: { reservationId },
        data: { status: PaymentStatus.FAILED },
      });

      await this.auditService.log(
        {
          entityType: 'Reservation',
          entityId: reservationId,
          action: 'CHECKOUT_PAYMENT_FAILED',
          userId,
        },
        tx,
      );

      // Deliberately leave the reservation in PENDING_PAYMENT and the slot/QR untouched —
      // the vehicle hasn't left, so staff just retries the dummy payment (mirrors how a
      // real gateway failure would be handled: retry, don't unwind the checkout).
      return payment;
    });
  }

  async cancel(
    reservationId: string,
    requestingUser: AuthenticatedUser,
  ): Promise<ReservationWithDetails> {
    return this.prisma.$transaction(async (tx) => {
      // Row-lock so this can't race the no-show monitoring cron cancelling the same
      // reservation at the same moment.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Reservation" WHERE id = ${reservationId} FOR UPDATE
      `;
      if (locked.length === 0) {
        throw new NotFoundException(`Reservation ${reservationId} not found`);
      }

      const reservation = await tx.reservation.findUniqueOrThrow({
        where: { id: reservationId },
      });

      const isStaff =
        requestingUser.role === Role.ADMIN ||
        requestingUser.role === Role.MANAGER;
      if (!isStaff && reservation.userId !== requestingUser.userId) {
        throw new ForbiddenException(
          'You do not have access to this reservation',
        );
      }

      if (reservation.status !== ReservationStatus.CONFIRMED) {
        throw new ConflictException(
          `Only a CONFIRMED reservation can be cancelled (current status: ${reservation.status})`,
        );
      }

      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CANCELLED },
      });

      await tx.parkingSlot.updateMany({
        where: { id: reservation.slotId, status: SlotStatus.RESERVED },
        data: { status: SlotStatus.AVAILABLE },
      });

      await tx.qrCode.updateMany({
        where: {
          reservationId,
          type: QrCodeType.CHECK_IN,
          status: QrCodeStatus.ACTIVE,
        },
        data: { status: QrCodeStatus.EXPIRED },
      });

      await this.auditService.log(
        {
          entityType: 'Reservation',
          entityId: reservationId,
          action: 'RESERVATION_CANCELLED_BY_USER',
          userId: requestingUser.userId,
        },
        tx,
      );

      await this.notificationService.notify(
        {
          recipientId: reservation.userId,
          recipientRole: NotificationRecipientRole.USER,
          type: 'RESERVATION_CANCELLED',
          title: 'Reservation cancelled',
          message: 'Your reservation was cancelled and the slot released.',
          reservationId,
        },
        tx,
      );

      return tx.reservation.findUniqueOrThrow({
        where: { id: reservationId },
        include: RESERVATION_DETAIL_INCLUDE,
      });
    });
  }

  private async loadOwnedReservation(
    tx: Prisma.TransactionClient,
    reservationId: string,
    userId: string,
  ): Promise<Reservation> {
    const reservation = await tx.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }
    if (reservation.userId !== userId) {
      throw new ForbiddenException('You do not own this reservation');
    }
    return reservation;
  }

  private getCheckinGraceMinutes(): number {
    return this.configService.get<number>(
      'RESERVATION_CHECKIN_GRACE_MINUTES',
      DEFAULT_CHECKIN_GRACE_MINUTES,
    );
  }

  private getCheckoutBufferMinutes(): number {
    return this.configService.get<number>(
      'CHECKOUT_GRACE_BUFFER_MINUTES',
      DEFAULT_CHECKOUT_BUFFER_MINUTES,
    );
  }

  private getMaxAdvanceDays(): number {
    return this.configService.get<number>(
      'RESERVATION_MAX_ADVANCE_DAYS',
      DEFAULT_MAX_ADVANCE_DAYS,
    );
  }
}
