import type { SlotStatus, SlotType } from "@/types/enums";

export interface ParkingSlot {
  id: string;
  lotId: string;
  slotNumber: string;
  type: SlotType;
  status: SlotStatus;
  basePrice: string;
}

export interface FindSlotsParams {
  lotId: string;
  status?: SlotStatus;
}
