"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/auth-token";
import { authApi } from "./api";
import type { AuthResponse, UserProfile } from "./types";

interface AuthContextValue {
  user: UserProfile | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  applySession: (auth: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const hasToken = typeof window !== "undefined" && Boolean(getAuthToken());

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    enabled: hasToken,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const applySession = useCallback(
    (auth: AuthResponse) => {
      setAuthToken(auth.accessToken);
      queryClient.setQueryData(["auth", "me"], {
        ...auth.user,
        createdAt: new Date().toISOString(),
      });
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    clearAuthToken();
    queryClient.setQueryData(["auth", "me"], undefined);
    queryClient.clear();
    router.push("/login");
  }, [queryClient, router]);

  const value = useMemo(
    () => ({
      user,
      isLoading: hasToken && isLoading,
      isAuthenticated: Boolean(user),
      applySession,
      logout,
    }),
    [user, isLoading, hasToken, applySession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
