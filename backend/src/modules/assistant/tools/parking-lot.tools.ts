import { Role } from '@prisma/client';
import { z } from 'zod';
import { ParkingLotService } from '../../parking-lot/parking-lot.service';
import { ToolDefinition, runToolSafely } from '../tool-definition';

const floorSchema = z.object({
  name: z.string().describe('e.g. "Ground Floor", "Basement-1"'),
  floorNumber: z.number().int().min(0).max(999),
  rows: z.number().int().min(1).max(200),
  columns: z.number().int().min(1).max(500),
  defaultSlotPrice: z
    .number()
    .min(0.01)
    .describe('Hourly rate stamped onto every slot on this floor'),
});

export function buildParkingLotTools(
  parkingLotService: ParkingLotService,
): ToolDefinition[] {
  return [
    {
      name: 'find_nearby_parking_lots',
      description:
        'Find parking lots within a radius of a coordinate, ranked by distance. Use this to answer "find parking near me" style requests.',
      schema: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        radiusKm: z.number().min(0.1).max(70).optional(),
      }),
      mutating: false,
      execute: (_user, args) =>
        runToolSafely(() => parkingLotService.findNearby(args)),
    },
    {
      name: 'list_parking_lots',
      description: 'List every parking lot in the system.',
      schema: z.object({}),
      mutating: false,
      execute: (user) => runToolSafely(() => parkingLotService.findAll(user)),
    },
    {
      name: 'get_parking_lot',
      description: 'Get details for a single parking lot by id.',
      schema: z.object({ lotId: z.string().uuid() }),
      mutating: false,
      execute: (user, { lotId }) =>
        runToolSafely(() => parkingLotService.findOne(lotId, user)),
    },
    {
      name: 'list_parking_lot_floors',
      description:
        'List the floors of a parking lot, with capacity and availability.',
      schema: z.object({ lotId: z.string().uuid() }),
      mutating: false,
      execute: (_user, { lotId }) =>
        runToolSafely(() => parkingLotService.findFloors(lotId)),
    },
    {
      name: 'create_parking_lot',
      description:
        'Create a new parking lot with one or more floors. Each floor auto-generates its slot grid from rows x columns.',
      schema: z.object({
        name: z.string().max(150),
        address: z.string().max(255),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        managerId: z
          .string()
          .uuid()
          .optional()
          .describe(
            'Manager to assign as owner — defaults to the requesting manager',
          ),
        floors: z.array(floorSchema).min(1).max(50),
      }),
      roles: [Role.ADMIN, Role.MANAGER],
      mutating: true,
      execute: (user, dto) =>
        runToolSafely(() =>
          parkingLotService.create(dto, user.userId, user.userId),
        ),
    },
    {
      name: 'update_parking_lot',
      description:
        "Update a parking lot's name/address/coordinates/manager/active state. Managers may only update lots they manage.",
      schema: z.object({
        lotId: z.string().uuid(),
        name: z.string().max(150).optional(),
        address: z.string().max(255).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        managerId: z.string().uuid().optional(),
        isActive: z.boolean().optional(),
      }),
      roles: [Role.ADMIN, Role.MANAGER],
      mutating: true,
      execute: (user, { lotId, ...dto }) =>
        runToolSafely(() => parkingLotService.update(lotId, dto, user)),
    },
    {
      name: 'delete_parking_lot',
      description:
        'Delete a parking lot. Managers may only delete lots they manage.',
      schema: z.object({ lotId: z.string().uuid() }),
      roles: [Role.ADMIN, Role.MANAGER],
      mutating: true,
      execute: (user, { lotId }) =>
        runToolSafely(() => parkingLotService.remove(lotId, user)),
    },
    {
      name: 'create_parking_floor',
      description:
        'Add a floor (and its slot grid) to an existing parking lot. Managers may only add floors to lots they manage.',
      schema: floorSchema.extend({ lotId: z.string().uuid() }),
      roles: [Role.ADMIN, Role.MANAGER],
      mutating: true,
      execute: (user, { lotId, ...dto }) =>
        runToolSafely(() => parkingLotService.createFloor(lotId, dto, user)),
    },
  ];
}
