import type { ReservationBase } from "@/features/reservations/types";
import type { Challan, Payment } from "@/features/reservations/types";

export interface ScanQrPayload {
  token: string;
}

export interface CheckInResponse {
  reservation: ReservationBase;
  checkoutQrToken: string;
  checkoutQrCodeImage: string;
}

export interface CheckOutResponse {
  reservation: ReservationBase;
  payment: Payment;
  challans: Challan[];
}
