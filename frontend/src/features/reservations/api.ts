import { apiClient } from "@/lib/api-client";
import type {
  CheckoutPaymentConfirmedResponse,
  CreateReservationPayload,
  CreateReservationResponse,
  Payment,
  Reservation,
} from "./types";

export const reservationsApi = {
  create: (payload: CreateReservationPayload) =>
    apiClient
      .post<CreateReservationResponse>("/reservations", payload)
      .then((res) => res.data),

  findMine: () =>
    apiClient.get<Reservation[]>("/reservations/mine").then((res) => res.data),

  findOne: (id: string) =>
    apiClient.get<Reservation>(`/reservations/${id}`).then((res) => res.data),

  confirmCheckoutPayment: (id: string) =>
    apiClient
      .post<CheckoutPaymentConfirmedResponse>(
        `/reservations/${id}/checkout-payment/confirm`,
      )
      .then((res) => res.data),

  failCheckoutPayment: (id: string) =>
    apiClient
      .post<Payment>(`/reservations/${id}/checkout-payment/fail`)
      .then((res) => res.data),
};
