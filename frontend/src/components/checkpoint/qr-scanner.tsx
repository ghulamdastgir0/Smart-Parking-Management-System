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
  // Serializes every start()/stop() call on this container. React's dev-mode
  // double-invoked effects (mount -> cleanup -> mount, run back-to-back without
  // awaiting the async cleanup) would otherwise let a second Html5Qrcode instance
  // call start() on the same element before the first instance finished tearing
  // down, and the second instance's DOM setup rips the first instance's still-
  // initializing <video> out from under its pending play() call.
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    queueRef.current = queueRef.current.then(async () => {
      if (cancelled) return;
      scanner = new Html5Qrcode(elementId);
      try {
        await scanner.start(
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
        );
      } catch {
        // Camera unavailable/denied — the manual token entry fallback still works.
      }
    });

    return () => {
      cancelled = true;
      queueRef.current = queueRef.current.then(() => (scanner ? stopAndClear(scanner) : undefined));
    };
  }, [active, elementId]);

  return (
    <div className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-black">
      <div id={elementId} className="h-full w-full" />
    </div>
  );
}
