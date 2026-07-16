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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!active) return;

    const scanner = new Html5Qrcode(elementId);
    scannerRef.current = scanner;
    let cancelled = false;

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
      .catch(() => {
        // Camera unavailable/denied — the manual token entry fallback still works.
      });

    return () => {
      cancelled = true;
      scanner
        .stop()
        .catch(() => undefined)
        .finally(() => scanner.clear());
      scannerRef.current = null;
    };
  }, [active, elementId]);

  return (
    <div className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-black">
      <div id={elementId} className="h-full w-full" />
    </div>
  );
}
