"use client";

import { CheckCircle2, Loader2, LogIn, LogOut, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { QrScanner } from "@/components/checkpoint/qr-scanner";
import { useCheckIn, useCheckOut } from "@/features/checkpoint/hooks";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatCurrency } from "@/lib/format";

type Mode = "check-in" | "check-out";
type Result =
  | {
      kind: "success";
      mode: Mode;
      lotName: string;
      slotNumber: string;
      floorName: string;
      message: string;
      extra?: string;
    }
  | {
      kind: "declined";
      lotName: string;
      slotNumber: string;
      floorName: string;
      message: string;
      amount: string;
    }
  | { kind: "error"; message: string };

export default function CheckpointPage() {
  const [mode, setMode] = useState<Mode>("check-in");
  const [manualToken, setManualToken] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  function handleScan(token: string) {
    if (checkIn.isPending || checkOut.isPending || result) return;

    if (mode === "check-in") {
      checkIn.mutate(
        { token },
        {
          onSuccess: (data) =>
            setResult({
              kind: "success",
              mode,
              lotName: data.reservation.lot.name,
              slotNumber: data.reservation.slot.slotNumber,
              floorName: data.reservation.slot.floor.name,
              message: "Checked in successfully",
            }),
          onError: (error) => setResult({ kind: "error", message: getApiErrorMessage(error) }),
        },
      );
    } else {
      checkOut.mutate(
        { token },
        {
          onSuccess: (data) =>
            setResult(
              data.paymentFailed
                ? {
                    kind: "declined",
                    lotName: data.reservation.lot.name,
                    slotNumber: data.reservation.slot.slotNumber,
                    floorName: data.reservation.slot.floor.name,
                    message: data.message,
                    amount: data.payment.amount,
                  }
                : {
                    kind: "success",
                    mode,
                    lotName: data.reservation.lot.name,
                    slotNumber: data.reservation.slot.slotNumber,
                    floorName: data.reservation.slot.floor.name,
                    message: "Checkout complete",
                    extra: `Charged: ${formatCurrency(data.payment.amount)}`,
                  },
            ),
          onError: (error) => setResult({ kind: "error", message: getApiErrorMessage(error) }),
        },
      );
    }
  }

  function reset() {
    setResult(null);
    setManualToken("");
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Checkpoint Scanner" description="Scan a reservation QR code" />

      <Tabs value={mode} onValueChange={(v) => v && setMode(v as Mode)} className="mb-4">
        <TabsList className="w-full">
          <TabsTrigger value="check-in" className="flex-1">
            <LogIn className="size-4" /> Check In
          </TabsTrigger>
          <TabsTrigger value="check-out" className="flex-1">
            <LogOut className="size-4" /> Check Out
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className={result || checkOut.isPending ? "hidden" : undefined}>
        <QrScanner active={!result} onScan={handleScan} />
        <div className="mt-4 space-y-2">
          <p className="text-center text-sm text-muted-foreground">
            Or enter the code manually — a USB QR scanner types the code here and presses Enter
            automatically
          </p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (manualToken) handleScan(manualToken);
            }}
          >
            <Input
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Reservation token"
              autoFocus
            />
            <Button
              type="submit"
              disabled={!manualToken || checkIn.isPending || checkOut.isPending}
            >
              Submit
            </Button>
          </form>
        </div>
      </div>

      {checkOut.isPending && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="font-medium">Make payment…</p>
            <p className="text-sm text-muted-foreground">
              Charging the customer&apos;s card on file
            </p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card
          className={
            result.kind === "success" ? "border-success/40" : "border-destructive/40"
          }
        >
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            {result.kind === "success" ? (
              <CheckCircle2 className="size-10 text-success" />
            ) : (
              <XCircle className="size-10 text-destructive" />
            )}
            <div>
              <p className="font-medium">{result.message}</p>
              {result.kind === "success" && (
                <p className="text-sm text-muted-foreground">
                  {result.lotName} · Slot {result.slotNumber} · {result.floorName} is now{" "}
                  {result.mode === "check-in" ? "Occupied" : "Available"}
                </p>
              )}
              {result.kind === "success" && result.extra && (
                <p className="mt-1 text-sm font-medium">{result.extra}</p>
              )}
              {result.kind === "declined" && (
                <p className="text-sm text-muted-foreground">
                  {result.lotName} · Slot {result.slotNumber} · {result.floorName} — attempted
                  charge {formatCurrency(result.amount)}
                </p>
              )}
            </div>
            <Button onClick={reset}>Scan Another</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
