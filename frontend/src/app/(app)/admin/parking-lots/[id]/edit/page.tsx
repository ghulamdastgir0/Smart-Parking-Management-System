"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/auth-provider";
import {
  useCreateFloor,
  useDeleteFloor,
  useFloors,
  useParkingLot,
  useUpdateFloor,
  useUpdateParkingLot,
} from "@/features/parking-lots/hooks";
import type { ParkingFloor } from "@/features/parking-lots/types";
import {
  editFloorSchema,
  floorSchema,
  type EditFloorFormValues,
  type FloorFormValues,
} from "@/features/parking-lots/schemas";
import { useAdminUsers } from "@/features/users/hooks";
import { reverseGeocode } from "@/lib/geocode";

function AddFloorForm({ lotId, nextFloorNumber }: { lotId: string; nextFloorNumber: number }) {
  const createFloor = useCreateFloor(lotId);
  const form = useForm<FloorFormValues>({
    resolver: zodResolver(floorSchema),
    defaultValues: {
      name: `Floor ${nextFloorNumber}`,
      floorNumber: nextFloorNumber,
      rows: 5,
      columns: 10,
      defaultSlotPrice: 5,
    },
    mode: "onBlur",
  });

  function onSubmit(values: FloorFormValues) {
    createFloor.mutate(values, { onSuccess: () => form.reset() });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="floorNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Floor #</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="rows"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Rows</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="columns"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Columns</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="defaultSlotPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Rate ($/hr)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" size="sm" disabled={createFloor.isPending}>
          <Plus className="size-3.5" /> {createFloor.isPending ? "Adding…" : "Add Floor"}
        </Button>
      </form>
    </Form>
  );
}

function EditFloorDialog({
  lotId,
  floor,
  open,
  onOpenChange,
}: {
  lotId: string;
  floor: ParkingFloor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateFloor = useUpdateFloor(lotId);
  const form = useForm<EditFloorFormValues>({
    resolver: zodResolver(editFloorSchema),
    defaultValues: { name: floor.name, floorNumber: floor.floorNumber },
    mode: "onBlur",
  });

  useEffect(() => {
    // Sync the form when a different floor is opened for editing.
    form.reset({ name: floor.name, floorNumber: floor.floorNumber });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor]);

  function onSubmit(values: EditFloorFormValues) {
    updateFloor.mutate(
      { floorId: floor.id, payload: values },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit floor</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="floorNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Floor #</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateFloor.isPending}>
                {updateFloor.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const LocationPickerMap = dynamic(
  () => import("@/components/map/location-picker-map").then((m) => m.LocationPickerMap),
  { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-xl" /> },
);

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150, "Name must be 150 characters or fewer"),
  address: z
    .string()
    .trim()
    .min(1, "Address is required")
    .max(255, "Address must be 255 characters or fewer"),
  managerId: z.string(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function EditParkingLotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { data: lot, isLoading, isError, error, refetch } = useParkingLot(id);
  const updateLot = useUpdateParkingLot(id);
  const { data: floors } = useFloors(id);
  const { data: users } = useAdminUsers();
  const managers = users?.filter((u) => u.role === "MANAGER") ?? [];
  const deleteFloor = useDeleteFloor(id);

  const [position, setPosition] = useState<[number, number] | null>(null);
  const [editingFloor, setEditingFloor] = useState<ParkingFloor | null>(null);
  const [deletingFloor, setDeletingFloor] = useState<ParkingFloor | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", address: "", managerId: "", isActive: true },
    mode: "onBlur",
  });

  useEffect(() => {
    if (!lot) return;
    // Sync the form and map once the lot loads — deliberate, not derivable during render.
    form.reset({
      name: lot.name,
      address: lot.address,
      managerId: lot.managerId,
      isActive: lot.isActive,
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPosition([lot.latitude, lot.longitude]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lot]);

  function onSubmit(values: FormValues) {
    if (!position) return;
    updateLot.mutate(
      {
        name: values.name,
        address: values.address,
        latitude: position[0],
        longitude: position[1],
        managerId: user?.role === "ADMIN" && values.managerId ? values.managerId : undefined,
        isActive: values.isActive,
      },
      { onSuccess: () => router.push("/parking-lots") },
    );
  }

  if (isLoading || !position) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (isError || !lot) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader title={`Edit ${lot.name}`} />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card className="h-fit">
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Downtown Garage" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {user?.role === "ADMIN" && (
                <FormField
                  control={form.control}
                  name="managerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign Manager</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        items={managers.map((m) => ({
                          value: m.id,
                          label: `${m.firstName} ${m.lastName}`,
                        }))}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a manager" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {managers.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.firstName} {m.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div>
                  <Label>Lot is active</Label>
                  <p className="text-xs text-muted-foreground">
                    Deactivate to hide this lot from customers without deleting it.
                  </p>
                </div>
                <Switch
                  checked={form.watch("isActive")}
                  onCheckedChange={(v) => form.setValue("isActive", v)}
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateLot.isPending}>
                  {updateLot.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="h-80 lg:h-auto">
            <LocationPickerMap
              position={position}
              onChange={(lat, lng) => {
                setPosition([lat, lng]);
                reverseGeocode(lat, lng).then((address) => {
                  if (address) form.setValue("address", address);
                });
              }}
            />
          </div>
        </form>
      </Form>

      <Card className="mt-6">
        <CardContent className="space-y-4">
          <h2 className="font-heading font-medium">Floors</h2>
          <div className="space-y-2">
            {floors?.map((floor) => (
              <div
                key={floor.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{floor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {floor.rows} × {floor.columns} layout
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={floor.availableSlots > 0 ? "success" : "destructive"}>
                    {floor.availableSlots}/{floor.totalSlots} available
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${floor.name}`}
                    onClick={() => setEditingFloor(floor)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    aria-label={`Delete ${floor.name}`}
                    onClick={() => setDeletingFloor(floor)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-sm font-medium">Add a floor</p>
            <AddFloorForm
              lotId={id}
              nextFloorNumber={
                Math.max(-1, ...(floors?.map((f) => f.floorNumber) ?? [-1])) + 1
              }
            />
          </div>
        </CardContent>
      </Card>

      {editingFloor && (
        <EditFloorDialog
          lotId={id}
          floor={editingFloor}
          open={Boolean(editingFloor)}
          onOpenChange={(open) => !open && setEditingFloor(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deletingFloor)}
        onOpenChange={(open) => !open && setDeletingFloor(null)}
        title="Delete floor"
        description={`Delete "${deletingFloor?.name}" and all of its slots? This can't be undone, and will fail if any slot has an existing reservation.`}
        confirmLabel="Delete"
        isPending={deleteFloor.isPending}
        onConfirm={() =>
          deletingFloor &&
          deleteFloor.mutate(deletingFloor.id, {
            onSuccess: () => setDeletingFloor(null),
          })
        }
      />
    </div>
  );
}
