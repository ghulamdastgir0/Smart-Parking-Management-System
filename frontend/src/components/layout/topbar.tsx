"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuth } from "@/features/auth/auth-provider";
import { Breadcrumbs } from "./breadcrumbs";
import { NotificationBell } from "./notification-bell";

function initials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="min-w-0 flex-1 overflow-x-auto">
        <Breadcrumbs />
      </div>
      <NotificationBell />
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" className="h-9 gap-2 px-1.5" />}
        >
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">
              {initials(user?.firstName, user?.lastName)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/profile" />}>
            <UserIcon className="size-4" /> Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive">
            <LogOut className="size-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
