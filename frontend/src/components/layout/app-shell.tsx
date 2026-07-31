"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

// Shaped like the real shell (sidebar + topbar + content) rather than a centered spinner, so
// the auth-bootstrap loading state transitions into the real layout as one continuous motion
// instead of a spinner-then-layout jump cut, matching every route's own Skeleton-based loading.
function ShellSkeleton() {
  return (
    <div className="flex min-h-svh">
      <div className="hidden w-64 shrink-0 flex-col border-r border-border p-3 lg:flex">
        <Skeleton className="mb-4 h-8 w-28" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-end border-b border-border px-4">
          <Skeleton className="size-7 rounded-full" />
        </div>
        <main className="flex-1 space-y-4 p-4 sm:p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  useRealtimeSync();

  // Customers must have a payment method on file before using the rest of the app — checkout
  // charges it automatically, so there's nothing to bill without one.
  const needsBilling =
    isAuthenticated &&
    user?.role === "CUSTOMER" &&
    !user.hasPaymentMethod &&
    pathname !== "/complete-profile";

  useEffect(() => {
    if (needsBilling) router.push("/complete-profile");
  }, [needsBilling, router]);

  if (isLoading || !isAuthenticated || needsBilling) {
    return <ShellSkeleton />;
  }

  // /complete-profile is still onboarding, not real dashboard usage — every other route
  // bounces straight back here via needsBilling, so showing the full nav/sidebar/bottom-nav
  // around it would just be dead chrome pointing at pages the user can't actually reach yet.
  if (pathname === "/complete-profile") {
    return <div className="flex min-h-svh items-center justify-center p-4">{children}</div>;
  }

  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-4 pb-20 sm:px-6 sm:pt-6 lg:pb-6">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
