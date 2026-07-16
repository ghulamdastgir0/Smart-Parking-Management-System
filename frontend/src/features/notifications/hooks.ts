"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-provider";
import { notificationsApi } from "./api";
import type { Notification } from "./types";

export function useMyNotifications() {
  const { user } = useAuth();
  return useQuery({
    // Scoped by user id so a slow response from a previous session can never land in the
    // now-logged-in user's cache slot — it writes to the old (unsubscribed) key instead.
    queryKey: ["notifications", "mine", user?.id],
    queryFn: notificationsApi.findMine,
    refetchInterval: 30_000,
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
  });
}
