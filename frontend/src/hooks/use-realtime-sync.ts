"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-provider";
import { getAuthToken } from "@/lib/auth-token";

const REALTIME_TOAST_ID = "realtime-status";

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

    // Tracks whether we've already shown a "disconnected" toast, so the eventual
    // reconnection only announces "restored" when there was actually something to restore —
    // not on the very first, normal connection.
    const wasDisconnected = { current: false };

    socket.on("reservation:updated", () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    socket.on("connect", () => {
      if (wasDisconnected.current) {
        toast.success("Live updates restored", { id: REALTIME_TOAST_ID });
        wasDisconnected.current = false;
      }
    });

    socket.on("connect_error", () => {
      wasDisconnected.current = true;
      toast.error("Live updates unavailable — retrying…", { id: REALTIME_TOAST_ID });
    });

    socket.on("disconnect", (reason) => {
      if (reason === "io client disconnect") return; // deliberate teardown, not a drop
      wasDisconnected.current = true;
      toast.warning("Live updates disconnected — retrying…", { id: REALTIME_TOAST_ID });
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user, queryClient]);
}
