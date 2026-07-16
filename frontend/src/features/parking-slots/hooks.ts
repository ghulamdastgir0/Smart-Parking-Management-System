"use client";

import { useQuery } from "@tanstack/react-query";
import { parkingSlotsApi } from "./api";

export function useFloorSlots(lotId: string, floorId: string) {
  return useQuery({
    queryKey: ["parking-slots", "floor", floorId],
    queryFn: () => parkingSlotsApi.findAllForFloor(lotId, floorId),
    enabled: Boolean(lotId) && Boolean(floorId),
  });
}

export function useParkingSlot(id: string) {
  return useQuery({
    queryKey: ["parking-slots", id],
    queryFn: () => parkingSlotsApi.findOne(id),
    enabled: Boolean(id),
  });
}
