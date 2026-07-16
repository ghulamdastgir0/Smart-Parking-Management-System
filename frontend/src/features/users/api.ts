import { apiClient } from "@/lib/api-client";
import type { AdminUser } from "./types";

export const usersApi = {
  findAll: () => apiClient.get<AdminUser[]>("/users").then((res) => res.data),
};
