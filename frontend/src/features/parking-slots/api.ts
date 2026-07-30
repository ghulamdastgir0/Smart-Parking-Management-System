import { apiClient } from "@/lib/api-client";
import { SlotStatus } from "@/types/enums";
import type { BulkUpdateSlotStatusPayload, FindSlotsParams, ParkingSlot } from "./types";

const ALL_STATUSES = Object.values(SlotStatus);

export const parkingSlotsApi = {
  search: (params: FindSlotsParams) =>
    apiClient
      .get<ParkingSlot[]>("/parking-slots", { params })
      .then((res) => res.data),

  findOne: (id: string) =>
    apiClient.get<ParkingSlot>(`/parking-slots/${id}`).then((res) => res.data),

  /**
   * The search endpoint filters to a single status per call (defaulting to AVAILABLE),
   * so the full floor layout (needed to render occupied/reserved slots too) is assembled
   * client-side from one call per status.
   */
  findAllForFloor: async (lotId: string, floorId: string): Promise<ParkingSlot[]> => {
    const results = await Promise.all(
      ALL_STATUSES.map((status) =>
        apiClient.get<ParkingSlot[]>("/parking-slots", {
          params: { lotId, floorId, status },
        }),
      ),
    );
    return results
      .flatMap((res) => res.data)
      .sort((a, b) => a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true }));
  },

  /**
   * Every slot on the floor (any status), each annotated with availableForWindow for the
   * given arrival/duration — the real per-window availability, not just the slot's current
   * (denormalized) status.
   */
  findAllForFloorInWindow: (
    lotId: string,
    floorId: string,
    arrivalTime: string,
    durationMinutes: number,
  ): Promise<ParkingSlot[]> =>
    apiClient
      .get<ParkingSlot[]>("/parking-slots", {
        params: { lotId, floorId, arrivalTime, durationMinutes },
      })
      .then((res) => res.data.sort((a, b) =>
        a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true }),
      )),

  bulkUpdateStatus: (payload: BulkUpdateSlotStatusPayload) =>
    apiClient
      .patch<{ updatedCount: number }>("/parking-slots/bulk-status", payload)
      .then((res) => res.data),
};
