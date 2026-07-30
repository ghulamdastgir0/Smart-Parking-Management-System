"use client";

import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
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
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/auth-provider";
import { useParkingLots } from "@/features/parking-lots/hooks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatCurrency } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  adminParkingLotsSearchChanged,
  parkingLotsPageChanged,
  parkingLotsSearchChanged,
  parkingLotsSortChanged,
  type ParkingLotsSortKey,
} from "@/store/slices/filters-slice";

const PAGE_SIZE = 9;

const SORT_OPTIONS: { value: ParkingLotsSortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "price", label: "Price (lowest)" },
  { value: "availability", label: "Availability" },
];

export default function ParkingLotsPage() {
  const { user } = useAuth();
  const isStaff = user?.role === "ADMIN" || user?.role === "MANAGER";
  return isStaff ? <StaffParkingLotsView /> : <CustomerParkingLotsView />;
}

// Browsing (search/sort/paginate a card grid) makes sense for a customer picking a lot to
// book; a dense management table with edit/delete actions makes sense for staff — different
// audiences need genuinely different layouts, so both live under this one route/nav entry
// instead of a forced one-size-fits-all view.
function CustomerParkingLotsView() {
  const { data: lots, isLoading, isError, error, refetch } = useParkingLots();
  const dispatch = useAppDispatch();
  const { search, sort, page } = useAppSelector((state) => state.filters.parkingLots);
  const debouncedSearch = useDebouncedValue(search, 300);

  const filtered = useMemo(() => {
    if (!lots) return [];
    const query = debouncedSearch.trim().toLowerCase();
    const result = query
      ? lots.filter(
          (lot) =>
            lot.name.toLowerCase().includes(query) ||
            lot.address.toLowerCase().includes(query),
        )
      : [...lots];

    result.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "price")
        return Number(a.minHourlyRate ?? Infinity) - Number(b.minHourlyRate ?? Infinity);
      return b.availableSlots - a.availableSlots;
    });
    return result;
  }, [lots, debouncedSearch, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader title="Parking Lots" description="Browse all available parking lots" />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or address…"
            className="pl-9"
            value={search}
            onChange={(e) => dispatch(parkingLotsSearchChanged(e.target.value))}
          />
        </div>
        <Select
          value={sort}
          onValueChange={(v) => v && dispatch(parkingLotsSortChanged(v as ParkingLotsSortKey))}
          items={SORT_OPTIONS}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No parking lots match your search"
          description="Try a different search term."
          action={{
            label: "Clear search",
            onClick: () => dispatch(parkingLotsSearchChanged("")),
          }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paged.map((lot) => {
              const total = lot.totalSlots;
              const pct = total > 0 ? Math.round((lot.availableSlots / total) * 100) : 0;
              return (
                <Card key={lot.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-heading font-medium">{lot.name}</p>
                        <p className="text-xs text-muted-foreground">{lot.address}</p>
                      </div>
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Building2 className="size-4 text-primary" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{lot.availableSlots}/{total} available</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-success"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    {lot.minHourlyRate && (
                      <p className="text-sm text-muted-foreground">
                        From <span className="font-medium text-foreground">{formatCurrency(lot.minHourlyRate)}</span>/hr
                      </p>
                    )}
                    <Button
                      variant="outline"
                      className="mt-auto"
                      render={<Link href={`/parking-lots/${lot.id}`} />}
                      nativeButton={false}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => dispatch(parkingLotsPageChanged(page - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => dispatch(parkingLotsPageChanged(page + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StaffParkingLotsView() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: lots, isLoading, isError, error, refetch } = useParkingLots();
  const dispatch = useAppDispatch();
  const search = useAppSelector((state) => state.filters.adminParkingLots.search);

  const visible = useMemo(() => {
    if (!lots) return [];
    const scoped = user?.role === "MANAGER" ? lots.filter((l) => l.managerId === user.id) : lots;
    const query = search.trim().toLowerCase();
    return query
      ? scoped.filter(
          (l) =>
            l.name.toLowerCase().includes(query) || l.address.toLowerCase().includes(query),
        )
      : scoped;
  }, [lots, search, user]);

  return (
    <div>
      <PageHeader
        title="Parking Lots"
        description="Create, edit, and monitor your parking lots"
        actions={
          <Button render={<Link href="/admin/parking-lots/new" />} nativeButton={false}>
            <Plus className="size-4" /> Add Parking Lot
          </Button>
        }
      />

      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search lots…"
          className="pl-9"
          value={search}
          onChange={(e) => dispatch(adminParkingLotsSearchChanged(e.target.value))}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No parking lots yet"
          description="Create your first parking lot to get started."
          action={{ label: "Add Parking Lot", render: <Link href="/admin/parking-lots/new" /> }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((lot) => (
                <TableRow
                  key={lot.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/parking-lots/${lot.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {lot.name}
                      {!lot.isActive && <Badge variant="destructive">Inactive</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {lot.address}
                  </TableCell>
                  <TableCell>{lot.totalSlots} slots</TableCell>
                  <TableCell>
                    <Badge variant={lot.availableSlots > 0 ? "success" : "destructive"}>
                      {lot.availableSlots}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lot.minHourlyRate ? formatCurrency(lot.minHourlyRate) : "—"}
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
