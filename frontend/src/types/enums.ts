export const Role = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CUSTOMER: "CUSTOMER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const SlotType = {
  STANDARD: "STANDARD",
  LARGE: "LARGE",
} as const;
export type SlotType = (typeof SlotType)[keyof typeof SlotType];

export const SlotStatus = {
  AVAILABLE: "AVAILABLE",
  RESERVED: "RESERVED",
  OCCUPIED: "OCCUPIED",
  MAINTENANCE: "MAINTENANCE",
} as const;
export type SlotStatus = (typeof SlotStatus)[keyof typeof SlotStatus];

export const ReservationStatus = {
  CONFIRMED: "CONFIRMED",
  CHECKED_IN: "CHECKED_IN",
  OVERTIME: "OVERTIME",
  PENDING_PAYMENT: "PENDING_PAYMENT",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type ReservationStatus =
  (typeof ReservationStatus)[keyof typeof ReservationStatus];

export const PaymentStatus = {
  PENDING: "PENDING",
  SUCCESSFUL: "SUCCESSFUL",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const ChallanType = {
  EXTENSION: "EXTENSION",
  OVERTIME: "OVERTIME",
} as const;
export type ChallanType = (typeof ChallanType)[keyof typeof ChallanType];

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  OVERTIME: "Overtime",
  PENDING_PAYMENT: "Pending Payment",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const RESERVATION_STATUS_VARIANT: Record<
  ReservationStatus,
  "default" | "success" | "warning" | "destructive" | "secondary"
> = {
  CONFIRMED: "default",
  CHECKED_IN: "success",
  OVERTIME: "destructive",
  PENDING_PAYMENT: "warning",
  COMPLETED: "secondary",
  CANCELLED: "secondary",
};
