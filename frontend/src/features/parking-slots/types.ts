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
}

export interface FindSlotsParams {
  lotId: string;
  floorId?: string;
  status?: SlotStatus;
}
