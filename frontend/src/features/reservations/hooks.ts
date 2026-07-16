"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { reservationsApi } from "./api";
import type { CreateReservationPayload } from "./types";

export const reservationsKeys = {
  mine: ["reservations", "mine"] as const,
  detail: (id: string) => ["reservations", id] as const,
};

export function useMyReservations() {
  return useQuery({
    queryKey: reservationsKeys.mine,
    queryFn: reservationsApi.findMine,
  });
}

export function useReservation(id: string) {
  return useQuery({
    queryKey: reservationsKeys.detail(id),
    queryFn: () => reservationsApi.findOne(id),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReservationPayload) =>
      reservationsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationsKeys.mine });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useConfirmCheckoutPayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reservationsApi.confirmCheckoutPayment(id),
    onSuccess: () => {
      toast.success("Payment confirmed — checkout complete");
      queryClient.invalidateQueries({ queryKey: reservationsKeys.mine });
      queryClient.invalidateQueries({ queryKey: reservationsKeys.detail(id) });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useFailCheckoutPayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reservationsApi.failCheckoutPayment(id),
    onSuccess: () => {
      toast.error("Payment failed — you can retry checkout");
      queryClient.invalidateQueries({ queryKey: reservationsKeys.detail(id) });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
