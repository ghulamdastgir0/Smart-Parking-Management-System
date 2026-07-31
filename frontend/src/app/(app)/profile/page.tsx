"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, KeyRound, Monitor, Moon, Pencil, Sun, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PasswordStrength } from "@/components/auth/password-strength";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/auth-provider";
import { BillingForm } from "@/features/users/components/billing-form";
import {
  useChangePassword,
  useDeleteOwnAccount,
  usePaymentMethod,
  useUpdateProfile,
} from "@/features/users/hooks";
import { getApiStatus } from "@/lib/api-error";
import { setServerFieldError, useConfirmFieldSync } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { emailField, nameField, newPasswordField } from "@/lib/validators";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: newPasswordField,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

const editProfileSchema = z.object({
  firstName: nameField("First name"),
  lastName: nameField("Last name"),
  email: emailField,
});

type EditProfileValues = z.infer<typeof editProfileSchema>;

function initials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

function EditProfileDialog({
  user,
  open,
  onOpenChange,
}: {
  user: { firstName: string; lastName: string; email: string; role: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Manager accounts are provisioned by an admin — that identity is admin-owned, so a
  // manager can't self-serve a different email (enforced again server-side).
  const emailLocked = user.role === "MANAGER";
  const updateProfile = useUpdateProfile();
  const form = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: user,
    mode: "onBlur",
  });

  useEffect(() => {
    if (open) form.reset(user);
    // Only re-sync when the dialog opens, not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function onSubmit(values: EditProfileValues) {
    const payload = emailLocked
      ? { firstName: values.firstName, lastName: values.lastName }
      : values;
    updateProfile.mutate(payload, {
      onSuccess: () => onOpenChange(false),
      onError: (error) => setServerFieldError(form, error, "email"),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your name and email address.</DialogDescription>
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
                      <Input placeholder="Jane" {...field} />
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
                      <Input placeholder="Doe" {...field} />
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
                    <Input
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={emailLocked}
                      {...field}
                    />
                  </FormControl>
                  {emailLocked && (
                    <p className="text-xs text-muted-foreground">
                      Managed by your administrator — contact them to change it.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const changePassword = useChangePassword();
  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    mode: "onBlur",
  });
  useConfirmFieldSync(passwordForm, "newPassword", "confirmPassword");
  const newPassword = passwordForm.watch("newPassword");

  useEffect(() => {
    if (!open) passwordForm.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function onChangePassword(values: ChangePasswordValues) {
    changePassword.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => setServerFieldError(passwordForm, error, "currentPassword"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
            <FormField
              control={passwordForm.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your current password"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <PasswordStrength password={newPassword} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Re-enter your new password"
                      autoComplete="new-password"
                      {...field}
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
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? "Changing…" : "Change Password"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProfilePage() {
  const { user, isLoading, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const deleteAccount = useDeleteOwnAccount();

  useEffect(() => {
    // Deliberate hydration guard: theme isn't known until mounted client-side.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (isLoading || !user) {
    return <Skeleton className="h-96 w-full max-w-lg rounded-xl" />;
  }

  const isCustomer = user.role === "CUSTOMER";

  const profileContent = (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <Avatar size="lg" className="size-16">
            <AvatarFallback className="text-lg">
              {initials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-heading text-xl font-semibold">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{user.role}</Badge>
            <Badge variant="success">Active</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Member since {formatDate(user.createdAt)}
          </p>
          <Button variant="outline" size="sm" onClick={() => setEditProfileOpen(true)}>
            <Pencil className="size-3.5" /> Edit Profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-heading font-medium">Preferences</h2>
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors",
                    mounted && theme === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  <opt.icon className="size-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-medium">Security</h2>
            <p className="text-xs text-muted-foreground">Change your account password.</p>
          </div>
          <Button variant="outline" onClick={() => setChangePasswordOpen(true)}>
            <KeyRound className="size-3.5" /> Change Password
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardContent className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-medium">Delete Account</h2>
            <p className="text-xs text-muted-foreground">
              Permanently delete your account and all associated data.
            </p>
          </div>
          <Button variant="destructive" onClick={() => setDeleteAccountOpen(true)}>
            <Trash2 className="size-3.5" /> Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title="Profile" />

      {isCustomer ? (
        <Tabs defaultValue="profile">
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1">
              Profile
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex-1">
              Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="pt-4">
            {profileContent}
          </TabsContent>

          <TabsContent value="billing" className="pt-4">
            <BillingTab cardholderName={`${user.firstName} ${user.lastName}`} />
          </TabsContent>
        </Tabs>
      ) : (
        profileContent
      )}

      <EditProfileDialog user={user} open={editProfileOpen} onOpenChange={setEditProfileOpen} />
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <ConfirmDialog
        open={deleteAccountOpen}
        onOpenChange={setDeleteAccountOpen}
        title="Delete your account?"
        description="This permanently deletes your account and all associated data. This cannot be undone."
        confirmLabel="Delete Account"
        isPending={deleteAccount.isPending}
        onConfirm={() => deleteAccount.mutate(undefined, { onSuccess: () => logout() })}
      />
    </div>
  );
}

function BillingTab({ cardholderName }: { cardholderName: string }) {
  const { data: paymentMethod, isLoading, isError, error, refetch } = usePaymentMethod();
  const hasNoCardYet = isError && getApiStatus(error) === 404;

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (isError && !hasNoCardYet) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-4">
      {paymentMethod && (
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <CreditCard className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {paymentMethod.brand} •••• {paymentMethod.last4}
              </p>
              <p className="text-xs text-muted-foreground">
                {paymentMethod.cardholderName} · Expires{" "}
                {String(paymentMethod.expiryMonth).padStart(2, "0")}/
                {String(paymentMethod.expiryYear).slice(-2)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <h2 className="mb-4 font-heading font-medium">
            {paymentMethod ? "Update Card" : "Add a Payment Method"}
          </h2>
          <BillingForm
            defaultCardholderName={paymentMethod?.cardholderName ?? cardholderName}
            submitLabel={paymentMethod ? "Update Card" : "Save Card"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
