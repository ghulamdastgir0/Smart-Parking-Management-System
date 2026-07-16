"use client";

import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

export interface ClusterMarker {
  id: string;
  position: [number, number];
  icon: L.DivIcon;
  popupHtml?: string;
  onClick?: () => void;
}

export function MarkerClusterGroup({ markers }: { markers: ClusterMarker[] }) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    const group = L.markerClusterGroup({ maxClusterRadius: 50 });
    groupRef.current = group;
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();

    for (const marker of markers) {
      const leafletMarker = L.marker(marker.position, { icon: marker.icon });
      if (marker.onClick) leafletMarker.on("click", marker.onClick);
      if (marker.popupHtml) leafletMarker.bindPopup(marker.popupHtml);
      group.addLayer(leafletMarker);
    }
  }, [markers]);

  return null;
}
