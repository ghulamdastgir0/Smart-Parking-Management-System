import { apiClient } from "@/lib/api-client";
import type { Notification } from "./types";

export const notificationsApi = {
  findMine: () =>
    apiClient.get<Notification[]>("/notifications/mine").then((res) => res.data),
};
