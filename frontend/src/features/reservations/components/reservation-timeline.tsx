import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import type { Reservation } from "../types";

export function ReservationTimeline({ reservation }: { reservation: Reservation }) {
  const steps = [
    { label: "Reservation Created", at: reservation.createdAt, done: true },
    { label: "Checked In", at: reservation.checkedInAt, done: Boolean(reservation.checkedInAt) },
    {
      label: "Checkout Initiated",
      at: reservation.checkedOutAt,
      done: Boolean(reservation.checkedOutAt),
    },
    {
      label: "Payment Confirmed",
      at: reservation.payment?.paidAt ?? null,
      done: reservation.payment?.status === "SUCCESSFUL",
    },
  ];

  return (
    <ol className="space-y-0">
      {steps.map((step, i) => (
        <li key={step.label} className="relative flex gap-3 pb-6 last:pb-0">
          {i < steps.length - 1 && (
            <span
              className={cn(
                "absolute left-[11px] top-6 h-full w-px",
                step.done ? "bg-primary" : "bg-border",
              )}
            />
          )}
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full",
              step.done
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground ring-1 ring-border",
            )}
          >
            {step.done && <Check className="size-3.5" />}
          </span>
          <div>
            <p className={cn("text-sm font-medium", !step.done && "text-muted-foreground")}>
              {step.label}
            </p>
            {step.at && (
              <p className="text-xs text-muted-foreground">{formatDateTime(step.at)}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
