"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { parkingLotsApi } from "./api";
import type {
  CreateParkingLotPayload,
  FindNearbyLotsParams,
  FloorInput,
  UpdateFloorPayload,
  UpdateParkingLotPayload,
} from "./types";

export const parkingLotsKeys = {
  all: ["parking-lots"] as const,
  detail: (id: string) => ["parking-lots", id] as const,
  nearby: (params: FindNearbyLotsParams) =>
    ["parking-lots", "nearby", params] as const,
  floors: (lotId: string) => ["parking-lots", lotId, "floors"] as const,
};

export function useParkingLots() {
  return useQuery({
    queryKey: parkingLotsKeys.all,
    queryFn: parkingLotsApi.findAll,
  });
}

export function useParkingLot(id: string) {
  return useQuery({
    queryKey: parkingLotsKeys.detail(id),
    queryFn: () => parkingLotsApi.findOne(id),
    enabled: Boolean(id),
  });
}

export function useNearbyParkingLots(params: FindNearbyLotsParams | null) {
  return useQuery({
    queryKey: parkingLotsKeys.nearby(params ?? { latitude: 0, longitude: 0 }),
    queryFn: () => parkingLotsApi.findNearby(params!),
    enabled: Boolean(params),
  });
}

export function useCreateParkingLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateParkingLotPayload) =>
      parkingLotsApi.create(payload),
    onSuccess: () => {
      toast.success("Parking lot created");
      queryClient.invalidateQueries({ queryKey: parkingLotsKeys.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useUpdateParkingLot(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateParkingLotPayload) =>
      parkingLotsApi.update(id, payload),
    onSuccess: () => {
      toast.success("Parking lot updated");
      queryClient.invalidateQueries({ queryKey: parkingLotsKeys.all });
      queryClient.invalidateQueries({ queryKey: parkingLotsKeys.detail(id) });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeleteParkingLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => parkingLotsApi.remove(id),
    onSuccess: () => {
      toast.success("Parking lot deleted");
      queryClient.invalidateQueries({ queryKey: parkingLotsKeys.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useFloors(lotId: string) {
  return useQuery({
    queryKey: parkingLotsKeys.floors(lotId),
    queryFn: () => parkingLotsApi.findFloors(lotId),
    enabled: Boolean(lotId),
  });
}

export function useCreateFloor(lotId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FloorInput) =>
      parkingLotsApi.createFloor(lotId, payload),
    onSuccess: () => {
      toast.success("Floor added");
      queryClient.invalidateQueries({ queryKey: parkingLotsKeys.floors(lotId) });
      queryClient.invalidateQueries({ queryKey: parkingLotsKeys.detail(lotId) });
      queryClient.invalidateQueries({ queryKey: parkingLotsKeys.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useUpdateFloor(lotId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ floorId, payload }: { floorId: string; payload: UpdateFloorPayload }) =>
      parkingLotsApi.updateFloor(lotId, floorId, payload),
    onSuccess: () => {
      toast.success("Floor updated");
      queryClient.invalidateQueries({ queryKey: parkingLotsKeys.floors(lotId) });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeleteFloor(lotId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (floorId: string) => parkingLotsApi.deleteFloor(lotId, floorId),
    onSuccess: () => {
      toast.success("Floor deleted");
      queryClient.invalidateQueries({ queryKey: parkingLotsKeys.floors(lotId) });
      queryClient.invalidateQueries({ queryKey: parkingLotsKeys.detail(lotId) });
      queryClient.invalidateQueries({ queryKey: parkingLotsKeys.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
