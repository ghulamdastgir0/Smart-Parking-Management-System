"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { parkingSlotsApi } from "./api";
import type { BulkUpdateSlotStatusPayload } from "./types";

export function useFloorSlots(lotId: string, floorId: string) {
  return useQuery({
    queryKey: ["parking-slots", "floor", floorId],
    queryFn: () => parkingSlotsApi.findAllForFloor(lotId, floorId),
    enabled: Boolean(lotId) && Boolean(floorId),
  });
}

export function useFloorSlotsForWindow(
  lotId: string,
  floorId: string,
  arrivalTime?: string,
  durationMinutes?: number,
) {
  return useQuery({
    queryKey: ["parking-slots", "floor", floorId, "window", arrivalTime, durationMinutes],
    queryFn: () =>
      parkingSlotsApi.findAllForFloorInWindow(lotId, floorId, arrivalTime!, durationMinutes!),
    enabled: Boolean(lotId) && Boolean(floorId) && Boolean(arrivalTime) && Boolean(durationMinutes),
  });
}

export function useParkingSlot(id: string) {
  return useQuery({
    queryKey: ["parking-slots", id],
    queryFn: () => parkingSlotsApi.findOne(id),
    enabled: Boolean(id),
  });
}

export function useBulkUpdateSlotStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkUpdateSlotStatusPayload) =>
      parkingSlotsApi.bulkUpdateStatus(payload),
    onSuccess: ({ updatedCount }) => {
      toast.success(`${updatedCount} slot${updatedCount === 1 ? "" : "s"} updated`);
      queryClient.invalidateQueries({ queryKey: ["parking-slots"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
