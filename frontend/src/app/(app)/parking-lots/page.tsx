"use client";

import { Building2, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useParkingLots } from "@/features/parking-lots/hooks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatCurrency } from "@/lib/format";

const PAGE_SIZE = 9;

type SortKey = "name" | "price" | "availability";

export default function ParkingLotsPage() {
  const { data: lots, isLoading, isError, error, refetch } = useParkingLots();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [sort, setSort] = useState<SortKey>("name");
  const [page, setPage] = useState(1);

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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={sort} onValueChange={(v) => v && setSort(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="price">Price (lowest)</SelectItem>
            <SelectItem value="availability">Availability</SelectItem>
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
          action={{ label: "Clear search", onClick: () => setSearch("") }}
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
                onClick={() => setPage((p) => p - 1)}
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
                onClick={() => setPage((p) => p + 1)}
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
