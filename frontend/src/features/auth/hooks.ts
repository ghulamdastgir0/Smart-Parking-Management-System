"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { authApi } from "./api";
import { useAuth } from "./auth-provider";
import type { LoginPayload, RegisterPayload } from "./types";

export function useLogin() {
  const { applySession } = useAuth();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      applySession(data);
      // Full navigation, not router.push: Next's client-side router cache can otherwise
      // restore a previously visited route's component tree (nav, dashboard, etc.) as it
      // was rendered for the last session, even after the auth context has already
      // updated — a hard navigation guarantees every component mounts fresh against the
      // new session.
      window.location.href = "/dashboard";
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useRegister() {
  const { applySession } = useAuth();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: (data) => {
      applySession(data);
      // A brand-new account never has a payment method yet — go straight to setup instead
      // of bouncing through /dashboard first.
      window.location.href = "/complete-profile";
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
