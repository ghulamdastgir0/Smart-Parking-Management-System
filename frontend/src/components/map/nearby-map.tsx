"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Crosshair } from "lucide-react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { Button } from "@/components/ui/button";
import type { NearbyParkingLot } from "@/features/parking-lots/types";
import { formatCurrency } from "@/lib/format";
import { FitBounds } from "./fit-bounds";
import { availabilityTone, lotMarkerIcon, userLocationIcon } from "./leaflet-icons";
import { MarkerClusterGroup, type ClusterMarker } from "./marker-cluster-group";

export function NearbyMap({
  userPosition,
  lots,
  selectedLotId,
  onSelectLot,
  onLocateMe,
}: {
  userPosition: [number, number] | null;
  lots: NearbyParkingLot[];
  selectedLotId: string | null;
  onSelectLot: (id: string) => void;
  onLocateMe: () => void;
}) {
  const positions: [number, number][] = [
    ...(userPosition ? [userPosition] : []),
    ...lots.map((lot): [number, number] => [lot.latitude, lot.longitude]),
  ];

  const markers: ClusterMarker[] = lots.map((lot) => ({
    id: lot.id,
    position: [lot.latitude, lot.longitude],
    icon: lotMarkerIcon(availabilityTone(lot.availableSlots), lot.id === selectedLotId),
    onClick: () => onSelectLot(lot.id),
    popupHtml: `
      <div style="min-width:180px">
        <p style="font-weight:600;margin-bottom:2px">${lot.name}</p>
        <p style="font-size:12px;color:#6b7280;margin-bottom:6px">${lot.address}</p>
        <p style="font-size:12px;margin-bottom:2px">${lot.availableSlots} slots available</p>
        ${lot.minHourlyRate ? `<p style="font-size:12px;margin-bottom:6px">From ${formatCurrency(lot.minHourlyRate)}/hr</p>` : ""}
        <a href="/parking-lots/${lot.id}" style="font-size:12px;font-weight:600;color:#2563eb">View Details →</a>
      </div>
    `,
  }));

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl ring-1 ring-border">
      <MapContainer
        center={userPosition ?? [37.7749, -122.4194]}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {userPosition && <Marker position={userPosition} icon={userLocationIcon()} />}
        <MarkerClusterGroup markers={markers} />
        <FitBounds positions={positions} />
      </MapContainer>
      <Button
        size="icon"
        variant="secondary"
        onClick={onLocateMe}
        className="absolute bottom-4 right-4 z-[1000] size-11 rounded-full bg-background/80 shadow-lg backdrop-blur"
        aria-label="Locate me"
      >
        <Crosshair className="size-5" />
      </Button>
    </div>
  );
}
