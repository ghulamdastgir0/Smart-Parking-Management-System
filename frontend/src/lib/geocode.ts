export interface GeocodeResult {
  displayName: string;
  latitude: number;
  longitude: number;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `${NOMINATIM_BASE}/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) return [];
  const data: { display_name: string; lat: string; lon: string }[] = await res.json();
  return data.map((item) => ({
    displayName: item.display_name,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
  }));
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const res = await fetch(
    `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) return null;
  const data: { display_name?: string } = await res.json();
  return data.display_name ?? null;
}
