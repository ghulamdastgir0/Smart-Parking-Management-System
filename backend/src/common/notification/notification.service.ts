import { Injectable, Logger } from '@nestjs/common';
import {
  Notification,
  NotificationRecipientRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface NotifyParams {
  recipientId: string;
  recipientRole: NotificationRecipientRole;
  type: string;
  title: string;
  message: string;
  reservationId?: string;
  metadata?: Record<string, unknown>;
  /** Set for per-checkout-cycle reminders (T-15, at-end, grace, extend/overtime) so a repeat
   *  cron tick can't double-send — the DB's unique constraint is the idempotency guard. */
  forCheckoutAt?: Date;
}

/**
 * No real email/SMS/push provider is wired up in this project — notifications are
 * persisted as an in-app inbox (and logged) so the "dummy" channel can be swapped for a
 * real one later without touching call sites, the same way payments are dummy today.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns false (no-op) if this exact (reservation, type, forCheckoutAt) was already sent.
   * Checks-then-inserts rather than insert-and-catch-P2002: a failed statement inside a
   * Postgres transaction aborts the whole transaction, so a caught duplicate-key error would
   * otherwise poison every other write in the same `tx` (e.g. the Challan + status update
   * the monitoring cron makes alongside this call).
   */
  async notify(
    params: NotifyParams,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const client = tx ?? this.prisma;

    if (params.reservationId && params.forCheckoutAt) {
      const existing = await client.notification.findUnique({
        where: {
          recipientId_reservationId_type_forCheckoutAt: {
            recipientId: params.recipientId,
            reservationId: params.reservationId,
            type: params.type,
            forCheckoutAt: params.forCheckoutAt,
          },
        },
      });
      if (existing) {
        return false;
      }
    }

    await client.notification.create({
      data: {
        recipientId: params.recipientId,
        recipientRole: params.recipientRole,
        type: params.type,
        title: params.title,
        message: params.message,
        reservationId: params.reservationId,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
        forCheckoutAt: params.forCheckoutAt,
      },
    });

    this.logger.log(
      `[${params.recipientRole}:${params.recipientId}] ${params.type} — ${params.title}`,
    );
    return true;
  }

  findMine(recipientId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { recipientId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
