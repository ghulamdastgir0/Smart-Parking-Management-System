import { apiClient } from "@/lib/api-client";
import type { CheckInResponse, CheckOutResponse, ScanQrPayload } from "./types";

export const checkpointApi = {
  checkIn: (payload: ScanQrPayload) =>
    apiClient
      .post<CheckInResponse>("/checkpoint/check-in", payload)
      .then((res) => res.data),

  checkOut: (payload: ScanQrPayload) =>
    apiClient
      .post<CheckOutResponse>("/checkpoint/check-out", payload)
      .then((res) => res.data),
};
