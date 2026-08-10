import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { RealtimeGateway } from '../../common/realtime/realtime.gateway';
import { toQrCodeImage } from '../../common/qr/qr.util';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingService } from '../reservation/billing.service';
import { ChallanResponseDto } from '../reservation/dto/reservation-response.dto';
import { DEFAULT_CHECKIN_EARLY_MINUTES } from '../reservation/reservation.service';

type QrCodeWithReservation = QrCode & { reservation: Reservation };

const RESERVATION_LOT_SLOT_FLOOR_INCLUDE = {
  lot: true,
  slot: { include: { floor: true } },
} satisfies Prisma.ReservationInclude;

export type ReservationWithLotSlotFloor = Prisma.ReservationGetPayload<{
  include: typeof RESERVATION_LOT_SLOT_FLOOR_INCLUDE;
}>;

@Injectable()
export class CheckpointService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly billingService: BillingService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly configService: ConfigService,
  ) {}

  private getCheckinEarlyMinutes(): number {
    return this.configService.get<number>(
      'RESERVATION_CHECKIN_EARLY_MINUTES',
      DEFAULT_CHECKIN_EARLY_MINUTES,
    );
  }

  async checkIn(
    token: string,
    staffUserId: string,
  ): Promise<{
    reservation: ReservationWithLotSlotFloor;
    checkoutQrToken: string;
    checkoutQrCodeImage: string;
  }> {
    const result = await this.prisma.$transaction(async (tx) => {
      const qrCode = await this.loadValidQrCode(tx, token, QrCodeType.CHECK_IN);
      const { reservation } = qrCode;

      if (reservation.status !== ReservationStatus.CONFIRMED) {
        throw new ConflictException(
          `Reservation is not confirmed for check-in (current status: ${reservation.status})`,
        );
      }

      const earlyMinutes = this.getCheckinEarlyMinutes();
      const checkinOpensAt = new Date(
        reservation.startTime.getTime() - earlyMinutes * 60_000,
      );
      if (new Date() < checkinOpensAt) {
        throw new BadRequestException(
          `Too early to check in — this reservation's arrival window opens at ${checkinOpensAt.toISOString()}.`,
        );
      }

      await tx.qrCode.update({
        where: { id: qrCode.id },
        data: { status: QrCodeStatus.USED, usedAt: new Date() },
      });

      const updatedReservation = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.CHECKED_IN, checkedInAt: new Date() },
        include: RESERVATION_LOT_SLOT_FLOOR_INCLUDE,
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

    // Emitted after the transaction commits, not from inside it — the customer's client
    // would otherwise be able to react and re-fetch over REST before the write is visible.
    this.realtimeGateway.emitToUser(
      result.reservation.userId,
      'reservation:updated',
      {
        reservationId: result.reservation.id,
        event: 'check-in',
      },
    );

    return result;
  }

  /**
   * Scans the checkout QR and immediately attempts to charge the customer's saved payment
   * method for the final amount (base charge + extension/overtime challans).
   *
   * On success, the reservation completes and the slot releases in the same transaction as
   * today's `confirmCheckoutPayment` used to do separately. On decline (no card on file, or
   * the dummy "ends in 0000" test card), nothing advances — the reservation stays
   * CHECKED_IN, the slot stays OCCUPIED, and the checkout QR stays ACTIVE, so staff can just
   * have the customer rescan the same QR to retry once their card is fixed.
   */
  async checkOut(
    token: string,
    staffUserId: string,
  ): Promise<{
    reservation: ReservationWithLotSlotFloor;
    payment: Payment;
    challans: ChallanResponseDto[];
    paymentFailed: boolean;
    message: string;
  }> {
    const result = await this.prisma.$transaction(async (tx) => {
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

      const totalCharge = await this.billingService.calculateFinalCharge(
        reservation,
        tx,
      );

      const paymentMethod = await tx.paymentMethod.findUnique({
        where: { userId: reservation.userId },
      });
      // Dummy processor: no card on file, or a card ending in 0000 (mirrors real test-card
      // conventions like Stripe's decline cards), simulates a decline. Anything else succeeds.
      const declined = !paymentMethod || paymentMethod.last4 === '0000';

      // At most one Payment row per reservation (schema-enforced) — upsert so a retry after
      // a decline updates the same row instead of colliding on the unique reservationId.
      const payment = await tx.payment.upsert({
        where: { reservationId: reservation.id },
        create: {
          reservationId: reservation.id,
          amount: totalCharge,
          status: declined ? PaymentStatus.FAILED : PaymentStatus.SUCCESSFUL,
          paidAt: declined ? null : new Date(),
        },
        update: {
          amount: totalCharge,
          status: declined ? PaymentStatus.FAILED : PaymentStatus.SUCCESSFUL,
          paidAt: declined ? null : new Date(),
        },
      });

      const challans = await tx.challan.findMany({
        where: { reservationId: reservation.id },
      });
      const challanDtos = challans.map((challan) => ({
        type: challan.type,
        amount: challan.amount.toString(),
        reason: challan.reason,
        createdAt: challan.createdAt,
      }));

      if (declined) {
        await this.auditService.log(
          {
            entityType: 'Reservation',
            entityId: reservation.id,
            action: 'CHECKOUT_PAYMENT_DECLINED',
            userId: staffUserId,
            metadata: { totalCharge, hasPaymentMethod: !!paymentMethod },
          },
          tx,
        );

        await this.notificationService.notify(
          {
            recipientId: reservation.userId,
            recipientRole: NotificationRecipientRole.USER,
            type: 'PAYMENT_DECLINED',
            title: 'Payment declined',
            message: paymentMethod
              ? `We couldn't charge your card for ${totalCharge}. Update your payment method if needed, then ask staff to rescan your checkout QR code.`
              : `You don't have a payment method on file, so we couldn't charge ${totalCharge}. Add one in Profile → Billing, then ask staff to rescan your checkout QR code.`,
            reservationId: reservation.id,
          },
          tx,
        );

        const reservationWithDetails = await tx.reservation.findUniqueOrThrow({
          where: { id: reservation.id },
          include: RESERVATION_LOT_SLOT_FLOOR_INCLUDE,
        });

        return {
          reservation: reservationWithDetails,
          payment,
          challans: challanDtos,
          paymentFailed: true,
          message:
            'Payment declined — ask the customer to rescan this QR code to retry.',
        };
      }

      const checkedOutAt = new Date();
      const updatedReservation = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.COMPLETED, checkedOutAt },
        include: RESERVATION_LOT_SLOT_FLOOR_INCLUDE,
      });

      await tx.qrCode.update({
        where: { id: qrCode.id },
        data: { status: QrCodeStatus.USED, usedAt: new Date() },
      });

      const slot = await tx.parkingSlot.update({
        where: { id: reservation.slotId },
        data: { status: SlotStatus.AVAILABLE },
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
          type: 'PAYMENT_COMPLETED',
          title: 'Payment successful',
          message: `Your payment of ${totalCharge} was successful.`,
          reservationId: reservation.id,
        },
        tx,
      );
      await this.notificationService.notify(
        {
          recipientId: reservation.userId,
          recipientRole: NotificationRecipientRole.USER,
          type: 'CHECKOUT_SUCCESS',
          title: 'Checkout complete',
          message:
            'You have successfully checked out. Thanks for parking with us!',
          reservationId: reservation.id,
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
            reservationId: reservation.id,
          },
          tx,
        );
      }

      return {
        reservation: updatedReservation,
        payment,
        challans: challanDtos,
        paymentFailed: false,
        message: 'Checkout complete.',
      };
    });

    this.realtimeGateway.emitToUser(
      result.reservation.userId,
      'reservation:updated',
      {
        reservationId: result.reservation.id,
        event: result.paymentFailed ? 'checkout-payment-declined' : 'check-out',
      },
    );

    return result;
  }

  private async loadValidQrCode(
    tx: Prisma.TransactionClient,
    token: string,
    expectedType: QrCodeType,
  ): Promise<QrCodeWithReservation> {
    // Row-lock the QR row before reading it, so two concurrent scans of the same token
    // (e.g. two managers, or a double-tap) serialize instead of both passing the ACTIVE
    // check before either commits USED.
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "QrCode" WHERE token = ${token} FOR UPDATE
    `;
    if (locked.length === 0) {
      throw new NotFoundException('QR code not recognized');
    }

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
