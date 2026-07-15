import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  QrCode,
  QrCodeStatus,
  QrCodeType,
  Reservation,
  ReservationStatus,
  SlotStatus,
} from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { toQrCodeImage } from '../../common/qr/qr.util';
import { PrismaService } from '../../prisma/prisma.service';

type QrCodeWithReservation = QrCode & { reservation: Reservation };

@Injectable()
export class CheckpointService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
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

      const checkoutQrCodeImage = await toQrCodeImage(checkoutQr.token);

      return {
        reservation: updatedReservation,
        checkoutQrToken: checkoutQr.token,
        checkoutQrCodeImage,
      };
    });
  }

  async checkOut(
    token: string,
    staffUserId: string,
  ): Promise<{ reservation: Reservation }> {
    return this.prisma.$transaction(async (tx) => {
      const qrCode = await this.loadValidQrCode(
        tx,
        token,
        QrCodeType.CHECK_OUT,
      );
      const { reservation } = qrCode;

      if (reservation.status !== ReservationStatus.CHECKED_IN) {
        throw new ConflictException(
          `Reservation is not checked in (current status: ${reservation.status})`,
        );
      }

      await tx.qrCode.update({
        where: { id: qrCode.id },
        data: { status: QrCodeStatus.USED, usedAt: new Date() },
      });

      const updatedReservation = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.COMPLETED, checkedOutAt: new Date() },
      });

      await tx.parkingSlot.update({
        where: { id: reservation.slotId },
        data: { status: SlotStatus.AVAILABLE },
      });

      await this.auditService.log(
        {
          entityType: 'Reservation',
          entityId: reservation.id,
          action: 'CHECKED_OUT',
          userId: staffUserId,
        },
        tx,
      );

      return { reservation: updatedReservation };
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
