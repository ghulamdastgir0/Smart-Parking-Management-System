"use client";

import { Building2, DollarSign, ParkingSquare } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useParkingLot } from "@/features/parking-lots/hooks";
import { SlotGrid } from "@/features/parking-slots/components/slot-grid";
import { useLotSlots } from "@/features/parking-slots/hooks";
import { formatCurrency } from "@/lib/format";

const LotLocationMap = dynamic(
  () => import("@/components/map/lot-location-map").then((m) => m.LotLocationMap),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl" /> },
);

export default function ParkingLotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: lot, isLoading, isError, error, refetch } = useParkingLot(id);
  const { data: slots, isLoading: slotsLoading } = useLotSlots(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !lot) return <ErrorState error={error} onRetry={refetch} />;

  const totalSlots = lot.rows * lot.columns;

  return (
    <div className="space-y-6">
      <PageHeader title={lot.name} description={lot.address} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
                <ParkingSquare className="size-4 text-primary" />
                <p className="text-lg font-semibold">{totalSlots}</p>
                <p className="text-[11px] text-muted-foreground">Total Slots</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
                <Building2 className="size-4 text-success" />
                <p className="text-lg font-semibold">{lot.availableSlots}</p>
                <p className="text-[11px] text-muted-foreground">Available Now</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
                <DollarSign className="size-4 text-primary" />
                <p className="text-lg font-semibold">
                  {lot.minHourlyRate ? formatCurrency(lot.minHourlyRate) : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">From / hr</p>
              </CardContent>
            </Card>
          </div>
          <LotLocationMap latitude={lot.latitude} longitude={lot.longitude} />
        </div>

        <Card>
          <CardContent className="space-y-4">
            <h2 className="font-heading font-medium">Parking Layout</h2>
            {slotsLoading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : (
              <SlotGrid slots={slots ?? []} />
            )}
            <Button
              className="w-full"
              disabled={lot.availableSlots === 0}
              render={<Link href={`/parking-lots/${id}/book`} />}
              nativeButton={false}
            >
              {lot.availableSlots === 0 ? "No Slots Available" : "Reserve a Slot"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
