"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { policiesApi } from "./api";
import type { UploadPolicyPayload } from "./types";

const policiesKey = ["policies"] as const;

export function useAdminPolicies() {
  return useQuery({ queryKey: policiesKey, queryFn: policiesApi.findAll });
}

export function useUploadPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UploadPolicyPayload) => policiesApi.upload(payload),
    onSuccess: () => {
      toast.success("Policy uploaded and indexed");
      queryClient.invalidateQueries({ queryKey: policiesKey });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDeletePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => policiesApi.remove(id),
    onSuccess: () => {
      toast.success("Policy deleted");
      queryClient.invalidateQueries({ queryKey: policiesKey });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
