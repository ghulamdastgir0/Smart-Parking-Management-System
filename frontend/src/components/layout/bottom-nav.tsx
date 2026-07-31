"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV_MAX_TABS, NAV_ITEMS, visibleNavItems } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = visibleNavItems(NAV_ITEMS, user?.role);

  // Everything fits its own tab — no need for an overflow "More" tab at all.
  const needsOverflow = items.length > BOTTOM_NAV_MAX_TABS;
  const primary = needsOverflow ? items.slice(0, BOTTOM_NAV_MAX_TABS - 1) : items;
  const overflow = needsOverflow ? items.slice(BOTTOM_NAV_MAX_TABS - 1) : [];
  const overflowActive = overflow.some((item) => pathname.startsWith(item.href));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 lg:hidden">
        {primary.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {item.shortLabel ?? item.label}
            </Link>
          );
        })}
        {overflow.length > 0 && (
          <button
            type="button"
            aria-label="More navigation options"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
              overflowActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Ellipsis className="size-5" />
            More
          </button>
        )}
      </nav>

      {overflow.length > 0 && (
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="p-0">
            <SheetHeader className="border-b border-border">
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-3">
              {overflow.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
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
      )}
    </>
  );
}
