import { Role } from '@prisma/client';
import { z } from 'zod';
import { CheckpointService } from '../../checkpoint/checkpoint.service';
import { ToolDefinition, runToolSafely } from '../tool-definition';

export function buildCheckpointTools(
  checkpointService: CheckpointService,
): ToolDefinition[] {
  return [
    {
      name: 'check_in_via_qr',
      description:
        'Scan a booking (check-in) QR code token at the parking entrance. Only use this if the user has explicitly given you a scanned QR token string.',
      schema: z.object({ token: z.string().uuid() }),
      roles: [Role.ADMIN, Role.MANAGER],
      mutating: true,
      execute: (user, { token }) =>
        runToolSafely(() => checkpointService.checkIn(token, user.userId)),
    },
    {
      name: 'check_out_via_qr',
      description:
        'Scan a checkout QR code token as a vehicle leaves the facility, computing and charging the final fee. Only use this if the user has explicitly given you a scanned QR token string.',
      schema: z.object({ token: z.string().uuid() }),
      roles: [Role.ADMIN, Role.MANAGER],
      mutating: true,
      execute: (user, { token }) =>
        runToolSafely(() => checkpointService.checkOut(token, user.userId)),
    },
  ];
}
