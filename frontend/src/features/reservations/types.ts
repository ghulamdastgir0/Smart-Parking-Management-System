import type { SlotStatus, SlotType } from "@/types/enums";
import type {
  ChallanType,
  PaymentStatus,
  ReservationStatus,
} from "@/types/enums";

// Mirrors the raw ParkingLot/ParkingFloor/ParkingSlot Prisma rows as embedded via
// `include` on the backend (not the frontend's enriched ParkingLot, which adds
// availableSlots/totalSlots/minHourlyRate that these embedded rows don't carry).
export interface ReservationLot {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  managerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationFloor {
  id: string;
  lotId: string;
  name: string;
  floorNumber: number;
  rows: number;
  columns: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationSlot {
  id: string;
  lotId: string;
  floorId: string;
  floor: ReservationFloor;
  slotNumber: string;
  type: SlotType;
  status: SlotStatus;
  basePrice: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface ReservationCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
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
  lot: ReservationLot;
  slot: ReservationSlot;
  user: ReservationCustomer;
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
