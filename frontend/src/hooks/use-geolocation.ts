"use client";

import { useCallback, useState } from "react";

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    status: "idle",
    error: null,
  });

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, status: "error", error: "Geolocation is not supported by this browser." }));
      return;
    }
    setState((s) => ({ ...s, status: "loading", error: null }));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          status: "success",
          error: null,
        });
      },
      (error) => {
        setState((s) => ({
          ...s,
          status: "error",
          error:
            error.code === error.PERMISSION_DENIED
              ? "Location permission denied. Enable it to find nearby parking."
              : "Could not determine your location.",
        }));
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  return { ...state, locate };
}
