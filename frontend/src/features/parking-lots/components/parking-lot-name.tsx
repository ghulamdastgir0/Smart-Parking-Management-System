"use client";

import { useParkingLot } from "../hooks";

export function ParkingLotName({ lotId }: { lotId: string }) {
  const { data: lot, isLoading } = useParkingLot(lotId);
  if (isLoading) return <span className="animate-pulse text-muted-foreground">…</span>;
  return <>{lot?.name ?? "Unknown lot"}</>;
}
