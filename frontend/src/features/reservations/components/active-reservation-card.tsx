"use client";

import { ArrowRight, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode } from "@/components/shared/qr-code";
import { ReservationStatusBadge } from "@/components/shared/status-badge";
import { useParkingLot } from "@/features/parking-lots/hooks";
import { useCountdown } from "@/hooks/use-countdown";
import { formatTime } from "@/lib/format";
import type { Reservation } from "../types";

export function ActiveReservationCard({ reservation }: { reservation: Reservation }) {
  const { data: lot } = useParkingLot(reservation.lotId);
  const countdown = useCountdown(reservation.endTime);
  const activeQr = reservation.qrCodes.find((qr) => qr.status === "ACTIVE");

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <ReservationStatusBadge status={reservation.status} />
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" /> {countdown} remaining
            </span>
          </div>
          <div>
            <p className="font-heading text-lg font-semibold">
              {lot?.name ?? "Loading…"}
            </p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" /> {lot?.address}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Arrival </span>
              {formatTime(reservation.startTime)}
            </div>
            <div>
              <span className="text-muted-foreground">Expected checkout </span>
              {formatTime(reservation.endTime)}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/reservations/${reservation.id}`} />}
            nativeButton={false}
          >
            View Details <ArrowRight className="size-3.5" />
          </Button>
        </div>
        {activeQr && <QrCode value={activeQr.token} size={120} />}
      </CardContent>
    </Card>
  );
}
