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
