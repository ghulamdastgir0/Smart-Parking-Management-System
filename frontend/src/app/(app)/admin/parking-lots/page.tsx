"use client";

import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { useDeleteParkingLot, useParkingLots } from "@/features/parking-lots/hooks";
import type { ParkingLot } from "@/features/parking-lots/types";
import { formatCurrency } from "@/lib/format";

export default function AdminParkingLotsPage() {
  const { user } = useAuth();
  const { data: lots, isLoading, isError, error, refetch } = useParkingLots();
  const deleteLot = useDeleteParkingLot();
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<ParkingLot | null>(null);

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
        title="Manage Parking Lots"
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
          onChange={(e) => setSearch(e.target.value)}
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell className="font-medium">{lot.name}</TableCell>
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
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      render={<Link href={`/admin/parking-lots/${lot.id}/edit`} />}
                      nativeButton={false}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive"
                      onClick={() => setToDelete(lot)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Parking Lot?</DialogTitle>
            <DialogDescription>
              This will permanently remove &quot;{toDelete?.name}&quot; and all its slots. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteLot.isPending}
              onClick={() => {
                if (!toDelete) return;
                deleteLot.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
