"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

export function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const didFit = useRef(false);

  useEffect(() => {
    if (positions.length === 0 || didFit.current) return;
    if (positions.length === 1) {
      map.setView(positions[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
    }
    didFit.current = true;
  }, [positions, map]);

  return null;
}
