"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useSavePaymentMethod } from "@/features/users/hooks";
import {
  cardNumberField,
  cvvField,
  expiryField,
  formatCardNumber,
  formatExpiry,
  parseExpiry,
} from "@/lib/card-form";

const billingSchema = z.object({
  cardholderName: z
    .string()
    .trim()
    .min(1, "Cardholder name is required")
    .max(100, "Cardholder name must be 100 characters or fewer"),
  cardNumber: cardNumberField,
  expiry: expiryField,
  cvv: cvvField,
});

type BillingValues = z.infer<typeof billingSchema>;

export function BillingForm({
  defaultCardholderName,
  onSaved,
  submitLabel = "Save Card",
}: {
  defaultCardholderName?: string;
  onSaved?: () => void;
  submitLabel?: string;
}) {
  const savePaymentMethod = useSavePaymentMethod();
  const form = useForm<BillingValues>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      cardholderName: defaultCardholderName ?? "",
      cardNumber: "",
      expiry: "",
      cvv: "",
    },
    mode: "onBlur",
  });

  function onSubmit(values: BillingValues) {
    const { month, year } = parseExpiry(values.expiry);
    savePaymentMethod.mutate(
      {
        cardholderName: values.cardholderName,
        cardNumber: values.cardNumber.replace(/\s+/g, ""),
        expiryMonth: month,
        expiryYear: year,
      },
      {
        onSuccess: () => {
          form.reset({
            cardholderName: values.cardholderName,
            cardNumber: "",
            expiry: "",
            cvv: "",
          });
          onSaved?.();
        },
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="cardholderName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cardholder Name</FormLabel>
              <FormControl>
                <Input placeholder="Jane Doe" autoComplete="cc-name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cardNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Card Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="4242 4242 4242 4242"
                  autoComplete="cc-number"
                  inputMode="numeric"
                  {...field}
                  onChange={(e) => field.onChange(formatCardNumber(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="expiry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiry</FormLabel>
                <FormControl>
                  <Input
                    placeholder="MM/YY"
                    autoComplete="cc-exp"
                    inputMode="numeric"
                    {...field}
                    onChange={(e) => field.onChange(formatExpiry(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cvv"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CVV</FormLabel>
                <FormControl>
                  <Input
                    placeholder="123"
                    autoComplete="cc-csc"
                    inputMode="numeric"
                    maxLength={4}
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          This is a simulated payment processor for demo purposes — no real card is charged.
          Tip: a card number ending in <span className="font-mono">0000</span> simulates a
          declined payment, for testing.
        </p>
        <Button type="submit" className="w-full" disabled={savePaymentMethod.isPending}>
          {savePaymentMethod.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CreditCard className="size-4" />
          )}
          {savePaymentMethod.isPending ? "Saving…" : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
