"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Monitor, Moon, Sun } from "lucide-react";
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
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/auth-provider";
import { BillingForm } from "@/features/users/components/billing-form";
import { useChangePassword, usePaymentMethod } from "@/features/users/hooks";
import { getApiStatus } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

function initials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Deliberate hydration guard: theme isn't known until mounted client-side.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const changePassword = useChangePassword();
  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const newPassword = passwordForm.watch("newPassword");

  function onChangePassword(values: ChangePasswordValues) {
    changePassword.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      { onSuccess: () => passwordForm.reset() },
    );
  }

  if (isLoading || !user) {
    return <Skeleton className="h-96 w-full max-w-lg rounded-xl" />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title="Profile" />

      <Tabs defaultValue="profile">
        <TabsList className="w-full">
          <TabsTrigger value="profile" className="flex-1">
            Profile
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex-1">
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 pt-4">
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
            <CardContent className="space-y-4">
              <h2 className="font-heading font-medium">Change Password</h2>
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onChangePassword)}
                  className="space-y-4"
                >
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current password</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="current-password" {...field} />
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
                          <Input type="password" autoComplete="new-password" {...field} />
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
                          <Input type="password" autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={changePassword.isPending}>
                      {changePassword.isPending ? "Changing…" : "Change Password"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="pt-4">
          <BillingTab cardholderName={`${user.firstName} ${user.lastName}`} />
        </TabsContent>
      </Tabs>
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
