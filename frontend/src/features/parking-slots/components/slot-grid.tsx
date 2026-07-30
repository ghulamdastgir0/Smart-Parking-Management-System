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
  AVAILABLE: "bg-success/15 text-success border-success/30",
  RESERVED: "bg-warning/15 text-warning-foreground border-warning/30",
  OCCUPIED: "bg-muted text-muted-foreground border-border",
  MAINTENANCE: "bg-destructive/10 text-destructive border-destructive/30",
};

// Hover feedback only makes sense on slots that are actually clickable — kept separate from
// STATUS_STYLE so a read-only grid (no onSelectSlot/onToggleSlot) never looks interactive.
const HOVER_STYLE: Record<string, string> = {
  AVAILABLE: "hover:bg-success/25",
  MAINTENANCE: "hover:bg-destructive/20",
};

// When availableForWindow is present (a specific arrival/duration was searched), it — not
// the slot's current (denormalized) status — decides whether the slot is bookable: a slot
// can show RESERVED right now but still be free for a later, non-overlapping window.
function displayStatus(slot: ParkingSlot): string {
  if (slot.availableForWindow === undefined) return slot.status;
  if (slot.status === "MAINTENANCE") return "MAINTENANCE";
  return slot.availableForWindow ? "AVAILABLE" : "RESERVED";
}

function slotTitle(slot: ParkingSlot, status: string, variant: "book" | "manage"): string {
  if (variant !== "manage" || !slot.restrictedReason) {
    return `${slot.slotNumber} — ${status}`;
  }
  return `${slot.slotNumber} — ${status}: ${slot.restrictedReason}`;
}

export function SlotGrid({
  slots,
  selectedSlotId,
  onSelectSlot,
  variant = "book",
  selectedSlotIds,
  onToggleSelect,
}: {
  slots: ParkingSlot[];
  selectedSlotId?: string;
  onSelectSlot?: (slot: ParkingSlot) => void;
  /** "manage" lets staff click/multi-select AVAILABLE/MAINTENANCE slots to restrict or
   * unrestrict them in bulk, instead of selecting a single slot to book. */
  variant?: "book" | "manage";
  /** Slot ids currently selected for a bulk restrict/unrestrict action (manage mode only). */
  selectedSlotIds?: Set<string>;
  onToggleSelect?: (slot: ParkingSlot) => void;
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
                const status = displayStatus(slot);
                const interactive =
                  variant === "manage"
                    ? Boolean(onToggleSelect) && (status === "AVAILABLE" || status === "MAINTENANCE")
                    : Boolean(onSelectSlot) && status === "AVAILABLE";
                const selected =
                  variant === "manage" ? (selectedSlotIds?.has(slot.id) ?? false) : selectedSlotId === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!interactive}
                    onClick={() => {
                      if (!interactive) return;
                      if (variant === "manage") onToggleSelect?.(slot);
                      else onSelectSlot?.(slot);
                    }}
                    title={slotTitle(slot, status, variant)}
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md border text-[10px] font-medium transition-colors",
                      STATUS_STYLE[status],
                      interactive ? cn("cursor-pointer", HOVER_STYLE[status]) : "cursor-default",
                      selected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
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
          <span className="size-3 rounded-sm bg-muted-foreground/40" /> Occupied
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-destructive/30" /> Maintenance
        </span>
      </div>
    </div>
  );
}
