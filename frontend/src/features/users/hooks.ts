"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { usersApi } from "./api";
import type {
  ChangePasswordPayload,
  CreateUserPayload,
  SavePaymentMethodPayload,
} from "./types";

export function useAdminUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: usersApi.findAll,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: () => {
      toast.success("User created");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => usersApi.changePassword(payload),
    onSuccess: () => toast.success("Password changed"),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function usePaymentMethod() {
  // A 404 just means no card is on file yet — callers distinguish that from a real error
  // via getApiStatus(error) === 404, so this deliberately doesn't retry or treat it specially.
  return useQuery({
    queryKey: ["payment-method"],
    queryFn: usersApi.getPaymentMethod,
    retry: false,
  });
}

export function useSavePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SavePaymentMethodPayload) => usersApi.savePaymentMethod(payload),
    onSuccess: (paymentMethod) => {
      toast.success("Payment method saved");
      queryClient.setQueryData(["payment-method"], paymentMethod);
      queryClient.setQueryData(
        ["auth", "me"],
        (user: { hasPaymentMethod?: boolean } | undefined) =>
          user && { ...user, hasPaymentMethod: true },
      );
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
