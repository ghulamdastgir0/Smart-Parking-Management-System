import type { Role } from "@/types/enums";

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isBlocked: boolean;
  createdAt: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface UpdateStaffRolePayload {
  role: "MANAGER" | "ADMIN";
}

export interface CreateStaffPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "MANAGER" | "ADMIN";
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface PaymentMethod {
  cardholderName: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
}

export interface SavePaymentMethodPayload {
  cardholderName: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
}
