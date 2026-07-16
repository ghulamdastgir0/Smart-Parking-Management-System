import { MapPinOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
        <MapPinOff className="size-8 text-primary" />
      </div>
      <div className="space-y-1.5">
        <p className="font-heading text-5xl font-bold text-primary">404</p>
        <h1 className="font-heading text-2xl font-semibold">
          This page took a wrong turn
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Button render={<Link href="/dashboard" />} nativeButton={false}>
        Back to Dashboard
      </Button>
    </div>
  );
}
