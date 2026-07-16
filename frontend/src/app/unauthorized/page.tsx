"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";

export default function UnauthorizedPage() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
        <ShieldAlert className="size-8 text-primary" />
      </div>
      <div className="space-y-1.5">
        <h1 className="font-heading text-2xl font-semibold">
          You don&apos;t have access to this page
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your account role doesn&apos;t permit this section. If you think
          this is a mistake, contact an administrator.
        </p>
      </div>
      <div className="flex gap-3">
        <Button render={<Link href="/dashboard" />} nativeButton={false}>
          Back to Dashboard
        </Button>
        <Button variant="ghost" onClick={logout}>
          Log out
        </Button>
      </div>
    </div>
  );
}
