import { apiClient } from "@/lib/api-client";
import type {
  CreateParkingLotPayload,
  FindNearbyLotsParams,
  FloorInput,
  NearbyParkingLot,
  ParkingFloor,
  ParkingLot,
  UpdateParkingLotPayload,
} from "./types";

export const parkingLotsApi = {
  findAll: () =>
    apiClient.get<ParkingLot[]>("/parking-lots").then((res) => res.data),

  findOne: (id: string) =>
    apiClient.get<ParkingLot>(`/parking-lots/${id}`).then((res) => res.data),

  findNearby: (params: FindNearbyLotsParams) =>
    apiClient
      .get<NearbyParkingLot[]>("/parking-lots/nearby", { params })
      .then((res) => res.data),

  create: (payload: CreateParkingLotPayload) =>
    apiClient
      .post<ParkingLot>("/parking-lots", payload)
      .then((res) => res.data),

  update: (id: string, payload: UpdateParkingLotPayload) =>
    apiClient
      .patch<ParkingLot>(`/parking-lots/${id}`, payload)
      .then((res) => res.data),

  remove: (id: string) =>
    apiClient.delete<ParkingLot>(`/parking-lots/${id}`).then((res) => res.data),

  findFloors: (lotId: string) =>
    apiClient
      .get<ParkingFloor[]>(`/parking-lots/${lotId}/floors`)
      .then((res) => res.data),

  createFloor: (lotId: string, payload: FloorInput) =>
    apiClient
      .post<ParkingFloor>(`/parking-lots/${lotId}/floors`, payload)
      .then((res) => res.data),
};
