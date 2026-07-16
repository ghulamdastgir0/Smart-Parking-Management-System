import type {
  Challan,
  Payment,
  ReservationBase,
  ReservationLot,
  ReservationSlot,
} from "@/features/reservations/types";

export interface ScanQrPayload {
  token: string;
}

export interface CheckpointReservation extends ReservationBase {
  lot: ReservationLot;
  slot: ReservationSlot;
}

export interface CheckInResponse {
  reservation: CheckpointReservation;
  checkoutQrToken: string;
  checkoutQrCodeImage: string;
}

export interface CheckOutResponse {
  reservation: CheckpointReservation;
  payment: Payment;
  challans: Challan[];
}
