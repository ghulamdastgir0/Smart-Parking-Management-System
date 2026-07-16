"use client";

import { ParkingSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, visibleNavItems } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = visibleNavItems(NAV_ITEMS, user?.role);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-5 font-heading font-semibold">
        <ParkingSquare className="size-5 text-sidebar-primary" />
        SPMS
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
