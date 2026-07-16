"use client";

import { cn } from "@/lib/utils";
import type { ParkingSlot } from "../types";

const SLOT_NUMBER_RE = /^([A-Z]+)(\d+)$/;

function parseSlot(slotNumber: string): { row: string; col: number } {
  const match = SLOT_NUMBER_RE.exec(slotNumber);
  if (!match) return { row: slotNumber, col: 0 };
  return { row: match[1], col: Number(match[2]) };
}

function rowSort(a: string, b: string) {
  if (a.length !== b.length) return a.length - b.length;
  return a.localeCompare(b);
}

const STATUS_STYLE: Record<string, string> = {
  AVAILABLE: "bg-success/15 text-success border-success/30 hover:bg-success/25",
  RESERVED: "bg-warning/15 text-warning-foreground border-warning/30",
  OCCUPIED: "bg-muted text-muted-foreground border-border",
  MAINTENANCE: "bg-destructive/10 text-destructive border-destructive/30",
};

export function SlotGrid({
  slots,
  selectedSlotId,
  onSelectSlot,
}: {
  slots: ParkingSlot[];
  selectedSlotId?: string;
  onSelectSlot?: (slot: ParkingSlot) => void;
}) {
  const rows = Array.from(new Set(slots.map((s) => parseSlot(s.slotNumber).row))).sort(rowSort);

  return (
    <div className="space-y-4">
      <div className="space-y-2 overflow-x-auto">
        {rows.map((row) => {
          const rowSlots = slots
            .filter((s) => parseSlot(s.slotNumber).row === row)
            .sort((a, b) => parseSlot(a.slotNumber).col - parseSlot(b.slotNumber).col);
          return (
            <div key={row} className="flex items-center gap-1.5">
              <span className="w-5 shrink-0 text-xs font-medium text-muted-foreground">
                {row}
              </span>
              {rowSlots.map((slot) => {
                const interactive = onSelectSlot && slot.status === "AVAILABLE";
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!interactive}
                    onClick={() => interactive && onSelectSlot(slot)}
                    title={`${slot.slotNumber} — ${slot.status}`}
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md border text-[10px] font-medium transition-colors",
                      STATUS_STYLE[slot.status],
                      interactive && "cursor-pointer",
                      !interactive && slot.status !== "AVAILABLE" && "cursor-not-allowed",
                      selectedSlotId === slot.id && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                    )}
                  >
                    {slot.slotNumber}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-success/40" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-warning/40" /> Reserved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-muted" /> Occupied
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-destructive/30" /> Maintenance
        </span>
      </div>
    </div>
  );
}
