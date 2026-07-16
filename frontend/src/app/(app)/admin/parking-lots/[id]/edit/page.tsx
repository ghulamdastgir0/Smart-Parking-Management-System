"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/auth-provider";
import {
  useCreateFloor,
  useFloors,
  useParkingLot,
  useUpdateParkingLot,
} from "@/features/parking-lots/hooks";
import { MAX_COLUMNS, MAX_ROWS } from "@/features/parking-lots/types";
import { useAdminUsers } from "@/features/users/hooks";
import { reverseGeocode } from "@/lib/geocode";

const floorSchema = z.object({
  name: z.string().min(1, "Floor name is required"),
  floorNumber: z.number().int(),
  rows: z.number().int().min(1).max(MAX_ROWS),
  columns: z.number().int().min(1).max(MAX_COLUMNS),
  defaultSlotPrice: z.number().positive("Must be greater than 0"),
});

type FloorFormValues = z.infer<typeof floorSchema>;

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

const LocationPickerMap = dynamic(
  () => import("@/components/map/location-picker-map").then((m) => m.LocationPickerMap),
  { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-xl" /> },
);

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  managerId: z.string(),
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

  const [position, setPosition] = useState<[number, number] | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", address: "", managerId: "" },
  });

  useEffect(() => {
    if (!lot) return;
    // Sync the form and map once the lot loads — deliberate, not derivable during render.
    form.reset({ name: lot.name, address: lot.address, managerId: lot.managerId });
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
      },
      { onSuccess: () => router.push("/admin/parking-lots") },
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
                      <Input {...field} />
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
                      <Input {...field} />
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
                <Badge variant={floor.availableSlots > 0 ? "success" : "destructive"}>
                  {floor.availableSlots}/{floor.totalSlots} available
                </Badge>
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
    </div>
  );
}
