import type {
  ChallanType,
  PaymentStatus,
  ReservationStatus,
} from "@/types/enums";

export interface QrCode {
  id: string;
  reservationId: string;
  type: "CHECK_IN" | "CHECK_OUT";
  token: string;
  status: "ACTIVE" | "USED" | "EXPIRED";
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
}

export interface Challan {
  id: string;
  reservationId: string;
  type: ChallanType;
  amount: string;
  reason: string | null;
  forCheckoutAt: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  reservationId: string;
  amount: string;
  status: PaymentStatus;
  stripePaymentId: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface ReservationBase {
  id: string;
  userId: string;
  lotId: string;
  slotId: string;
  startTime: string;
  endTime: string;
  totalPrice: string;
  status: ReservationStatus;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Reservation extends ReservationBase {
  payment: Payment | null;
  qrCodes: QrCode[];
  challans: Challan[];
}

export interface CreateReservationPayload {
  slotId: string;
  arrivalTime: string;
  durationMinutes: number;
}

export interface CreateReservationResponse {
  reservation: Reservation;
  qrCodeToken: string;
  qrCodeImage: string;
}

export interface CheckoutPaymentConfirmedResponse {
  reservation: Reservation;
  payment: Payment;
}
