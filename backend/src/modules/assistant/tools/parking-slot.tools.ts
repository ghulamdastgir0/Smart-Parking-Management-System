import { Role, SlotStatus } from '@prisma/client';
import { z } from 'zod';
import { ParkingSlotService } from '../../parking-slot/parking-slot.service';
import { ToolDefinition, runToolSafely } from '../tool-definition';

const restrictableStatus = z.enum(['AVAILABLE', 'MAINTENANCE']);

export function buildParkingSlotTools(
  parkingSlotService: ParkingSlotService,
): ToolDefinition[] {
  return [
    {
      name: 'search_parking_slots',
      description:
        'Search parking slots within a lot, e.g. to find AVAILABLE ones before booking. Pass arrivalTime + durationMinutes to check availability for a specific window.',
      schema: z.object({
        lotId: z.string().uuid(),
        floorId: z.string().uuid().optional(),
        status: z.nativeEnum(SlotStatus).optional(),
        arrivalTime: z.string().datetime().optional().describe('ISO 8601'),
        durationMinutes: z.number().int().min(15).max(10080).optional(),
      }),
      mutating: false,
      execute: (_user, args) =>
        runToolSafely(() => parkingSlotService.search(args)),
    },
    {
      name: 'get_parking_slot',
      description: 'Get details for a single parking slot by id.',
      schema: z.object({ slotId: z.string().uuid() }),
      mutating: false,
      execute: (_user, { slotId }) =>
        runToolSafely(() => parkingSlotService.findOne(slotId)),
    },
    {
      name: 'update_slot_status',
      description:
        'Restrict or unrestrict a single slot (toggle AVAILABLE <-> MAINTENANCE). Managers may only update slots in lots they manage.',
      schema: z.object({
        slotId: z.string().uuid(),
        status: restrictableStatus,
        reason: z.string().max(255).optional(),
      }),
      roles: [Role.ADMIN, Role.MANAGER],
      mutating: true,
      execute: (user, { slotId, ...dto }) =>
        runToolSafely(() => parkingSlotService.updateStatus(slotId, dto, user)),
    },
    {
      name: 'bulk_update_slot_status',
      description:
        'Restrict or unrestrict multiple slots at once with one status + optional reason.',
      schema: z.object({
        slotIds: z.array(z.string().uuid()).min(1).max(500),
        status: restrictableStatus,
        reason: z.string().max(255).optional(),
      }),
      roles: [Role.ADMIN, Role.MANAGER],
      mutating: true,
      execute: (user, dto) =>
        runToolSafely(() => parkingSlotService.bulkUpdateStatus(dto, user)),
    },
  ];
}
