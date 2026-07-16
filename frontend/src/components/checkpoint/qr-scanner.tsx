"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useId, useRef } from "react";

async function stopAndClear(scanner: Html5Qrcode) {
  try {
    await scanner.stop();
  } catch {
    // Already stopped/never started — nothing to tear down.
  }
  try {
    // clear() is synchronous and throws if a scan session is still transitioning; it's
    // only cosmetic DOM cleanup at this point, so a failure here is safe to ignore.
    scanner.clear();
  } catch {
    // ignore
  }
}

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

    let cancelled = false;
    const scanner = new Html5Qrcode(elementId);

    // Chaining the teardown onto the start promise (rather than firing it independently)
    // guarantees stop()/clear() never run concurrently with a start() still in flight —
    // the race that caused "Cannot clear while scan is ongoing" and a stray AbortError on
    // the underlying <video> element under React's dev-mode double-invoked effects.
    const startPromise = scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Scale the scan target to the actual camera viewfinder instead of a fixed
            // pixel size, so it fits properly regardless of the device's camera resolution.
            const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7);
            return { width: size, height: size };
          },
        },
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
      void startPromise.finally(() => stopAndClear(scanner));
    };
  }, [active, elementId]);

  return (
    <div className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-black">
      <div id={elementId} className="h-full w-full" />
    </div>
  );
}
