"use client";

import { useMutation } from "@tanstack/react-query";
import { checkpointApi } from "./api";
import type { ScanQrPayload } from "./types";

export function useCheckIn() {
  return useMutation({
    mutationFn: (payload: ScanQrPayload) => checkpointApi.checkIn(payload),
  });
}

export function useCheckOut() {
  return useMutation({
    mutationFn: (payload: ScanQrPayload) => checkpointApi.checkOut(payload),
  });
}
