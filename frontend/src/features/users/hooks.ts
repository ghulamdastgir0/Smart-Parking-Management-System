"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { usersApi } from "./api";
import type {
  ChangePasswordPayload,
  CreateStaffPayload,
  SavePaymentMethodPayload,
  UpdateProfilePayload,
} from "./types";

export function useAdminUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: usersApi.findAll,
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.block(id),
    onSuccess: () => {
      toast.success("User blocked");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.unblock(id),
    onSuccess: () => {
      toast.success("User unblocked");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStaffPayload) => usersApi.createStaff(payload),
    onSuccess: () => {
      toast.success("Staff account created");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useRemoveManager() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.removeManager(id),
    onSuccess: () => {
      toast.success("Manager deleted");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProfilePayload }) =>
      usersApi.updateUser(id, payload),
    onSuccess: () => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => usersApi.updateProfile(payload),
    onSuccess: (user) => {
      toast.success("Profile updated");
      queryClient.setQueryData(["auth", "me"], (current: object | undefined) =>
        current && { ...current, ...user },
      );
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeleteOwnAccount() {
  return useMutation({
    mutationFn: () => usersApi.deleteOwnAccount(),
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

export function usePaymentMethod(enabled = true) {
  // A 404 just means no card is on file yet — callers distinguish that from a real error
  // via getApiStatus(error) === 404, so this deliberately doesn't retry or treat it specially.
  return useQuery({
    queryKey: ["payment-method"],
    queryFn: usersApi.getPaymentMethod,
    retry: false,
    enabled,
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
