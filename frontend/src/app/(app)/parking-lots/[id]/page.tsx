"use client";

import { Building2, DollarSign, Layers, ParkingSquare } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useFloors, useParkingLot } from "@/features/parking-lots/hooks";
import { SlotGrid } from "@/features/parking-slots/components/slot-grid";
import { useFloorSlots } from "@/features/parking-slots/hooks";
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
  const { data: floors, isLoading: floorsLoading } = useFloors(id);
  // Always a defined string (never undefined/null) so the Tabs component stays
  // controlled from the very first render — switching from uncontrolled to controlled
  // mid-lifecycle is what Base UI's Tabs warns about.
  const [selectedFloorId, setSelectedFloorId] = useState("");

  useEffect(() => {
    if (floors && floors.length > 0 && !selectedFloorId) {
      // Deliberate: pick the default floor once the list loads, not derivable during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFloorId(floors[0].id);
    }
  }, [floors, selectedFloorId]);

  const { data: slots, isLoading: slotsLoading } = useFloorSlots(id, selectedFloorId);
  const selectedFloor = floors?.find((f) => f.id === selectedFloorId);

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

  return (
    <div className="space-y-6">
      <PageHeader title={lot.name} description={lot.address} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
                <ParkingSquare className="size-4 text-primary" />
                <p className="text-lg font-semibold">{lot.totalSlots}</p>
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
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-medium">Parking Layout</h2>
              {selectedFloor && (
                <Badge variant="secondary">
                  <Layers className="size-3" /> {selectedFloor.availableSlots}/
                  {selectedFloor.totalSlots} available
                </Badge>
              )}
            </div>

            {floorsLoading ? (
              <Skeleton className="h-8 w-full rounded-lg" />
            ) : floors && floors.length > 0 ? (
              <Tabs value={selectedFloorId} onValueChange={(v) => v && setSelectedFloorId(v)}>
                <TabsList className="flex-wrap">
                  {floors.map((floor) => (
                    <TabsTrigger key={floor.id} value={floor.id}>
                      {floor.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            ) : null}

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
