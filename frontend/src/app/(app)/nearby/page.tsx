"use client";

import { LocateFixed, MapPin, TriangleAlert } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useNearbyParkingLots } from "@/features/parking-lots/hooks";
import { useGeolocation } from "@/hooks/use-geolocation";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const NearbyMap = dynamic(
  () => import("@/components/map/nearby-map").then((m) => m.NearbyMap),
  { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-xl" /> },
);

export default function NearbyPage() {
  const geo = useGeolocation();
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

  useEffect(() => {
    geo.locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const params =
    geo.status === "success" && geo.latitude !== null && geo.longitude !== null
      ? { latitude: geo.latitude, longitude: geo.longitude, radiusKm: 10 }
      : null;

  const { data: lots, isLoading, isError, error, refetch } = useNearbyParkingLots(params);

  return (
    <div className="flex h-[calc(100svh-8rem)] flex-col lg:h-[calc(100svh-6rem)]">
      <PageHeader title="Nearby Parking" description="Find and book parking close to you" />

      {geo.status === "error" && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm">
          <TriangleAlert className="size-4 text-warning-foreground" />
          {geo.error}
          <Button size="sm" variant="outline" className="ml-auto" onClick={geo.locate}>
            <LocateFixed className="size-3.5" /> Try again
          </Button>
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[380px_1fr]">
        <div className="order-2 min-h-0 overflow-y-auto lg:order-1">
          {geo.status === "loading" || (params && isLoading) ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : !lots || lots.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No parking lots found within 10km"
              description="Try again later or check back once more lots are added nearby."
            />
          ) : (
            <div className="space-y-3">
              {lots.map((lot) => (
                <button
                  key={lot.id}
                  onClick={() => setSelectedLotId(lot.id)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-colors",
                    selectedLotId === lot.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{lot.name}</p>
                      <p className="text-xs text-muted-foreground">{lot.address}</p>
                    </div>
                    <Badge variant={lot.availableSlots > 0 ? "success" : "destructive"}>
                      {lot.availableSlots === 0 ? "Full" : `${lot.availableSlots} left`}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {lot.minHourlyRate && <span>From {formatCurrency(lot.minHourlyRate)}/hr</span>}
                    <span>{lot.distanceKm.toFixed(1)} km away</span>
                    {lot.etaMinutes != null && <span>{lot.etaMinutes} min drive</span>}
                  </div>
                  <Link
                    href={`/parking-lots/${lot.id}`}
                    className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                  >
                    View Details →
                  </Link>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="order-1 min-h-64 lg:order-2">
          <NearbyMap
            userPosition={
              geo.latitude !== null && geo.longitude !== null
                ? [geo.latitude, geo.longitude]
                : null
            }
            lots={lots ?? []}
            selectedLotId={selectedLotId}
            onSelectLot={setSelectedLotId}
            onLocateMe={geo.locate}
          />
        </div>
      </div>
    </div>
  );
}
