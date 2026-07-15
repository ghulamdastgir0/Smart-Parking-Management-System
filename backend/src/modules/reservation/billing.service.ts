import { Injectable } from '@nestjs/common';
import { Prisma, Reservation } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Final charge = base reserved-duration charge (fixed at reservation creation) + every
 * Challan (extension/overtime) issued since. Deliberately does NOT re-derive hours from raw
 * checked-in-to-checked-out elapsed time — that time is already billed via the Challans
 * created for each extension cycle, so recomputing from elapsed time would double-charge it.
 */
@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateFinalCharge(
    reservation: Reservation,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const challans = await client.challan.findMany({
      where: { reservationId: reservation.id },
    });

    const challanTotal = challans.reduce(
      (sum, challan) => sum + Number(challan.amount),
      0,
    );
    const baseCharge = Number(reservation.totalPrice);

    return Math.round((baseCharge + challanTotal) * 100) / 100;
  }
}
