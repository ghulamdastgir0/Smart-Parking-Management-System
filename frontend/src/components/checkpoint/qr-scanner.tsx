"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useId, useRef } from "react";

export function QrScanner({
  active,
  onScan,
}: {
  active: boolean;
  onScan: (decodedText: string) => void;
}) {
  const elementId = useId().replace(/:/g, "");
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!active) return;

    const scanner = new Html5Qrcode(elementId);
    let cancelled = false;
    let isRunning = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          if (cancelled) return;
          onScanRef.current(decodedText);
        },
        undefined,
      )
      .then(() => {
        if (cancelled) {
          // Unmounted while start() was still resolving — stop immediately instead of
          // leaving the camera running.
          scanner.stop().catch(() => undefined).finally(() => scanner.clear());
          return;
        }
        isRunning = true;
      })
      .catch(() => {
        // Camera unavailable/denied — the manual token entry fallback still works.
      });

    return () => {
      cancelled = true;
      // Html5Qrcode.stop() throws synchronously (not a rejected promise) if the scanner
      // never reached the running state, so only call it once start() has confirmed.
      if (isRunning) {
        scanner
          .stop()
          .catch(() => undefined)
          .finally(() => scanner.clear());
      }
    };
  }, [active, elementId]);

  return (
    <div className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-black">
      <div id={elementId} className="h-full w-full" />
    </div>
  );
}
