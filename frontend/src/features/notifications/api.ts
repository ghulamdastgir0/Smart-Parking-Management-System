import { apiClient } from "@/lib/api-client";
import type { Notification } from "./types";

export const notificationsApi = {
  findMine: () =>
    apiClient.get<Notification[]>("/notifications/mine").then((res) => res.data),

  markAllRead: () =>
    apiClient.patch<void>("/notifications/mine/read").then((res) => res.data),
};
