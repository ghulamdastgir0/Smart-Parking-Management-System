"use client";

import { CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-provider";
import { BillingForm } from "@/features/users/components/billing-form";

export default function CompleteProfilePage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <CreditCard className="size-6 text-primary" />
        </div>
        <h1 className="font-heading text-xl font-semibold">Complete Your Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a payment method to start booking parking. It's charged automatically when you
          check out at the end of a reservation.
        </p>
      </div>
      <Card>
        <CardContent>
          <BillingForm
            defaultCardholderName={
              user ? `${user.firstName} ${user.lastName}` : undefined
            }
            submitLabel="Save & Continue"
            onSaved={() => {
              window.location.href = "/dashboard";
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
