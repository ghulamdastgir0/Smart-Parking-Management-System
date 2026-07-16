import { apiClient } from "@/lib/api-client";
import type {
  AdminUser,
  ChangePasswordPayload,
  CreateUserPayload,
  PaymentMethod,
  SavePaymentMethodPayload,
} from "./types";

export const usersApi = {
  findAll: () => apiClient.get<AdminUser[]>("/users").then((res) => res.data),

  create: (payload: CreateUserPayload) =>
    apiClient.post<AdminUser>("/users", payload).then((res) => res.data),

  remove: (id: string) => apiClient.delete<void>(`/users/${id}`).then((res) => res.data),

  changePassword: (payload: ChangePasswordPayload) =>
    apiClient.patch<void>("/users/me/password", payload).then((res) => res.data),

  getPaymentMethod: () =>
    apiClient.get<PaymentMethod>("/users/me/payment-method").then((res) => res.data),

  savePaymentMethod: (payload: SavePaymentMethodPayload) =>
    apiClient
      .put<PaymentMethod>("/users/me/payment-method", payload)
      .then((res) => res.data),
};
