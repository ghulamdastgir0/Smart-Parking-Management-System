"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

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
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-4 pb-20 sm:p-6 lg:pb-6">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
