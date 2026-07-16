"use client";

import { formatDistanceToNow } from "@/lib/format";
import { Bell } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMarkNotificationsRead, useMyNotifications } from "@/features/notifications/hooks";
import { NotificationIcon } from "@/features/notifications/notification-icon";

export function NotificationBell() {
  const { data: notifications } = useMyNotifications();
  const markRead = useMarkNotificationsRead();
  const recent = notifications?.slice(0, 6) ?? [];
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && unreadCount > 0) markRead.mutate();
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative size-9"
            aria-label="Notifications"
          />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {recent.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          recent.map((n) => (
            <DropdownMenuItem key={n.id} className="flex-col items-start gap-0.5 whitespace-normal">
              <div className="flex w-full items-start gap-2">
                <NotificationIcon type={n.type} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {n.message}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(n.createdAt)}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
        <div className="border-t border-border p-1">
          <Link
            href="/notifications"
            className="block rounded-md px-2 py-1.5 text-center text-sm text-primary hover:bg-accent"
          >
            View all
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
