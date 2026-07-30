"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-provider";
import { getApiErrorMessage } from "@/lib/api-error";
import { notificationsApi } from "./api";
import type { Notification } from "./types";

export function useMyNotifications() {
  const { user } = useAuth();
  return useQuery({
    // Scoped by user id so a slow response from a previous session can never land in the
    // now-logged-in user's cache slot — it writes to the old (unsubscribed) key instead.
    queryKey: ["notifications", "mine", user?.id],
    queryFn: notificationsApi.findMine,
    // Matches useMyReservations' polling so a checkpoint scan's notification (and the
    // reservation status change it caused) show up together, not staggered.
    refetchInterval: 15_000,
    enabled: Boolean(user),
  });
}

export function useMarkNotificationsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["notifications", "mine", user?.id];

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.setQueryData<Notification[]>(queryKey, (notifications) =>
        notifications?.map((n) => (n.isRead ? n : { ...n, isRead: true })),
      );
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
