"use client";

import { Building2, DollarSign, Layers, ParkingSquare, Pencil, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/auth-provider";
import { useDeleteParkingLot, useFloors, useParkingLot } from "@/features/parking-lots/hooks";
import { SlotGrid } from "@/features/parking-slots/components/slot-grid";
import { useBulkUpdateSlotStatus, useFloorSlots } from "@/features/parking-slots/hooks";
import type { ParkingSlot } from "@/features/parking-slots/types";
import { formatCurrency } from "@/lib/format";

const LotLocationMap = dynamic(
  () => import("@/components/map/lot-location-map").then((m) => m.LotLocationMap),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl" /> },
);

function BulkRestrictDialog({
  count,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Restrict {count} slot{count === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            These slots will be excluded from booking until unrestricted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="bulk-restriction-reason">Reason (optional)</Label>
          <Textarea
            id="bulk-restriction-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Under construction until further notice"
            maxLength={255}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => onConfirm(reason)}
          >
            Restrict {count} slot{count === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ParkingLotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const isStaff = user?.role === "ADMIN" || user?.role === "MANAGER";
  const { data: lot, isLoading, isError, error, refetch } = useParkingLot(id);
  const { data: floors, isLoading: floorsLoading } = useFloors(id);
  // Always a defined string (never undefined/null) so the Tabs component stays
  // controlled from the very first render — switching from uncontrolled to controlled
  // mid-lifecycle is what Base UI's Tabs warns about.
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const bulkUpdateSlotStatus = useBulkUpdateSlotStatus();
  const deleteLot = useDeleteParkingLot();

  useEffect(() => {
    if (floors && floors.length > 0 && !selectedFloorId) {
      // Deliberate: pick the default floor once the list loads, not derivable during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFloorId(floors[0].id);
    }
  }, [floors, selectedFloorId]);

  const { data: slots, isLoading: slotsLoading } = useFloorSlots(id, selectedFloorId);
  const selectedFloor = floors?.find((f) => f.id === selectedFloorId);

  function toggleSlotSelection(slot: ParkingSlot) {
    setSelectedSlotIds((prev) => {
      const next = new Set(prev);
      if (next.has(slot.id)) next.delete(slot.id);
      else next.add(slot.id);
      return next;
    });
  }

  const selectedSlots = (slots ?? []).filter((s) => selectedSlotIds.has(s.id));
  const allSelectedRestricted =
    selectedSlots.length > 0 && selectedSlots.every((s) => s.status === "MAINTENANCE");

  function clearSelection() {
    setSelectedSlotIds(new Set());
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !lot) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={lot.name}
        description={lot.address}
        actions={
          <div className="flex items-center gap-2">
            {!lot.isActive && <Badge variant="destructive">Inactive</Badge>}
            {isStaff && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/admin/parking-lots/${id}/edit`} />}
                  nativeButton={false}
                >
                  <Pencil className="size-3.5" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="size-3.5" /> Delete
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
                <ParkingSquare className="size-4 text-primary" />
                <p className="text-lg font-semibold">{lot.totalSlots}</p>
                <p className="text-[11px] text-muted-foreground">Total Slots</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
                <Building2 className="size-4 text-success" />
                <p className="text-lg font-semibold">{lot.availableSlots}</p>
                <p className="text-[11px] text-muted-foreground">Available Now</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
                <DollarSign className="size-4 text-primary" />
                <p className="text-lg font-semibold">
                  {lot.minHourlyRate ? formatCurrency(lot.minHourlyRate) : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">From / hr</p>
              </CardContent>
            </Card>
          </div>
          <div className="h-64">
            <LotLocationMap latitude={lot.latitude} longitude={lot.longitude} />
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-medium">Parking Layout</h2>
              {selectedFloor && (
                <Badge variant="secondary">
                  <Layers className="size-3" /> {selectedFloor.availableSlots}/
                  {selectedFloor.totalSlots} available
                </Badge>
              )}
            </div>

            {floorsLoading ? (
              <Skeleton className="h-8 w-full rounded-lg" />
            ) : floors && floors.length > 0 ? (
              <Tabs
                value={selectedFloorId}
                onValueChange={(v) => {
                  if (!v) return;
                  setSelectedFloorId(v);
                  clearSelection();
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
            ) : isStaff ? (
              <SlotGrid
                slots={slots ?? []}
                variant="manage"
                selectedSlotIds={selectedSlotIds}
                onToggleSelect={toggleSlotSelection}
              />
            ) : (
              <SlotGrid slots={slots ?? []} />
            )}

            {isStaff && selectedSlotIds.size > 0 ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-sm font-medium">
                  {selectedSlotIds.size} slot{selectedSlotIds.size === 1 ? "" : "s"} selected
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                  {allSelectedRestricted ? (
                    <Button
                      size="sm"
                      disabled={bulkUpdateSlotStatus.isPending}
                      onClick={() =>
                        bulkUpdateSlotStatus.mutate(
                          { slotIds: Array.from(selectedSlotIds), status: "AVAILABLE" },
                          { onSuccess: clearSelection },
                        )
                      }
                    >
                      Make Available
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setBulkDialogOpen(true)}
                    >
                      Restrict Selected
                    </Button>
                  )}
                </div>
              </div>
            ) : isStaff ? (
              <p className="text-xs text-muted-foreground">
                Select one or more available/restricted slots to restrict or unrestrict them
                together — e.g. for construction.
              </p>
            ) : (
              <Button
                className="w-full"
                disabled={lot.availableSlots === 0}
                render={<Link href={`/parking-lots/${id}/book`} />}
                nativeButton={false}
              >
                {lot.availableSlots === 0 ? "No Slots Available" : "Reserve a Slot"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <BulkRestrictDialog
        count={selectedSlotIds.size}
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        isPending={bulkUpdateSlotStatus.isPending}
        onConfirm={(reason) =>
          bulkUpdateSlotStatus.mutate(
            {
              slotIds: Array.from(selectedSlotIds),
              status: "MAINTENANCE",
              reason: reason || undefined,
            },
            {
              onSuccess: () => {
                setBulkDialogOpen(false);
                clearSelection();
              },
            },
          )
        }
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Parking Lot?"
        description={
          <>
            This will permanently remove &quot;{lot.name}&quot; and all its slots. This
            cannot be undone.
          </>
        }
        confirmLabel="Delete"
        isPending={deleteLot.isPending}
        onConfirm={() =>
          deleteLot.mutate(id, { onSuccess: () => router.push("/parking-lots") })
        }
      />
    </div>
  );
}
