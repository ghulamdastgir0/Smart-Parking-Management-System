import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationRecipientRole,
  Payment,
  PaymentStatus,
  Prisma,
  QrCode,
  QrCodeStatus,
  QrCodeType,
  Reservation,
  ReservationStatus,
  SlotStatus,
} from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { NotificationService } from '../../common/notification/notification.service';
import { toQrCodeImage } from '../../common/qr/qr.util';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingService } from '../reservation/billing.service';
import { ChallanResponseDto } from '../reservation/dto/reservation-response.dto';

type QrCodeWithReservation = QrCode & { reservation: Reservation };

@Injectable()
export class CheckpointService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly billingService: BillingService,
  ) {}

  async checkIn(
    token: string,
    staffUserId: string,
  ): Promise<{
    reservation: Reservation;
    checkoutQrToken: string;
    checkoutQrCodeImage: string;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const qrCode = await this.loadValidQrCode(tx, token, QrCodeType.CHECK_IN);
      const { reservation } = qrCode;

      if (reservation.status !== ReservationStatus.CONFIRMED) {
        throw new ConflictException(
          `Reservation is not confirmed for check-in (current status: ${reservation.status})`,
        );
      }

      await tx.qrCode.update({
        where: { id: qrCode.id },
        data: { status: QrCodeStatus.USED, usedAt: new Date() },
      });

      const updatedReservation = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.CHECKED_IN, checkedInAt: new Date() },
      });

      await tx.parkingSlot.update({
        where: { id: reservation.slotId },
        data: { status: SlotStatus.OCCUPIED },
      });

      const checkoutQr = await tx.qrCode.create({
        data: { reservationId: reservation.id, type: QrCodeType.CHECK_OUT },
      });

      await this.auditService.log(
        {
          entityType: 'Reservation',
          entityId: reservation.id,
          action: 'CHECKED_IN',
          userId: staffUserId,
        },
        tx,
      );

      await this.notificationService.notify(
        {
          recipientId: reservation.userId,
          recipientRole: NotificationRecipientRole.USER,
          type: 'CHECKIN_SUCCESS',
          title: 'Checked in',
          message: 'You have successfully checked in. Enjoy your stay!',
          reservationId: reservation.id,
        },
        tx,
      );

      const checkoutQrCodeImage = await toQrCodeImage(checkoutQr.token);

      return {
        reservation: updatedReservation,
        checkoutQrToken: checkoutQr.token,
        checkoutQrCodeImage,
      };
    });
  }

  /**
   * Scans the checkout QR, records the checkout timestamp, and computes the final charge —
   * but does NOT invalidate the QR, mark the reservation COMPLETED, or release the slot yet.
   * Those happen only once the dummy payment succeeds (see ReservationService.confirmCheckoutPayment),
   * so a failed/abandoned payment can be retried against the same scan without a new QR.
   */
  async checkOut(
    token: string,
    staffUserId: string,
  ): Promise<{
    reservation: Reservation;
    payment: Payment;
    challans: ChallanResponseDto[];
  }> {
    return this.prisma.$transaction(async (tx) => {
      const qrCode = await this.loadValidQrCode(
        tx,
        token,
        QrCodeType.CHECK_OUT,
      );
      const { reservation } = qrCode;

      if (reservation.status === ReservationStatus.PENDING_PAYMENT) {
        throw new ConflictException(
          'Checkout was already initiated for this reservation; awaiting payment',
        );
      }
      if (
        reservation.status !== ReservationStatus.CHECKED_IN &&
        reservation.status !== ReservationStatus.OVERTIME
      ) {
        throw new ConflictException(
          `Reservation is not checked in (current status: ${reservation.status})`,
        );
      }

      const checkedOutAt = new Date();
      const updatedReservation = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.PENDING_PAYMENT, checkedOutAt },
      });

      const totalCharge = await this.billingService.calculateFinalCharge(
        updatedReservation,
        tx,
      );

      const payment = await tx.payment.create({
        data: {
          reservationId: reservation.id,
          amount: totalCharge,
          status: PaymentStatus.PENDING,
        },
      });

      const challans = await tx.challan.findMany({
        where: { reservationId: reservation.id },
      });

      await this.auditService.log(
        {
          entityType: 'Reservation',
          entityId: reservation.id,
          action: 'CHECKED_OUT',
          userId: staffUserId,
          metadata: { checkedOutAt, totalCharge },
        },
        tx,
      );

      await this.notificationService.notify(
        {
          recipientId: reservation.userId,
          recipientRole: NotificationRecipientRole.USER,
          type: 'CHECKOUT_INITIATED',
          title: 'Checkout started — payment due',
          message: `Your final parking charge is ${totalCharge}. Please complete payment to finish checking out.`,
          reservationId: reservation.id,
        },
        tx,
      );

      return {
        reservation: updatedReservation,
        payment,
        challans: challans.map((challan) => ({
          type: challan.type,
          amount: challan.amount.toString(),
          reason: challan.reason,
          createdAt: challan.createdAt,
        })),
      };
    });
  }

  private async loadValidQrCode(
    tx: Prisma.TransactionClient,
    token: string,
    expectedType: QrCodeType,
  ): Promise<QrCodeWithReservation> {
    const qrCode = await tx.qrCode.findUnique({
      where: { token },
      include: { reservation: true },
    });
    if (!qrCode) {
      throw new NotFoundException('QR code not recognized');
    }
    if (qrCode.type !== expectedType) {
      throw new BadRequestException(
        `This QR code is a ${qrCode.type} code, not ${expectedType}`,
      );
    }
    if (qrCode.status !== QrCodeStatus.ACTIVE) {
      throw new GoneException(
        'This QR code has already been used or invalidated',
      );
    }
    if (qrCode.expiresAt && qrCode.expiresAt.getTime() < Date.now()) {
      await tx.qrCode.update({
        where: { id: qrCode.id },
        data: { status: QrCodeStatus.EXPIRED },
      });
      throw new GoneException('This QR code has expired');
    }

    return qrCode;
  }
}
