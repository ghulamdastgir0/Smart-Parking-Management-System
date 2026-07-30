"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, Pencil, Plus, ShieldCheck, Trash2, UserCog } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/auth-provider";
import {
  useAdminUsers,
  useBlockUser,
  useRemoveManager,
  useUnblockUser,
  useUpdateUser,
} from "@/features/users/hooks";
import type { AdminUser } from "@/features/users/types";
import { setServerFieldError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";
import { emailField, nameField } from "@/lib/validators";

const editStaffSchema = z.object({
  firstName: nameField("First name"),
  lastName: nameField("Last name"),
  email: emailField,
});

type EditStaffValues = z.infer<typeof editStaffSchema>;

function EditStaffDialog({
  staff,
  onOpenChange,
}: {
  staff: AdminUser | null;
  onOpenChange: (open: boolean) => void;
}) {
  // Remounted per-staff-member via `key` on the call site, so these lazy initial values are
  // always fresh — no effect needed to re-sync them when a different row is clicked.
  const updateUser = useUpdateUser();
  const form = useForm<EditStaffValues>({
    resolver: zodResolver(editStaffSchema),
    defaultValues: {
      firstName: staff?.firstName ?? "",
      lastName: staff?.lastName ?? "",
      email: staff?.email ?? "",
    },
    mode: "onBlur",
  });

  if (!staff) return null;

  function onSubmit(values: EditStaffValues) {
    if (!staff) return;
    updateUser.mutate(
      { id: staff.id, payload: values },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => setServerFieldError(form, error, "email"),
      },
    );
  }

  return (
    <Dialog open={Boolean(staff)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {staff.role === "ADMIN" ? "Admin" : "Manager"}</DialogTitle>
          <DialogDescription>Update this account&apos;s name and email.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input maxLength={20} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input maxLength={20} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminManagersPage() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading, isError, error, refetch } = useAdminUsers();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const removeManager = useRemoveManager();
  const [toBlock, setToBlock] = useState<AdminUser | null>(null);
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const staff = useMemo(
    () =>
      users?.filter(
        (u) => (u.role === "MANAGER" || u.role === "ADMIN") && u.id !== currentUser?.id,
      ) ?? [],
    [users, currentUser],
  );

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Manager and admin accounts"
        actions={
          <Button render={<Link href="/admin/managers/new" />} nativeButton={false}>
            <Plus className="size-4" /> Add Staff
          </Button>
        }
      />
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : staff.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No other staff accounts yet"
          description="Create a manager or admin account to help run the platform."
          action={{ label: "Add Staff", render: <Link href="/admin/managers/new" /> }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Member Since</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.firstName} {m.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.email}</TableCell>
                  <TableCell>
                    <Badge variant={m.role === "ADMIN" ? "default" : "secondary"}>
                      {m.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {m.isBlocked ? (
                      <Badge variant="destructive">Blocked</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(m.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Edit"
                      onClick={() => setEditing(m)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    {m.isBlocked ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-success"
                        title="Unblock"
                        disabled={unblockUser.isPending}
                        onClick={() => unblockUser.mutate(m.id)}
                      >
                        <ShieldCheck className="size-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        title="Block"
                        onClick={() => setToBlock(m)}
                      >
                        <Ban className="size-3.5" />
                      </Button>
                    )}
                    {m.role === "MANAGER" && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        title="Delete"
                        onClick={() => setToDelete(m)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EditStaffDialog
        key={editing?.id ?? "none"}
        staff={editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <ConfirmDialog
        open={Boolean(toBlock)}
        onOpenChange={(open) => !open && setToBlock(null)}
        title="Block this account?"
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

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete Manager?"
        description={
          <>
            This will permanently remove &quot;{toDelete?.firstName} {toDelete?.lastName}&quot;
            ({toDelete?.email}). This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        isPending={removeManager.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          removeManager.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />
    </div>
  );
}
