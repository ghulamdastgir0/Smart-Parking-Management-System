import { ParkingSquare } from "lucide-react";
import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-blue-900 p-10 text-primary-foreground lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.12),transparent_45%)]" />
        <Link href="/" className="relative z-10 flex items-center gap-2 font-heading text-lg font-semibold">
          <ParkingSquare className="size-6" />
          SPMS
        </Link>
        <div className="relative z-10 space-y-3">
          <h2 className="font-heading text-4xl font-semibold text-balance">
            Find and reserve parking in seconds.
          </h2>
          <p className="max-w-md text-primary-foreground/80">
            Real-time availability, live navigation, and contactless check-in
            across every parking lot on the network.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5 text-center lg:text-left">
            <h1 className="font-heading text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
