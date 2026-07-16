import { apiClient } from "@/lib/api-client";
import { SlotStatus } from "@/types/enums";
import type { FindSlotsParams, ParkingSlot } from "./types";

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
   * so the full lot layout (needed to render occupied/reserved slots too) is assembled
   * client-side from one call per status.
   */
  findAllForLot: async (lotId: string): Promise<ParkingSlot[]> => {
    const results = await Promise.all(
      ALL_STATUSES.map((status) =>
        apiClient.get<ParkingSlot[]>("/parking-slots", {
          params: { lotId, status },
        }),
      ),
    );
    return results
      .flatMap((res) => res.data)
      .sort((a, b) => a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true }));
  },
};
