"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
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
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/auth-provider";
import { useParkingLot, useUpdateParkingLot } from "@/features/parking-lots/hooks";
import { useAdminUsers } from "@/features/users/hooks";
import { reverseGeocode } from "@/lib/geocode";

const LocationPickerMap = dynamic(
  () => import("@/components/map/location-picker-map").then((m) => m.LocationPickerMap),
  { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-xl" /> },
);

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  managerId: z.string().optional(),
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
  const { data: users } = useAdminUsers();
  const managers = users?.filter((u) => u.role === "MANAGER") ?? [];

  const [position, setPosition] = useState<[number, number] | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", address: "" },
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
        managerId: user?.role === "ADMIN" ? values.managerId : undefined,
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
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
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
                Slot layout ({lot.rows} × {lot.columns}) cannot be changed after creation.
              </p>
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
    </div>
  );
}
