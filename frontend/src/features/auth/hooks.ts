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
    // No navigation here — the register page itself advances to its payment step and only
    // then hard-navigates to /dashboard once a card is on file, so the caller controls timing.
    onSuccess: (data) => applySession(data),
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
