"use client";

import { Html5Qrcode } from "html5-qrcode";
import { CameraOff } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof Error ? err.name : undefined;
  if (name === "NotAllowedError") {
    return "Camera access was denied. Enable camera permission, or use manual entry below.";
  }
  if (name === "NotFoundError") {
    return "No camera was found on this device. Use manual entry below.";
  }
  return "Camera unavailable. Use manual entry below.";
}

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
  const [cameraError, setCameraError] = useState<string | null>(null);
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
      setCameraError(null);
      scanner = new Html5Qrcode(elementId);
      const activeScanner = scanner;
      try {
        await activeScanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              // Scale the scan target to the actual camera viewfinder instead of a fixed
              // pixel size, so it fits properly regardless of the device's camera resolution.
              // Capped so it stays close to a real QR code's footprint in frame rather than
              // ballooning to nearly the whole viewfinder on larger screens/camera feeds.
              const size = Math.min(
                Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.5),
                250,
              );
              return { width: size, height: size };
            },
          },
          (decodedText) => {
            if (cancelled) return;
            onScanRef.current(decodedText);
          },
          undefined,
        );
        // Devices without a rear camera silently fall back to the front one, whose live
        // preview browsers show mirrored (selfie-style) — flip it back so the operator sees
        // a normal, non-mirrored view while aiming at a code. A true "environment" camera is
        // never mirrored, so this only ever applies to that fallback.
        if (!cancelled) {
          const isFrontFacing = activeScanner.getRunningTrackSettings().facingMode === "user";
          const videoEl = document.getElementById(elementId)?.querySelector("video");
          if (videoEl) {
            videoEl.style.transform = isFrontFacing ? "scaleX(-1)" : "";
          }
        }
      } catch (err) {
        // Camera unavailable/denied — the manual token entry fallback still works.
        if (!cancelled) setCameraError(cameraErrorMessage(err));
      }
    });

    return () => {
      cancelled = true;
      queueRef.current = queueRef.current.then(() => (scanner ? stopAndClear(scanner) : undefined));
    };
  }, [active, elementId]);

  return (
    <div className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-black">
      {cameraError ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
          <CameraOff className="size-8 text-white/60" />
          <p className="text-sm text-white/80">{cameraError}</p>
        </div>
      ) : (
        <div id={elementId} className="h-full w-full" />
      )}
    </div>
  );
}
