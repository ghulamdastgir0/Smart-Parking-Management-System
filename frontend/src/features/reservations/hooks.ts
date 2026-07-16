"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-provider";
import { getApiErrorMessage } from "@/lib/api-error";
import { reservationsApi } from "./api";
import type { CreateReservationPayload } from "./types";

export const reservationsKeys = {
  all: ["reservations"] as const,
  // Scoped by user id so a slow response from a previous session can never land in the
  // now-logged-in user's cache slot — it writes to the old (unsubscribed) key instead.
  mine: (userId: string | undefined) => ["reservations", "mine", userId] as const,
  byLot: (lotId: string) => ["reservations", "by-lot", lotId] as const,
  detail: (id: string) => ["reservations", id] as const,
};

export function useMyReservations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: reservationsKeys.mine(user?.id),
    queryFn: reservationsApi.findMine,
    enabled: Boolean(user),
  });
}

export function useReservationsByLot(lotId: string) {
  return useQuery({
    queryKey: reservationsKeys.byLot(lotId),
    queryFn: () => reservationsApi.findByLot(lotId),
    enabled: Boolean(lotId),
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
      queryClient.invalidateQueries({ queryKey: reservationsKeys.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useCancelReservation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reservationsApi.cancel(id),
    onSuccess: () => {
      toast.success("Reservation cancelled");
      queryClient.invalidateQueries({ queryKey: reservationsKeys.all });
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
      queryClient.invalidateQueries({ queryKey: reservationsKeys.all });
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
      queryClient.invalidateQueries({ queryKey: reservationsKeys.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
