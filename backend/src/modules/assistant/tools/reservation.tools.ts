import { Role } from '@prisma/client';
import { z } from 'zod';
import { ReservationService } from '../../reservation/reservation.service';
import { ToolDefinition, runToolSafely } from '../tool-definition';

export function buildReservationTools(
  reservationService: ReservationService,
): ToolDefinition[] {
  return [
    {
      name: 'list_my_reservations',
      description: "List the authenticated user's own reservations.",
      schema: z.object({}),
      mutating: false,
      execute: (user) =>
        runToolSafely(() => reservationService.findMine(user.userId)),
    },
    {
      name: 'get_reservation',
      description: 'Get a single reservation by id (owner, or Admin/Manager).',
      schema: z.object({ reservationId: z.string().uuid() }),
      mutating: false,
      execute: (user, { reservationId }) =>
        runToolSafely(() => reservationService.findOne(reservationId, user)),
    },
    {
      name: 'list_lot_reservations',
      description:
        "List every customer's reservations at a parking lot (Admin/Manager only). Managers may only query lots they manage.",
      schema: z.object({ lotId: z.string().uuid() }),
      roles: [Role.ADMIN, Role.MANAGER],
      mutating: false,
      execute: (user, { lotId }) =>
        runToolSafely(() => reservationService.findByLot(lotId, user)),
    },
    {
      name: 'book_parking_slot',
      description:
        'Book (reserve) a parking slot for a time window. No payment is collected at booking time. The interval (arrival -> arrival + duration + grace buffer) must not overlap another reservation for the slot. Maximum duration is 24 hours (1440 minutes).',
      schema: z.object({
        slotId: z.string().uuid(),
        arrivalTime: z
          .string()
          .datetime()
          .describe('ISO 8601 arrival date/time'),
        durationMinutes: z.number().int().min(15).max(1440),
      }),
      roles: [Role.CUSTOMER],
      mutating: true,
      execute: (user, dto) =>
        runToolSafely(() => reservationService.create(dto, user.userId)),
    },
    {
      name: 'cancel_reservation',
      description:
        'Cancel a reservation (owner, or Admin/Manager). Only allowed while still CONFIRMED, i.e. before check-in.',
      schema: z.object({ reservationId: z.string().uuid() }),
      mutating: true,
      execute: (user, { reservationId }) =>
        runToolSafely(() => reservationService.cancel(reservationId, user)),
    },
  ];
}
