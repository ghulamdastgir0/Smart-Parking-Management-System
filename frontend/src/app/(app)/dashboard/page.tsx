"use client";

import { Building2, CalendarCheck2, MapPin, ScanLine, Settings2, Ticket, Wallet } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/auth-provider";
import { useParkingLots } from "@/features/parking-lots/hooks";
import { useMyNotifications } from "@/features/notifications/hooks";
import { NotificationIcon } from "@/features/notifications/notification-icon";
import { ActiveReservationCard } from "@/features/reservations/components/active-reservation-card";
import { useMyReservations } from "@/features/reservations/hooks";
import { formatCurrency, formatDistanceToNow } from "@/lib/format";

const ACTIVE_STATUSES = new Set(["CONFIRMED", "CHECKED_IN", "OVERTIME", "PENDING_PAYMENT"]);

function CustomerDashboard() {
  const { user } = useAuth();
  const { data: reservations, isLoading, isError, error, refetch } = useMyReservations();
  const { data: notifications } = useMyNotifications();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  const active = reservations?.find((r) => ACTIVE_STATUSES.has(r.status));
  const upcoming = reservations?.filter((r) => ACTIVE_STATUSES.has(r.status)).length ?? 0;
  const total = reservations?.length ?? 0;
  const now = new Date();
  const monthSpend =
    reservations
      ?.filter((r) => {
        const created = new Date(r.createdAt);
        return (
          created.getMonth() === now.getMonth() &&
          created.getFullYear() === now.getFullYear() &&
          r.payment?.status === "SUCCESSFUL"
        );
      })
      .reduce((sum, r) => sum + Number(r.payment?.amount ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? ""}`}
        description="Here's what's happening with your parking."
      />

      {active ? (
        <ActiveReservationCard reservation={active} />
      ) : (
        <EmptyState
          icon={CalendarCheck2}
          title="No active reservation"
          description="Find a nearby parking lot and book a slot in seconds."
          action={{ label: "Find Parking", render: <Link href="/nearby" /> }}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <Ticket className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{upcoming}</p>
              <p className="text-xs text-muted-foreground">Upcoming Reservations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <CalendarCheck2 className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{total}</p>
              <p className="text-xs text-muted-foreground">Total Bookings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <Wallet className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{formatCurrency(monthSpend)}</p>
              <p className="text-xs text-muted-foreground">This Month&apos;s Spend</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-medium">Nearby Parking</h2>
              <Button variant="ghost" size="sm" render={<Link href="/nearby" />} nativeButton={false}>
                See map
              </Button>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              <MapPin className="size-5" />
              Open the map to find parking lots near you.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-medium">Recent Notifications</h2>
              <Button variant="ghost" size="sm" render={<Link href="/notifications" />} nativeButton={false}>
                View all
              </Button>
            </div>
            {!notifications || notifications.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No notifications yet
              </p>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 4).map((n) => (
                  <div key={n.id} className="flex items-start gap-2">
                    <NotificationIcon type={n.type} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(n.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StaffDashboard() {
  const { user } = useAuth();
  const { data: lots, isLoading, isError, error, refetch } = useParkingLots();

  const myLots =
    user?.role === "MANAGER"
      ? lots?.filter((lot) => lot.managerId === user.id)
      : lots;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? ""}`}
        description="Manage parking lots and handle checkpoint activity."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <Settings2 className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Manage Parking Lots</p>
                <p className="text-xs text-muted-foreground">Create, edit, and monitor lots</p>
              </div>
            </div>
            <Button render={<Link href="/admin/parking-lots" />} nativeButton={false}>
              Open
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <ScanLine className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Checkpoint Scanner</p>
                <p className="text-xs text-muted-foreground">Check vehicles in and out</p>
              </div>
            </div>
            <Button render={<Link href="/checkpoint" />} nativeButton={false}>
              Open
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-heading font-medium">
            {user?.role === "MANAGER" ? "Your Parking Lots" : "All Parking Lots"}
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          ) : isError ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : !myLots || myLots.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No parking lots yet"
              description="Create your first parking lot to get started."
              action={{ label: "Add Parking Lot", render: <Link href="/admin/parking-lots/new" /> }}
            />
          ) : (
            <div className="space-y-2">
              {myLots.map((lot) => (
                <Link
                  key={lot.id}
                  href={`/parking-lots/${lot.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 text-sm hover:bg-accent"
                >
                  <div>
                    <p className="font-medium">{lot.name}</p>
                    <p className="text-xs text-muted-foreground">{lot.address}</p>
                  </div>
                  <Badge variant={lot.availableSlots > 0 ? "success" : "destructive"}>
                    {lot.availableSlots} / {lot.totalSlots} available
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  return user.role === "CUSTOMER" ? <CustomerDashboard /> : <StaffDashboard />;
}
