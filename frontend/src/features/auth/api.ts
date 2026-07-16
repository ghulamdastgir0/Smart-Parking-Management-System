import { apiClient } from "@/lib/api-client";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  UserProfile,
} from "./types";

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient
      .post<AuthResponse>("/auth/login", payload)
      .then((res) => res.data),

  register: (payload: RegisterPayload) =>
    apiClient
      .post<AuthResponse>("/auth/register", payload)
      .then((res) => res.data),

  me: () => apiClient.get<UserProfile>("/users/me").then((res) => res.data),
};
