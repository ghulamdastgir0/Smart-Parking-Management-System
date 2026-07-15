import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogEntry {
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

type AuditCapableClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pass `tx` (the callback argument of a `$transaction`) so the audit row commits/rolls
   * back atomically with the business operation it describes. Omit it for standalone,
   * outside-a-transaction writes (e.g. the expiry cron sweep, which loops per-reservation).
   */
  async log(
    entry: AuditLogEntry,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client: AuditCapableClient = tx ?? this.prisma;

    await client.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        userId: entry.userId,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
