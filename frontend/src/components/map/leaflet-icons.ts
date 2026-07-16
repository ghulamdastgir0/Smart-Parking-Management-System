import L from "leaflet";

export type AvailabilityTone = "available" | "low" | "full";

const TONE_COLOR: Record<AvailabilityTone, string> = {
  available: "#16a34a",
  low: "#d97706",
  full: "#dc2626",
};

export function availabilityTone(availableSlots: number, totalSlots?: number): AvailabilityTone {
  if (availableSlots <= 0) return "full";
  if (totalSlots && availableSlots / totalSlots < 0.15) return "low";
  if (!totalSlots && availableSlots <= 3) return "low";
  return "available";
}

export function lotMarkerIcon(tone: AvailabilityTone, selected = false): L.DivIcon {
  const color = TONE_COLOR[tone];
  const size = selected ? 40 : 32;
  return L.divIcon({
    className: "spms-marker",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${color};border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:${selected ? 18 : 14}px;
    ">P</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function userLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: "spms-user-marker",
    html: `<span class="spms-pulse">
      <span class="spms-pulse-dot"></span>
    </span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}
