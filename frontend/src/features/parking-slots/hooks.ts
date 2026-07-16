"use client";

import { useQuery } from "@tanstack/react-query";
import { parkingSlotsApi } from "./api";

export function useLotSlots(lotId: string) {
  return useQuery({
    queryKey: ["parking-slots", "lot", lotId],
    queryFn: () => parkingSlotsApi.findAllForLot(lotId),
    enabled: Boolean(lotId),
  });
}

export function useParkingSlot(id: string) {
  return useQuery({
    queryKey: ["parking-slots", id],
    queryFn: () => parkingSlotsApi.findOne(id),
    enabled: Boolean(id),
  });
}
