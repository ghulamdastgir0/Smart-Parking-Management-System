"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
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
      // Cancel any request left over from a previous session (e.g. a still-in-flight
      // /users/me fetch issued under the old token) so its late response can't overwrite
      // the session we're about to apply with stale, wrong-user data.
      void queryClient.cancelQueries({ queryKey: ["auth", "me"] });
      setAuthToken(auth.accessToken);
      queryClient.setQueryData(["auth", "me"], {
        ...auth.user,
        createdAt: new Date().toISOString(),
      });
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    // Cancel in-flight requests before clearing so none of them can repopulate the cache
    // with the outgoing user's data after the fact.
    void queryClient.cancelQueries();
    clearAuthToken();
    queryClient.setQueryData(["auth", "me"], undefined);
    queryClient.clear();
    // Full navigation, not router.push: Next's client-side router cache can otherwise
    // restore a previously visited route's component tree as it was rendered for the last
    // session once the next user logs in and navigates back to it. A hard navigation
    // guarantees a completely fresh app boot for the next session.
    window.location.href = "/login";
  }, [queryClient]);

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
