"use client";

import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "./api";

export function useMyNotifications() {
  return useQuery({
    queryKey: ["notifications", "mine"],
    queryFn: notificationsApi.findMine,
    refetchInterval: 30_000,
  });
}
