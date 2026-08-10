import { apiClient } from "@/lib/api-client";
import type {
  AdminUser,
  ChangePasswordPayload,
  CreateStaffPayload,
  PaymentMethod,
  SavePaymentMethodPayload,
  UpdateProfilePayload,
  UpdateStaffRolePayload,
} from "./types";

export const usersApi = {
  findAll: () => apiClient.get<AdminUser[]>("/users").then((res) => res.data),

  block: (id: string) =>
    apiClient.patch<AdminUser>(`/users/${id}/block`).then((res) => res.data),

  unblock: (id: string) =>
    apiClient.patch<AdminUser>(`/users/${id}/unblock`).then((res) => res.data),

  createStaff: (payload: CreateStaffPayload) =>
    apiClient.post<AdminUser>("/users/staff", payload).then((res) => res.data),

  removeManager: (id: string) =>
    apiClient.delete<void>(`/users/managers/${id}`).then((res) => res.data),

  updateUser: (id: string, payload: UpdateProfilePayload) =>
    apiClient.patch<AdminUser>(`/users/${id}`, payload).then((res) => res.data),

  updateStaffRole: (id: string, payload: UpdateStaffRolePayload) =>
    apiClient.patch<AdminUser>(`/users/${id}/role`, payload).then((res) => res.data),

  updateProfile: (payload: UpdateProfilePayload) =>
    apiClient.patch<AdminUser>("/users/me", payload).then((res) => res.data),

  deleteOwnAccount: () => apiClient.delete<void>("/users/me").then((res) => res.data),

  changePassword: (payload: ChangePasswordPayload) =>
    apiClient.patch<void>("/users/me/password", payload).then((res) => res.data),

  getPaymentMethod: () =>
    apiClient.get<PaymentMethod>("/users/me/payment-method").then((res) => res.data),

  savePaymentMethod: (payload: SavePaymentMethodPayload) =>
    apiClient
      .put<PaymentMethod>("/users/me/payment-method", payload)
      .then((res) => res.data),
};
