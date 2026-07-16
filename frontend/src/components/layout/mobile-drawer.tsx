"use client";

import { Menu, ParkingSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { drawerClosed, drawerOpened } from "@/store/slices/ui-slice";
import { NAV_ITEMS, visibleNavItems } from "./nav-items";

export function MobileDrawer() {
  const open = useAppSelector((state) => state.ui.mobileDrawerOpen);
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const { user } = useAuth();
  const items = visibleNavItems(NAV_ITEMS, user?.role);

  return (
    <Sheet open={open} onOpenChange={(next) => dispatch(next ? drawerOpened() : drawerClosed())}>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open menu"
        onClick={() => dispatch(drawerOpened())}
      >
        <Menu className="size-5" />
      </Button>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <ParkingSquare className="size-5 text-primary" />
            SPMS
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-3">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => dispatch(drawerClosed())}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
