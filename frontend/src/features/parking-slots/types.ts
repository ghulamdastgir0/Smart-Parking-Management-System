import type { SlotStatus, SlotType } from "@/types/enums";

export interface SlotFloorSummary {
  id: string;
  name: string;
  floorNumber: number;
}

export interface ParkingSlot {
  id: string;
  lotId: string;
  floorId: string;
  floor: SlotFloorSummary;
  slotNumber: string;
  type: SlotType;
  status: SlotStatus;
  /** Set when status is MAINTENANCE, cleared when back to AVAILABLE. */
  restrictedReason?: string | null;
  basePrice: string;
  /** Only present when the search included arrivalTime/durationMinutes. */
  availableForWindow?: boolean;
}

export interface FindSlotsParams {
  lotId: string;
  floorId?: string;
  status?: SlotStatus;
  arrivalTime?: string;
  durationMinutes?: number;
}

export interface BulkUpdateSlotStatusPayload {
  slotIds: string[];
  status: "AVAILABLE" | "MAINTENANCE";
  reason?: string;
}
