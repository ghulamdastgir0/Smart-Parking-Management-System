"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { authApi } from "./api";
import { useAuth } from "./auth-provider";
import type { LoginPayload, RegisterPayload } from "./types";

export function useLogin() {
  const { applySession } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      applySession(data);
      toast.success(`Welcome back, ${data.user.firstName}`);
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useRegister() {
  const { applySession } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: (data) => {
      applySession(data);
      toast.success("Account created — welcome to SPMS!");
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
