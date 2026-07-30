"use client";

import { Ban, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAdminUsers, useBlockUser, useUnblockUser } from "@/features/users/hooks";
import type { AdminUser } from "@/features/users/types";
import { formatDate } from "@/lib/format";

export default function AdminUsersPage() {
  const { data: users, isLoading, isError, error, refetch } = useAdminUsers();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const [toBlock, setToBlock] = useState<AdminUser | null>(null);

  // Manager/Admin accounts have their own dedicated Staff page (create/edit/delete there) —
  // this list is customer accounts only, view/block-only.
  const customers = useMemo(() => users?.filter((u) => u.role === "CUSTOMER") ?? [], [users]);

  return (
    <div>
      <PageHeader title="Users" description="All registered customer accounts" />
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : customers.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Member Since</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.firstName} {u.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    {u.isBlocked ? (
                      <Badge variant="destructive">Blocked</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {u.isBlocked ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-success"
                        title="Unblock user"
                        disabled={unblockUser.isPending}
                        onClick={() => unblockUser.mutate(u.id)}
                      >
                        <ShieldCheck className="size-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        title="Block user"
                        onClick={() => setToBlock(u)}
                      >
                        <Ban className="size-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toBlock)}
        onOpenChange={(open) => !open && setToBlock(null)}
        title="Block User?"
        description={
          <>
            &quot;{toBlock?.firstName} {toBlock?.lastName}&quot; ({toBlock?.email}) will no
            longer be able to log in, and any of their confirmed reservations will be
            cancelled and the slots freed. This can be undone by unblocking them later.
          </>
        }
        confirmLabel="Block"
        isPending={blockUser.isPending}
        onConfirm={() => {
          if (!toBlock) return;
          blockUser.mutate(toBlock.id, { onSuccess: () => setToBlock(null) });
        }}
      />
    </div>
  );
}
