"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/auth-provider";
import { useCreateParkingLot } from "@/features/parking-lots/hooks";
import { MAX_COLUMNS, MAX_ROWS, MAX_TOTAL_SLOTS } from "@/features/parking-lots/types";
import { useAdminUsers } from "@/features/users/hooks";
import { reverseGeocode } from "@/lib/geocode";

const LocationPickerMap = dynamic(
  () => import("@/components/map/location-picker-map").then((m) => m.LocationPickerMap),
  { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-xl" /> },
);

const floorSchema = z.object({
  name: z.string().min(1, "Floor name is required"),
  floorNumber: z.number().int(),
  rows: z.number().int().min(1).max(MAX_ROWS),
  columns: z.number().int().min(1).max(MAX_COLUMNS),
  defaultSlotPrice: z.number().positive("Must be greater than 0"),
});

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  managerId: z.string().optional(),
  sameCapacityForAll: z.boolean(),
  sharedRows: z.number().int().min(1).max(MAX_ROWS),
  sharedColumns: z.number().int().min(1).max(MAX_COLUMNS),
  sharedPrice: z.number().positive(),
  floors: z.array(floorSchema).min(1, "At least one floor is required"),
});

type FormValues = z.infer<typeof schema>;

export default function NewParkingLotPage() {
  const router = useRouter();
  const { user } = useAuth();
  const createLot = useCreateParkingLot();
  const { data: users } = useAdminUsers();
  const managers = users?.filter((u) => u.role === "MANAGER") ?? [];

  const [position, setPosition] = useState<[number, number]>([37.7749, -122.4194]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      address: "",
      sameCapacityForAll: true,
      sharedRows: 5,
      sharedColumns: 10,
      sharedPrice: 5,
      floors: [{ name: "Ground Floor", floorNumber: 0, rows: 5, columns: 10, defaultSlotPrice: 5 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "floors",
  });

  const sameCapacityForAll = form.watch("sameCapacityForAll");
  const sharedRows = form.watch("sharedRows");
  const sharedColumns = form.watch("sharedColumns");
  const sharedPrice = form.watch("sharedPrice");
  const floorsValue = form.watch("floors");

  // Keep every floor's capacity in sync with the shared inputs while "same for all" is on,
  // so the payload sent on submit is always a fully explicit per-floor array either way.
  useEffect(() => {
    if (!sameCapacityForAll) return;
    fields.forEach((_, index) => {
      form.setValue(`floors.${index}.rows`, sharedRows);
      form.setValue(`floors.${index}.columns`, sharedColumns);
      form.setValue(`floors.${index}.defaultSlotPrice`, sharedPrice);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sameCapacityForAll, sharedRows, sharedColumns, sharedPrice, fields.length]);

  const totalSlots = (floorsValue ?? []).reduce(
    (sum, f) => sum + (Number(f.rows) || 0) * (Number(f.columns) || 0),
    0,
  );
  const exceedsMax = totalSlots > MAX_TOTAL_SLOTS;

  function addFloor() {
    const nextFloorNumber =
      Math.max(...(floorsValue ?? []).map((f) => f.floorNumber), -1) + 1;
    append({
      name: `Floor ${nextFloorNumber + 1}`,
      floorNumber: nextFloorNumber,
      rows: sameCapacityForAll ? sharedRows : 5,
      columns: sameCapacityForAll ? sharedColumns : 10,
      defaultSlotPrice: sameCapacityForAll ? sharedPrice : 5,
    });
  }

  function onSubmit(values: FormValues) {
    createLot.mutate(
      {
        name: values.name,
        address: values.address,
        latitude: position[0],
        longitude: position[1],
        managerId: user?.role === "ADMIN" ? values.managerId : undefined,
        floors: values.floors.map((f) => ({
          name: f.name,
          floorNumber: f.floorNumber,
          rows: f.rows,
          columns: f.columns,
          defaultSlotPrice: f.defaultSlotPrice,
        })),
      },
      { onSuccess: (lot) => router.push(`/parking-lots/${lot.id}`) },
    );
  }

  return (
    <div>
      <PageHeader title="Create Parking Lot" />
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
                      <Input {...field} placeholder="Set via the map, or edit manually" />
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
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Yourself (default)" />
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
                  <Label>Use same capacity for all floors</Label>
                  <p className="text-xs text-muted-foreground">
                    Turn off to set rows, columns, and price individually per floor.
                  </p>
                </div>
                <Switch
                  checked={sameCapacityForAll}
                  onCheckedChange={(v) => form.setValue("sameCapacityForAll", v)}
                />
              </div>

              {sameCapacityForAll && (
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="sharedRows"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rows</FormLabel>
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
                    name="sharedColumns"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Columns</FormLabel>
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
                    name="sharedPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate ($/hr)</FormLabel>
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
              )}

              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <Label>Floors</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addFloor}>
                    <Plus className="size-3.5" /> Add Floor
                  </Button>
                </div>

                {fields.map((fieldItem, index) => (
                  <div key={fieldItem.id} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name={`floors.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="Floor name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`floors.${index}.floorNumber`}
                        render={({ field }) => (
                          <FormItem className="w-24">
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="#"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>

                    {sameCapacityForAll ? (
                      <p className="text-xs text-muted-foreground">
                        {sharedRows} rows × {sharedColumns} columns ·{" "}
                        {sharedRows * sharedColumns} slots @ ${sharedPrice}/hr
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <FormField
                          control={form.control}
                          name={`floors.${index}.rows`}
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
                          name={`floors.${index}.columns`}
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
                          name={`floors.${index}.defaultSlotPrice`}
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
                    )}
                  </div>
                ))}
              </div>

              <p className={exceedsMax ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
                Total Slots: {totalSlots}
                {exceedsMax && ` — exceeds the maximum of ${MAX_TOTAL_SLOTS}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Floor layout cannot be changed after creation — add more floors later from the
                lot&apos;s edit page if needed.
              </p>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createLot.isPending || exceedsMax}>
                  {createLot.isPending ? "Creating…" : "Create Parking Lot"}
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
    </div>
  );
}
