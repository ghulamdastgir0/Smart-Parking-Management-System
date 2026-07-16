"use client";

import { use, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { QrCode } from "@/components/shared/qr-code";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { ReservationStatusBadge } from "@/components/shared/status-badge";
import { ReservationTimeline } from "@/features/reservations/components/reservation-timeline";
import {
  useCancelReservation,
  useConfirmCheckoutPayment,
  useFailCheckoutPayment,
  useReservation,
} from "@/features/reservations/hooks";
import { formatCurrency, formatDateTime, formatDuration } from "@/lib/format";

export default function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: reservation, isLoading, isError, error, refetch } = useReservation(id);
  const confirmPayment = useConfirmCheckoutPayment(id);
  const failPayment = useFailCheckoutPayment(id);
  const cancelReservation = useCancelReservation(id);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError || !reservation) return <ErrorState error={error} onRetry={refetch} />;

  const durationMinutes = Math.round(
    (new Date(reservation.endTime).getTime() - new Date(reservation.startTime).getTime()) / 60_000,
  );
  const activeQr = reservation.qrCodes.find((qr) => qr.status === "ACTIVE");
  const totalChallans = reservation.challans.reduce((sum, c) => sum + Number(c.amount), 0);
  const grandTotal = Number(reservation.totalPrice) + totalChallans;

  return (
    <div className="space-y-6">
      <PageHeader
        title={reservation.lot.name}
        description={`Slot ${reservation.slot.slotNumber} · ${reservation.slot.floor.name}`}
        actions={<ReservationStatusBadge status={reservation.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent>
            <h2 className="mb-4 font-heading font-medium">Booking Timeline</h2>
            <ReservationTimeline reservation={reservation} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <h2 className="font-heading font-medium">Details</h2>
            <div className="space-y-1.5 text-sm">
              <Row label="Arrival Time" value={formatDateTime(reservation.startTime)} />
              <Row label="Expected Checkout" value={formatDateTime(reservation.endTime)} />
              {reservation.checkedInAt && (
                <Row label="Actual Check-In" value={formatDateTime(reservation.checkedInAt)} />
              )}
              {reservation.checkedOutAt && (
                <Row label="Actual Checkout" value={formatDateTime(reservation.checkedOutAt)} />
              )}
              <Row label="Duration" value={formatDuration(durationMinutes)} />
              <Row label="Hourly Rate" value={formatCurrency(reservation.slot.basePrice)} />
            </div>

            {reservation.challans.length > 0 && (
              <div className="space-y-1.5 border-t border-border pt-3 text-sm">
                <p className="font-medium">Additional Charges</p>
                {reservation.challans.map((c) => (
                  <Row
                    key={c.id}
                    label={c.reason ?? c.type}
                    value={formatCurrency(c.amount)}
                  />
                ))}
              </div>
            )}

            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>

            {reservation.payment && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Payment Status</span>
                <Badge
                  variant={
                    reservation.payment.status === "SUCCESSFUL"
                      ? "success"
                      : reservation.payment.status === "FAILED"
                        ? "destructive"
                        : "warning"
                  }
                >
                  {reservation.payment.status}
                </Badge>
              </div>
            )}

            {reservation.status === "PENDING_PAYMENT" && (
              <div className="flex gap-2 border-t border-border pt-4">
                <Button
                  className="flex-1"
                  onClick={() => confirmPayment.mutate()}
                  disabled={confirmPayment.isPending || failPayment.isPending}
                >
                  Simulate Payment Success
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => failPayment.mutate()}
                  disabled={confirmPayment.isPending || failPayment.isPending}
                >
                  Simulate Payment Failure
                </Button>
              </div>
            )}

            {reservation.status === "CONFIRMED" && (
              <div className="border-t border-border pt-4">
                <Button
                  variant="outline"
                  className="w-full text-destructive"
                  onClick={() => setShowCancelDialog(true)}
                >
                  Cancel Reservation
                </Button>
              </div>
            )}

            {activeQr && (
              <div className="flex flex-col items-center gap-2 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">
                  {activeQr.type === "CHECK_IN" ? "Check-in QR" : "Checkout QR"}
                </p>
                <QrCode
                  value={activeQr.token}
                  size={160}
                  downloadable
                  fileName={`reservation-${reservation.id}-${activeQr.type.toLowerCase()}`}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this reservation?</DialogTitle>
            <DialogDescription>
              Slot {reservation.slot.slotNumber} will be released and the check-in QR
              invalidated. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Reservation
            </Button>
            <Button
              variant="destructive"
              disabled={cancelReservation.isPending}
              onClick={() =>
                cancelReservation.mutate(undefined, {
                  onSuccess: () => setShowCancelDialog(false),
                })
              }
            >
              Cancel Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
