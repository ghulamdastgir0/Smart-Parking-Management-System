import { Role } from '@prisma/client';
import { z } from 'zod';
import { UsersService } from '../../users/users.service';
import { ToolDefinition, runToolSafely } from '../tool-definition';

const profileFields = {
  firstName: z.string().max(20).optional(),
  lastName: z.string().max(20).optional(),
  email: z.string().email().max(254).optional(),
};

export function buildUsersTools(usersService: UsersService): ToolDefinition[] {
  return [
    {
      name: 'get_my_profile',
      description: "Get the authenticated user's own profile.",
      schema: z.object({}),
      mutating: false,
      execute: (user) => runToolSafely(() => usersService.findOne(user.userId)),
    },
    {
      name: 'get_my_payment_method',
      description:
        "Get the authenticated user's saved payment method (masked).",
      schema: z.object({}),
      mutating: false,
      execute: (user) =>
        runToolSafely(() => usersService.getPaymentMethod(user.userId)),
    },
    {
      name: 'list_all_users',
      description: 'List every user account in the system (Admin only).',
      schema: z.object({}),
      roles: [Role.ADMIN],
      mutating: false,
      execute: () => runToolSafely(() => usersService.findAll()),
    },
    {
      name: 'get_user',
      description: 'Get a user by id (Admin only).',
      schema: z.object({ userId: z.string().uuid() }),
      roles: [Role.ADMIN],
      mutating: false,
      execute: (_user, { userId }) =>
        runToolSafely(() => usersService.findOne(userId)),
    },
    {
      name: 'update_my_profile',
      description: "Update the authenticated user's own name/email.",
      schema: z.object(profileFields),
      mutating: true,
      execute: (user, dto) =>
        runToolSafely(() =>
          usersService.updateProfile(user.userId, dto, user.role),
        ),
    },
    {
      name: 'block_user',
      description:
        'Block a user account (Admin only) — blocks future logins and force-cancels their CONFIRMED reservations.',
      schema: z.object({ userId: z.string().uuid() }),
      roles: [Role.ADMIN],
      mutating: true,
      execute: (user, { userId }) =>
        runToolSafely(() => usersService.block(userId, user.userId)),
    },
    {
      name: 'unblock_user',
      description: 'Unblock a previously blocked user account (Admin only).',
      schema: z.object({ userId: z.string().uuid() }),
      roles: [Role.ADMIN],
      mutating: true,
      execute: (user, { userId }) =>
        runToolSafely(() => usersService.unblock(userId, user.userId)),
    },
    {
      name: 'update_user',
      description: "Update another user's name/email (Admin only).",
      schema: z.object({ userId: z.string().uuid(), ...profileFields }),
      roles: [Role.ADMIN],
      mutating: true,
      execute: (user, { userId, ...dto }) =>
        runToolSafely(() =>
          usersService.adminUpdateProfile(userId, dto, user.userId),
        ),
    },
    {
      name: 'remove_manager',
      description:
        'Delete a manager account (Admin only). Fails if the manager still manages a parking lot.',
      schema: z.object({ userId: z.string().uuid() }),
      roles: [Role.ADMIN],
      mutating: true,
      execute: (user, { userId }) =>
        runToolSafely(() => usersService.removeManager(userId, user.userId)),
    },
  ];
}
