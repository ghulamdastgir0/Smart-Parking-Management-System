"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { searchAddress, type GeocodeResult } from "@/lib/geocode";
import { lotMarkerIcon } from "./leaflet-icons";

function ClickToPlace({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPlace(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterOnChange({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position[0], position[1]]);
  return null;
}

export function LocationPickerMap({
  position,
  onChange,
}: {
  position: [number, number];
  onChange: (lat: number, lng: number) => void;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 400);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    searchAddress(debouncedQuery)
      .then((r) => {
        if (!cancelled) setResults(r);
      })
      .finally(() => !cancelled && setSearching(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl ring-1 ring-border">
      <div className="absolute left-3 right-3 top-3 z-[1000]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            placeholder="Search for a location…"
            className="border-0 bg-background/90 pl-9 shadow-lg backdrop-blur"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        {showResults && results.length > 0 && (
          <div className="mt-1 max-h-56 overflow-y-auto rounded-lg bg-background/95 shadow-lg backdrop-blur">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onChange(r.latitude, r.longitude);
                  setQuery(r.displayName);
                  setShowResults(false);
                }}
              >
                {r.displayName}
              </button>
            ))}
          </div>
        )}
      </div>
      <MapContainer center={position} zoom={15} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={position}
          icon={lotMarkerIcon("available", true)}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target as L.Marker;
              const { lat, lng } = marker.getLatLng();
              onChange(lat, lng);
            },
          }}
        />
        <ClickToPlace onPlace={onChange} />
        <RecenterOnChange position={position} />
      </MapContainer>
    </div>
  );
}
