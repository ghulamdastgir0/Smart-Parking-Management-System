"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@/features/auth/auth-provider";
import { getAuthToken } from "@/lib/auth-token";

/**
 * Pushes reservation/notification updates the instant a checkpoint scan happens on a
 * different device (staff's scanner), instead of waiting for the next poll — the scan
 * can't invalidate this browser's react-query cache directly since it's a separate
 * session, so the backend pushes an event over a socket scoped to this user instead.
 */
export function useRealtimeSync() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const token = getAuthToken();
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL, {
      auth: { token },
    });

    socket.on("reservation:updated", () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user, queryClient]);
}
