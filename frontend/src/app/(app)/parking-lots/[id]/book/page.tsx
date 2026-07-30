"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Download } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useFloors, useParkingLot } from "@/features/parking-lots/hooks";
import { SlotGrid } from "@/features/parking-slots/components/slot-grid";
import { useFloorSlotsForWindow } from "@/features/parking-slots/hooks";
import type { ParkingSlot } from "@/features/parking-slots/types";
import { useCreateReservation } from "@/features/reservations/hooks";
import { estimateCost } from "@/lib/billing";
import { formatCurrency, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CreateReservationResponse } from "@/features/reservations/types";

const DURATION_PRESETS = [30, 60, 120, 180, 240, 360, 480, 720, 1440, 2880, 4320, 10080];

// Reservations can only be made for today or tomorrow — mirrors the backend's
// RESERVATION_MAX_ADVANCE_DAYS check in reservation.service.ts (default 2).
const MAX_ADVANCE_DAYS = 2;

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const detailsSchema = z
  .object({
    date: z.string().min(1, "Arrival date is required"),
    time: z.string().min(1, "Arrival time is required"),
    durationMinutes: z.number().min(15).max(10080),
  })
  .refine(
    (data) => {
      if (!data.date || !data.time) return true; // let the required checks above handle empties
      return new Date(`${data.date}T${data.time}`).getTime() >= Date.now();
    },
    { message: "Arrival time cannot be in the past.", path: ["time"] },
  )
  .refine(
    (data) => {
      if (!data.date) return true;
      const today = new Date();
      const minDate = dateInputValue(today);
      const maxDate = dateInputValue(
        new Date(today.getTime() + (MAX_ADVANCE_DAYS - 1) * 24 * 60 * 60 * 1000),
      );
      return data.date >= minDate && data.date <= maxDate;
    },
    { message: "Reservations can only be made for today or tomorrow.", path: ["date"] },
  );

type DetailsValues = z.infer<typeof detailsSchema>;

const STEPS = ["Details", "Select Slot", "Confirm"];

function Stepper({ step }: { step: number }) {
  return (
    <div className="mb-6 flex items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 items-center gap-2">
          <div
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
              i < step
                ? "bg-primary text-primary-foreground"
                : i === step
                  ? "bg-primary/15 text-primary ring-2 ring-primary"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {i < step ? <Check className="size-3.5" /> : i + 1}
          </div>
          <span
            className={cn(
              "hidden text-sm sm:inline",
              i === step ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
        </div>
      ))}
    </div>
  );
}

export default function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: lotId } = use(params);
  const { data: lot } = useParkingLot(lotId);
  const { data: floors, isLoading: floorsLoading } = useFloors(lotId);
  // Always a defined string so Tabs stays controlled from the first render.
  const [selectedFloorId, setSelectedFloorId] = useState("");

  useEffect(() => {
    if (floors && floors.length > 0 && !selectedFloorId) {
      setSelectedFloorId(floors[0].id);
    }
  }, [floors, selectedFloorId]);

  const createReservation = useCreateReservation();

  const [step, setStep] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [result, setResult] = useState<CreateReservationResponse | null>(null);

  const form = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { date: "", time: "", durationMinutes: 60 },
    mode: "onBlur",
  });

  const values = form.watch();
  const hourlyRate = Number(selectedSlot?.basePrice ?? 0);
  const estimatedTotal = estimateCost(hourlyRate, Number(values.durationMinutes) || 60);
  const arrivalDate =
    values.date && values.time ? new Date(`${values.date}T${values.time}`) : null;
  const expectedCheckout = arrivalDate
    ? new Date(arrivalDate.getTime() + (Number(values.durationMinutes) || 0) * 60_000)
    : null;
  const isPastArrival = arrivalDate ? arrivalDate.getTime() < Date.now() : false;

  const today = new Date();
  const minDate = dateInputValue(today);
  const maxDate = dateInputValue(
    new Date(today.getTime() + (MAX_ADVANCE_DAYS - 1) * 24 * 60 * 60 * 1000),
  );
  const isDateOutOfRange = Boolean(values.date) && (values.date < minDate || values.date > maxDate);

  const arrivalIso = arrivalDate && !isPastArrival && !isDateOutOfRange
    ? arrivalDate.toISOString()
    : undefined;

  const {
    data: slots,
    isLoading: slotsLoading,
    isError,
    error,
    refetch,
  } = useFloorSlotsForWindow(lotId, selectedFloorId, arrivalIso, values.durationMinutes);

  // The chosen slot only makes sense for the window it was picked under — if the operator
  // goes back and changes the date/time/duration or floor, the old pick may no longer be
  // available (or may not even exist on the new floor), so clear it.
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedFloorId, arrivalIso, values.durationMinutes]);

  function onSubmitDetails() {
    setStep(1);
  }

  function onConfirm() {
    if (!selectedSlot || !arrivalDate) return;
    createReservation.mutate(
      {
        slotId: selectedSlot.id,
        arrivalTime: arrivalDate.toISOString(),
        durationMinutes: Number(values.durationMinutes),
      },
      { onSuccess: (data) => setResult(data) },
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-md space-y-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15">
          <Check className="size-7 text-success" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-semibold">Reservation Confirmed!</h1>
          <p className="text-sm text-muted-foreground">
            Show this QR code at the entrance to check in.
          </p>
        </div>
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URI, not optimizable by next/image */}
          <img
            src={result.qrCodeImage}
            alt="Check-in QR code"
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-border"
            width={220}
            height={220}
          />
        </div>
        <Card>
          <CardContent className="space-y-2 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reservation ID</span>
              <span className="font-mono text-xs">{result.reservation.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parking Lot</span>
              <span>{lot?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slot</span>
              <span>
                {selectedSlot?.slotNumber} · {selectedSlot?.floor.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">{formatCurrency(result.reservation.totalPrice)}</span>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button
            className="flex-1"
            render={<Link href={`/reservations/${result.reservation.id}`} />}
            nativeButton={false}
          >
            View Reservation Details
          </Button>
          <Button
            variant="outline"
            size="icon"
            render={
              <a
                href={result.qrCodeImage}
                download={`reservation-${result.reservation.id}.png`}
              />
            }
            nativeButton={false}
          >
            <Download className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={`Book a slot${lot ? ` — ${lot.name}` : ""}`} />
      <Stepper step={step} />

      {step === 0 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitDetails)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Arrival date</FormLabel>
                          <FormControl>
                            <Input type="date" min={minDate} max={maxDate} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Arrival time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Expected duration</Label>
                    <Select
                      value={String(values.durationMinutes)}
                      onValueChange={(v) => form.setValue("durationMinutes", Number(v))}
                      items={DURATION_PRESETS.map((mins) => ({
                        value: String(mins),
                        label: formatDuration(mins),
                      }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_PRESETS.map((mins) => (
                          <SelectItem key={mins} value={String(mins)}>
                            {formatDuration(mins)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A 30-minute grace buffer is added after your expected checkout, and you must
                    check in within the check-in grace window or the reservation will be
                    auto-cancelled.
                  </p>
                  <div className="flex justify-end border-t border-border pt-4">
                    <Button type="submit">Continue</Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardContent className="space-y-3">
              <h2 className="font-heading font-medium">Booking Summary</h2>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parking Lot</span>
                  <span>{lot?.name}</span>
                </div>
                {expectedCheckout && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Checkout</span>
                    <span>{expectedCheckout.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 1 && (
        <Card>
          <CardContent className="space-y-4">
            {floorsLoading ? (
              <Skeleton className="h-8 w-full rounded-lg" />
            ) : floors && floors.length > 1 ? (
              <Tabs
                value={selectedFloorId}
                onValueChange={(v) => {
                  if (!v) return;
                  setSelectedFloorId(v);
                }}
              >
                <TabsList className="flex-wrap">
                  {floors.map((floor) => (
                    <TabsTrigger key={floor.id} value={floor.id}>
                      {floor.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            ) : null}
            {slotsLoading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : isError ? (
              <ErrorState error={error} onRetry={refetch} />
            ) : (
              <SlotGrid
                slots={slots ?? []}
                selectedSlotId={selectedSlot?.id}
                onSelectSlot={setSelectedSlot}
              />
            )}
            <div className="flex items-center justify-between border-t border-border pt-4">
              {selectedSlot ? (
                <div className="text-sm">
                  Slot <span className="font-medium">{selectedSlot.slotNumber}</span> ·{" "}
                  {selectedSlot.floor.name} · {selectedSlot.type} ·{" "}
                  {formatCurrency(selectedSlot.basePrice)}/hr
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select an available slot for your chosen time to continue
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button disabled={!selectedSlot} onClick={() => setStep(2)}>
                  Continue
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardContent className="space-y-4">
            <h2 className="font-heading font-medium">Confirm Reservation</h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parking Lot</span>
                <span>{lot?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slot</span>
                <span>
                  {selectedSlot?.slotNumber} · {selectedSlot?.floor.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Arrival</span>
                <span>{arrivalDate?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span>{formatDuration(Number(values.durationMinutes))}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-medium">
                <span>Estimated Total</span>
                <span>{formatCurrency(estimatedTotal)}</span>
              </div>
            </div>
            <div className="flex justify-between border-t border-border pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={onConfirm} disabled={createReservation.isPending}>
                {createReservation.isPending ? "Confirming…" : "Confirm Reservation"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
