"use client";

import { Eye, Ticket, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { ReservationStatusBadge } from "@/components/shared/status-badge";
import { useAuth } from "@/features/auth/auth-provider";
import { useParkingLots } from "@/features/parking-lots/hooks";
import { useCancelReservation, useReservationsByLot } from "@/features/reservations/hooks";
import type { Reservation } from "@/features/reservations/types";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  adminReservationsLotChanged,
  adminReservationsSearchChanged,
  adminReservationsStatusChanged,
} from "@/store/slices/filters-slice";
import { RESERVATION_STATUS_LABEL } from "@/types/enums";

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  ...Object.entries(RESERVATION_STATUS_LABEL).map(([value, label]) => ({ value, label })),
];

function CancelButton({ reservation }: { reservation: Reservation }) {
  const [open, setOpen] = useState(false);
  const cancelReservation = useCancelReservation(reservation.id);

  if (reservation.status !== "CONFIRMED") return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive"
        title="Cancel reservation"
        onClick={() => setOpen(true)}
      >
        <XCircle className="size-3.5" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Cancel this reservation?"
        description={
          <>
            Slot {reservation.slot.slotNumber} will be released and the customer notified. This
            cannot be undone.
          </>
        }
        cancelLabel="Keep Reservation"
        confirmLabel="Cancel Reservation"
        isPending={cancelReservation.isPending}
        onConfirm={() => cancelReservation.mutate(undefined, { onSuccess: () => setOpen(false) })}
      />
    </>
  );
}

export default function AdminReservationsPage() {
  const { user } = useAuth();
  const { data: lots, isLoading: lotsLoading } = useParkingLots();
  const dispatch = useAppDispatch();
  // lotId is always a defined string (never undefined) so Select stays controlled from the
  // first render — switching from uncontrolled to controlled mid-lifecycle triggers a Base
  // UI warning. The filters slice's initial state preserves that invariant.
  const { lotId, search, statusFilter } = useAppSelector(
    (state) => state.filters.adminReservations,
  );

  const scopedLots = useMemo(() => {
    if (!lots) return [];
    return user?.role === "MANAGER" ? lots.filter((l) => l.managerId === user.id) : lots;
  }, [lots, user]);

  const {
    data: reservations,
    isLoading,
    isError,
    error,
    refetch,
  } = useReservationsByLot(lotId);

  const filtered = useMemo(() => {
    if (!reservations) return [];
    const query = search.trim().toLowerCase();
    return reservations.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (query) {
        const name = `${r.user.firstName} ${r.user.lastName} ${r.user.email}`.toLowerCase();
        if (!name.includes(query)) return false;
      }
      return true;
    });
  }, [reservations, search, statusFilter]);

  return (
    <div>
      <PageHeader
        title="Reservations"
        description="Every reservation at a parking lot you manage"
      />

      <div className="mb-4 max-w-xs">
        {lotsLoading ? (
          <Skeleton className="h-9 w-full rounded-lg" />
        ) : (
          <Select
            value={lotId}
            onValueChange={(v) => dispatch(adminReservationsLotChanged(v ?? ""))}
            items={scopedLots.map((lot) => ({ value: lot.id, label: lot.name }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a parking lot" />
            </SelectTrigger>
            <SelectContent>
              {scopedLots.map((lot) => (
                <SelectItem key={lot.id} value={lot.id}>
                  {lot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!lotId ? (
        <EmptyState icon={Ticket} title="Select a parking lot to view its reservations" />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search by customer name or email…"
              value={search}
              onChange={(e) => dispatch(adminReservationsSearchChanged(e.target.value))}
              className="sm:max-w-xs"
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => dispatch(adminReservationsStatusChanged(v ?? "all"))}
              items={STATUS_FILTER_OPTIONS}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : isError ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Ticket} title="No reservations match your filters" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{formatDateTime(r.startTime)}</TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {r.user.firstName} {r.user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{r.user.email}</p>
                      </TableCell>
                      <TableCell>
                        {r.slot.slotNumber} · {r.slot.floor.name}
                      </TableCell>
                      <TableCell>
                        <ReservationStatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>
                        {r.payment ? formatCurrency(r.payment.amount) : formatCurrency(r.totalPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <CancelButton reservation={r} />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="View reservation"
                            render={<Link href={`/reservations/${r.id}`} />}
                            nativeButton={false}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
