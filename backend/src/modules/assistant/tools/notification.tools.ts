import { z } from 'zod';
import { NotificationService } from '../../../common/notification/notification.service';
import { ToolDefinition, runToolSafely } from '../tool-definition';

export function buildNotificationTools(
  notificationService: NotificationService,
): ToolDefinition[] {
  return [
    {
      name: 'list_my_notifications',
      description: "List the authenticated user's notifications, newest first.",
      schema: z.object({}),
      mutating: false,
      execute: (user) =>
        runToolSafely(() => notificationService.findMine(user.userId)),
    },
    {
      name: 'mark_notifications_read',
      description:
        "Mark all of the authenticated user's notifications as read.",
      schema: z.object({}),
      mutating: true,
      execute: (user) =>
        runToolSafely(async () => {
          await notificationService.markAllRead(user.userId);
          return 'All notifications marked as read.';
        }),
    },
  ];
}
