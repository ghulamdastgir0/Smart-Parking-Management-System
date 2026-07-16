"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  rows: z.number().int().min(1).max(MAX_ROWS),
  columns: z.number().int().min(1).max(MAX_COLUMNS),
  defaultSlotPrice: z.number().positive("Must be greater than 0"),
  managerId: z.string().optional(),
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
      rows: 5,
      columns: 10,
      defaultSlotPrice: 5,
    },
  });

  const rows = form.watch("rows");
  const columns = form.watch("columns");
  const totalSlots = (Number(rows) || 0) * (Number(columns) || 0);
  const exceedsMax = totalSlots > MAX_TOTAL_SLOTS;

  function onSubmit(values: FormValues) {
    createLot.mutate(
      {
        name: values.name,
        address: values.address,
        latitude: position[0],
        longitude: position[1],
        rows: values.rows,
        columns: values.columns,
        defaultSlotPrice: values.defaultSlotPrice,
        managerId: user?.role === "ADMIN" ? values.managerId : undefined,
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rows"
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
                  name="columns"
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
              </div>
              <p className={exceedsMax ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
                Total Slots: {totalSlots}
                {exceedsMax && ` — exceeds the maximum of ${MAX_TOTAL_SLOTS}`}
              </p>
              <FormField
                control={form.control}
                name="defaultSlotPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Hourly Rate ($)</FormLabel>
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
              <p className="text-xs text-muted-foreground">
                Slot layout cannot be changed after creation.
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
