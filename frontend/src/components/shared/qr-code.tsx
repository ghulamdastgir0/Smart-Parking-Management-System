"use client";

import { useId, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QrCode({
  value,
  size = 200,
  className,
  downloadable = false,
  fileName = "qr-code",
}: {
  value: string;
  size?: number;
  className?: string;
  downloadable?: boolean;
  fileName?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  function handleDownload() {
    const svg = wrapperRef.current?.querySelector("svg");
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={wrapperRef}
        className={cn(
          "inline-flex items-center justify-center rounded-xl bg-white p-4 shadow-sm ring-1 ring-border",
          className,
        )}
      >
        <QRCodeSVG
          value={value}
          size={size}
          level="M"
          marginSize={0}
          aria-labelledby={titleId}
          title={fileName}
        />
      </div>
      {downloadable && (
        <Button variant="ghost" size="sm" onClick={handleDownload}>
          <Download className="size-3.5" /> Download QR
        </Button>
      )}
    </div>
  );
}
