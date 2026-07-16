import type { Role } from "@/types/enums";

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
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
