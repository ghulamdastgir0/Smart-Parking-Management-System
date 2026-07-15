import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ChallanType,
  NotificationRecipientRole,
  ParkingLot,
  ParkingSlot,
  QrCodeStatus,
  QrCodeType,
  Reservation,
  ReservationStatus,
  SlotStatus,
} from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { NotificationService } from '../../common/notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_CHECKIN_GRACE_MINUTES,
  DEFAULT_CHECKOUT_BUFFER_MINUTES,
} from './reservation.service';

const DEFAULT_REMINDER_OFFSET_MINUTES = 15;
const DEFAULT_OVERTIME_PENALTY_MULTIPLIER = 1.5;
const EXTENSION_HOURS = 1;

type ActiveReservation = Reservation & { slot: ParkingSlot; lot: ParkingLot };

@Injectable()
export class ReservationMonitoringService {
  private readonly logger = new Logger(ReservationMonitoringService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async monitor(): Promise<void> {
    // Single-instance reentrancy guard: skip this tick if the previous one is still running
    // (e.g. a slow tick under load) rather than let two ticks race on the same reservations.
    if (this.isRunning) {
      this.logger.warn(
        'Previous monitoring tick still running; skipping this tick',
      );
      return;
    }

    this.isRunning = true;
    try {
      await this.cancelNoShows();
      await this.processActiveBookings();
    } finally {
      this.isRunning = false;
    }
  }

  private async cancelNoShows(): Promise<void> {
    const cutoff = new Date(
      Date.now() - this.getCheckinGraceMinutes() * 60_000,
    );

    const noShows = await this.prisma.reservation.findMany({
      where: { status: ReservationStatus.CONFIRMED, startTime: { lt: cutoff } },
    });

    for (const reservation of noShows) {
      await this.prisma.$transaction(async (tx) => {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: ReservationStatus.CANCELLED },
        });

        await tx.parkingSlot.updateMany({
          where: { id: reservation.slotId, status: SlotStatus.RESERVED },
          data: { status: SlotStatus.AVAILABLE },
        });

        await tx.qrCode.updateMany({
          where: {
            reservationId: reservation.id,
            type: QrCodeType.CHECK_IN,
            status: QrCodeStatus.ACTIVE,
          },
          data: { status: QrCodeStatus.EXPIRED },
        });

        await this.auditService.log(
          {
            entityType: 'Reservation',
            entityId: reservation.id,
            action: 'RESERVATION_AUTO_CANCELLED_NO_SHOW',
          },
          tx,
        );

        await this.notificationService.notify(
          {
            recipientId: reservation.userId,
            recipientRole: NotificationRecipientRole.USER,
            type: 'RESERVATION_EXPIRED',
            title: 'Reservation expired',
            message:
              'You did not check in within the allowed window, so your reservation was ' +
              'cancelled and the slot released.',
            reservationId: reservation.id,
          },
          tx,
        );
      });
    }

    if (noShows.length > 0) {
      this.logger.log(
        `Auto-cancelled ${noShows.length} no-show reservation(s)`,
      );
    }
  }

  private async processActiveBookings(): Promise<void> {
    const active = await this.prisma.reservation.findMany({
      where: { status: ReservationStatus.CHECKED_IN },
      include: { slot: true, lot: true },
    });

    const now = Date.now();
    const reminderOffsetMs = this.getReminderOffsetMinutes() * 60_000;
    const bufferMs = this.getCheckoutBufferMinutes() * 60_000;

    for (const reservation of active) {
      const endTimeMs = reservation.endTime.getTime();

      if (now >= endTimeMs - reminderOffsetMs && now < endTimeMs) {
        await this.notificationService.notify({
          recipientId: reservation.userId,
          recipientRole: NotificationRecipientRole.USER,
          type: 'CHECKOUT_REMINDER_15MIN',
          title: 'Parking time ending soon',
          message: `Your reserved parking time for slot ${reservation.slot.slotNumber} ends at ${reservation.endTime.toISOString()}.`,
          reservationId: reservation.id,
          forCheckoutAt: reservation.endTime,
        });
      }

      if (now >= endTimeMs && now < endTimeMs + bufferMs) {
        await this.notificationService.notify({
          recipientId: reservation.userId,
          recipientRole: NotificationRecipientRole.USER,
          type: 'CHECKOUT_TIME_REACHED',
          title: 'Reserved parking time ended',
          message: `Your reserved time has ended. You have a ${this.getCheckoutBufferMinutes()}-minute grace period to check out.`,
          reservationId: reservation.id,
          forCheckoutAt: reservation.endTime,
        });
      }

      if (now >= endTimeMs + reminderOffsetMs && now < endTimeMs + bufferMs) {
        await this.notificationService.notify({
          recipientId: reservation.userId,
          recipientRole: NotificationRecipientRole.USER,
          type: 'GRACE_PERIOD_WARNING',
          title: 'Grace period in progress',
          message: `You are within the ${this.getCheckoutBufferMinutes()}-minute grace period. Please check out soon.`,
          reservationId: reservation.id,
          forCheckoutAt: reservation.endTime,
        });
      }

      if (now >= endTimeMs + bufferMs) {
        await this.resolveGraceExpiry(reservation);
      }
    }
  }

  private async resolveGraceExpiry(
    reservation: ActiveReservation,
  ): Promise<void> {
    const nextReservation = await this.prisma.reservation.findFirst({
      where: {
        slotId: reservation.slotId,
        status: ReservationStatus.CONFIRMED,
        startTime: { gt: reservation.endTime },
      },
      orderBy: { startTime: 'asc' },
    });

    if (nextReservation) {
      await this.markOvertime(reservation, nextReservation);
    } else {
      await this.extendBooking(reservation);
    }
  }

  private async markOvertime(
    reservation: ActiveReservation,
    nextReservation: Reservation,
  ): Promise<void> {
    const forCheckoutAt = reservation.endTime;

    await this.prisma.$transaction(async (tx) => {
      // Idempotency: if this cycle's OVERTIME challan already exists, a previous tick
      // already handled this — skip everything else (no duplicate notifications/audit).
      const alreadyProcessed = await tx.challan.findUnique({
        where: {
          reservationId_type_forCheckoutAt: {
            reservationId: reservation.id,
            type: ChallanType.OVERTIME,
            forCheckoutAt,
          },
        },
      });
      if (alreadyProcessed) {
        return;
      }

      const hourlyRate = Number(reservation.slot.basePrice);
      const penalty =
        Math.round(hourlyRate * this.getOvertimePenaltyMultiplier() * 100) /
        100;

      await tx.challan.create({
        data: {
          reservationId: reservation.id,
          type: ChallanType.OVERTIME,
          amount: penalty,
          reason:
            'Overstay beyond grace period with another reservation queued for this slot',
          forCheckoutAt,
        },
      });

      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.OVERTIME },
      });

      const overstayMinutes = Math.round(
        (Date.now() - reservation.endTime.getTime()) / 60_000,
      );

      await this.notificationService.notify(
        {
          recipientId: reservation.userId,
          recipientRole: NotificationRecipientRole.USER,
          type: 'VEHICLE_REMOVAL_NOTICE',
          title: 'Remove your vehicle immediately',
          message:
            `Your reserved parking time has expired and another customer is waiting for ` +
            `slot ${reservation.slot.slotNumber}. Please remove your vehicle immediately. ` +
            `An overstay charge of ${penalty} has been applied.`,
          reservationId: reservation.id,
          forCheckoutAt,
        },
        tx,
      );

      await this.notificationService.notify(
        {
          recipientId: reservation.lot.managerId,
          recipientRole: NotificationRecipientRole.MANAGER,
          type: 'STAFF_INTERVENTION_REQUIRED',
          title: 'Overstay — staff intervention required',
          message:
            `Vehicle for reservation ${reservation.id} is overstaying slot ` +
            `${reservation.slot.slotNumber} by ${overstayMinutes} minute(s). Next reservation ` +
            `for this slot starts at ${nextReservation.startTime.toISOString()}.`,
          metadata: {
            reservationId: reservation.id,
            userId: reservation.userId,
            slotNumber: reservation.slot.slotNumber,
            overstayMinutes,
            nextReservationId: nextReservation.id,
            nextReservationStart: nextReservation.startTime,
          },
          reservationId: reservation.id,
          forCheckoutAt,
        },
        tx,
      );

      await this.auditService.log(
        {
          entityType: 'Reservation',
          entityId: reservation.id,
          action: 'OVERTIME_FLAGGED',
          metadata: {
            overstayMinutes,
            penalty,
            nextReservationId: nextReservation.id,
          },
        },
        tx,
      );
    });
  }

  private async extendBooking(reservation: ActiveReservation): Promise<void> {
    const forCheckoutAt = reservation.endTime;
    const newEndTime = new Date(
      reservation.endTime.getTime() + EXTENSION_HOURS * 60 * 60_000,
    );

    await this.prisma.$transaction(async (tx) => {
      const alreadyProcessed = await tx.challan.findUnique({
        where: {
          reservationId_type_forCheckoutAt: {
            reservationId: reservation.id,
            type: ChallanType.EXTENSION,
            forCheckoutAt,
          },
        },
      });
      if (alreadyProcessed) {
        return;
      }

      const hourlyRate = Number(reservation.slot.basePrice);
      const extensionCharge =
        Math.round(hourlyRate * EXTENSION_HOURS * 100) / 100;

      await tx.challan.create({
        data: {
          reservationId: reservation.id,
          type: ChallanType.EXTENSION,
          amount: extensionCharge,
          reason:
            'Automatic 1-hour extension — no other reservation queued for this slot',
          forCheckoutAt,
        },
      });

      await tx.reservation.update({
        where: { id: reservation.id },
        data: { endTime: newEndTime },
      });

      await this.notificationService.notify(
        {
          recipientId: reservation.userId,
          recipientRole: NotificationRecipientRole.USER,
          type: 'AUTO_EXTENDED',
          title: 'Parking session automatically extended',
          message:
            `Slot ${reservation.slot.slotNumber} was still available, so your parking ` +
            `session was extended by 1 hour (new expected checkout: ${newEndTime.toISOString()}). ` +
            `An additional charge of ${extensionCharge} was added.`,
          reservationId: reservation.id,
          forCheckoutAt,
        },
        tx,
      );

      await this.notificationService.notify(
        {
          recipientId: reservation.lot.managerId,
          recipientRole: NotificationRecipientRole.MANAGER,
          type: 'AUTO_EXTENDED',
          title: 'Automatic extension applied',
          message: `Reservation ${reservation.id} on slot ${reservation.slot.slotNumber} was auto-extended by 1 hour.`,
          reservationId: reservation.id,
          forCheckoutAt,
        },
        tx,
      );

      await this.auditService.log(
        {
          entityType: 'Reservation',
          entityId: reservation.id,
          action: 'RESERVATION_AUTO_EXTENDED',
          metadata: { newEndTime, extensionCharge },
        },
        tx,
      );
    });
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

  private getReminderOffsetMinutes(): number {
    return this.configService.get<number>(
      'CHECKOUT_REMINDER_OFFSET_MINUTES',
      DEFAULT_REMINDER_OFFSET_MINUTES,
    );
  }

  private getOvertimePenaltyMultiplier(): number {
    return this.configService.get<number>(
      'OVERTIME_PENALTY_MULTIPLIER',
      DEFAULT_OVERTIME_PENALTY_MULTIPLIER,
    );
  }
}
