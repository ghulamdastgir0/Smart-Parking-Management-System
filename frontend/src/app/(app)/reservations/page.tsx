"use client";

import { Ticket } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { ReservationStatusBadge } from "@/components/shared/status-badge";
import { ParkingLotName } from "@/features/parking-lots/components/parking-lot-name";
import { useParkingLots } from "@/features/parking-lots/hooks";
import { useMyReservations } from "@/features/reservations/hooks";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { ReservationStatus } from "@/types/enums";

const ACTIVE_STATUSES: ReservationStatus[] = [
  "CONFIRMED",
  "CHECKED_IN",
  "OVERTIME",
  "PENDING_PAYMENT",
];
const HISTORY_STATUSES: ReservationStatus[] = ["COMPLETED", "CANCELLED"];

export default function MyReservationsPage() {
  const { data: reservations, isLoading, isError, error, refetch } = useMyReservations();
  const { data: lots } = useParkingLots();
  const [tab, setTab] = useState<"active" | "history">("active");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const lotNameById = useMemo(
    () => new Map(lots?.map((lot) => [lot.id, lot.name]) ?? []),
    [lots],
  );

  const filtered = useMemo(() => {
    if (!reservations) return [];
    const statuses = tab === "active" ? ACTIVE_STATUSES : HISTORY_STATUSES;
    const query = search.trim().toLowerCase();
    return reservations.filter((r) => {
      if (!statuses.includes(r.status)) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (query) {
        const lotName = lotNameById.get(r.lotId)?.toLowerCase() ?? "";
        if (!lotName.includes(query)) return false;
      }
      return true;
    });
  }, [reservations, tab, statusFilter, search, lotNameById]);

  return (
    <div>
      <PageHeader title="My Reservations" description="Manage your active and past bookings" />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as "active" | "history");
          setStatusFilter("all");
        }}
      >
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="my-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search by parking lot name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(tab === "active" ? ACTIVE_STATUSES : HISTORY_STATUSES).map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title={tab === "active" ? "No active reservations" : "No reservation history yet"}
          description={
            tab === "active" ? "Book a parking slot to see it here." : undefined
          }
          action={
            tab === "active"
              ? { label: "Browse Parking Lots", render: <Link href="/parking-lots" /> }
              : undefined
          }
        />
      ) : tab === "active" ? (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <ReservationStatusBadge status={r.status} />
                    <span className="text-xs text-muted-foreground">
                      <ParkingLotName lotId={r.lotId} />
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(r.startTime)} → {formatDateTime(r.endTime)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/reservations/${r.id}`} />}
                  nativeButton={false}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Parking Lot</TableHead>
                <TableHead>Total Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDateTime(r.startTime)}</TableCell>
                  <TableCell>
                    <ParkingLotName lotId={r.lotId} />
                  </TableCell>
                  <TableCell>
                    {r.payment ? formatCurrency(r.payment.amount) : formatCurrency(r.totalPrice)}
                  </TableCell>
                  <TableCell>
                    <ReservationStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/reservations/${r.id}`} />}
                      nativeButton={false}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
