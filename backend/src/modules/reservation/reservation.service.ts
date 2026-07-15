import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Payment,
  PaymentStatus,
  Prisma,
  QrCodeType,
  Reservation,
  ReservationStatus,
  Role,
  SlotStatus,
} from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { SlotUnavailableException } from '../../common/exceptions/slot-unavailable.exception';
import { toQrCodeImage } from '../../common/qr/qr.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateReservationDto } from './dto/create-reservation.dto';

const DEFAULT_PAYMENT_TIMEOUT_MINUTES = 15;

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    dto: CreateReservationDto,
    userId: string,
  ): Promise<{ reservation: Reservation; payment: Payment }> {
    const startTime = dto.startTime ? new Date(dto.startTime) : new Date();
    const endTime = new Date(
      startTime.getTime() + dto.durationMinutes * 60_000,
    );

    return this.prisma.$transaction(async (tx) => {
      const slot = await tx.parkingSlot.findUnique({
        where: { id: dto.slotId },
      });
      if (!slot) {
        throw new NotFoundException(`Parking slot ${dto.slotId} not found`);
      }

      // Conditional update guards against double-booking: this only succeeds if the slot
      // is still AVAILABLE at the moment of the write, and Postgres serializes concurrent
      // UPDATEs to the same row so a second racing request always sees count === 0.
      const { count } = await tx.parkingSlot.updateMany({
        where: { id: dto.slotId, status: SlotStatus.AVAILABLE },
        data: { status: SlotStatus.RESERVED },
      });
      if (count === 0) {
        throw new SlotUnavailableException(dto.slotId);
      }

      const totalPrice = this.calculateTotalPrice(
        slot.basePrice,
        dto.durationMinutes,
      );

      const reservation = await tx.reservation.create({
        data: {
          userId,
          lotId: slot.lotId,
          slotId: slot.id,
          startTime,
          endTime,
          totalPrice,
          status: ReservationStatus.PENDING_PAYMENT,
        },
      });

      const payment = await tx.payment.create({
        data: {
          reservationId: reservation.id,
          amount: totalPrice,
          status: PaymentStatus.PENDING,
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
            totalPrice,
            durationMinutes: dto.durationMinutes,
          },
        },
        tx,
      );

      return { reservation, payment };
    });
  }

  async confirmPayment(
    reservationId: string,
    userId: string,
  ): Promise<{
    reservation: Reservation;
    qrCodeToken: string;
    qrCodeImage: string;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await this.loadOwnedReservation(
        tx,
        reservationId,
        userId,
      );

      if (reservation.status !== ReservationStatus.PENDING_PAYMENT) {
        throw new ConflictException(
          `Reservation is not awaiting payment (current status: ${reservation.status})`,
        );
      }
      if (this.isPastPaymentWindow(reservation.createdAt)) {
        throw new GoneException(
          'This reservation has expired; please create a new one',
        );
      }

      await tx.payment.update({
        where: { reservationId },
        data: { status: PaymentStatus.SUCCESSFUL, paidAt: new Date() },
      });

      const updatedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CONFIRMED },
      });

      const qrCode = await tx.qrCode.create({
        data: {
          reservationId,
          type: QrCodeType.CHECK_IN,
          expiresAt: reservation.endTime,
        },
      });

      await this.auditService.log(
        {
          entityType: 'Reservation',
          entityId: reservationId,
          action: 'PAYMENT_CONFIRMED',
          userId,
        },
        tx,
      );

      const qrCodeImage = await toQrCodeImage(qrCode.token);

      return {
        reservation: updatedReservation,
        qrCodeToken: qrCode.token,
        qrCodeImage,
      };
    });
  }

  async failPayment(
    reservationId: string,
    userId: string,
  ): Promise<Reservation> {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await this.loadOwnedReservation(
        tx,
        reservationId,
        userId,
      );

      if (reservation.status !== ReservationStatus.PENDING_PAYMENT) {
        throw new ConflictException(
          `Reservation is not awaiting payment (current status: ${reservation.status})`,
        );
      }

      await tx.payment.update({
        where: { reservationId },
        data: { status: PaymentStatus.FAILED },
      });

      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CANCELLED },
      });

      await tx.parkingSlot.update({
        where: { id: reservation.slotId },
        data: { status: SlotStatus.AVAILABLE },
      });

      await this.auditService.log(
        {
          entityType: 'Reservation',
          entityId: reservationId,
          action: 'PAYMENT_FAILED',
          userId,
        },
        tx,
      );

      return updated;
    });
  }

  findMine(userId: string): Promise<Reservation[]> {
    return this.prisma.reservation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(
    id: string,
    requestingUser: AuthenticatedUser,
  ): Promise<Reservation> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
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
   * Sweeps reservations still PENDING_PAYMENT past the configurable timeout, releasing
   * their slot and failing the payment so the slot is free for other customers again.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireStalePendingReservations(): Promise<void> {
    const cutoff = new Date(
      Date.now() - this.getPaymentTimeoutMinutes() * 60_000,
    );

    const staleReservations = await this.prisma.reservation.findMany({
      where: {
        status: ReservationStatus.PENDING_PAYMENT,
        createdAt: { lt: cutoff },
      },
    });

    for (const reservation of staleReservations) {
      await this.prisma.$transaction(async (tx) => {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: ReservationStatus.EXPIRED },
        });

        await tx.parkingSlot.updateMany({
          where: { id: reservation.slotId, status: SlotStatus.RESERVED },
          data: { status: SlotStatus.AVAILABLE },
        });

        await tx.payment.updateMany({
          where: {
            reservationId: reservation.id,
            status: PaymentStatus.PENDING,
          },
          data: { status: PaymentStatus.FAILED },
        });

        await this.auditService.log(
          {
            entityType: 'Reservation',
            entityId: reservation.id,
            action: 'RESERVATION_EXPIRED',
          },
          tx,
        );
      });
    }

    if (staleReservations.length > 0) {
      this.logger.log(
        `Expired ${staleReservations.length} stale pending-payment reservation(s)`,
      );
    }
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

  private calculateTotalPrice(
    basePrice: Prisma.Decimal,
    durationMinutes: number,
  ): number {
    const hourlyRate = Number(basePrice);
    return Math.round(hourlyRate * (durationMinutes / 60) * 100) / 100;
  }

  private isPastPaymentWindow(createdAt: Date): boolean {
    return (
      Date.now() - createdAt.getTime() >
      this.getPaymentTimeoutMinutes() * 60_000
    );
  }

  private getPaymentTimeoutMinutes(): number {
    return this.configService.get<number>(
      'RESERVATION_PAYMENT_TIMEOUT_MINUTES',
      DEFAULT_PAYMENT_TIMEOUT_MINUTES,
    );
  }
}
