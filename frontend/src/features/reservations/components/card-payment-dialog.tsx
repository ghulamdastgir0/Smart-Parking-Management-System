"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import {
  cardNumberField,
  cvvField,
  expiryField,
  formatCardNumber,
  formatExpiry,
} from "@/lib/card-form";
import { formatCurrency } from "@/lib/format";

const cardSchema = z.object({
  cardholderName: z.string().min(1, "Cardholder name is required"),
  cardNumber: cardNumberField,
  expiry: expiryField,
  cvv: cvvField,
});

type CardValues = z.infer<typeof cardSchema>;

export function CardPaymentDialog({
  open,
  onOpenChange,
  amount,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const form = useForm<CardValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: { cardholderName: "", cardNumber: "", expiry: "", cvv: "" },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-5" /> Pay {formatCurrency(amount)}
          </DialogTitle>
          <DialogDescription>
            This is a simulated payment for demo purposes — no real card is charged.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {/* Card details are validated for shape only and never leave the browser — this
              dummy checkout calls the same simulated confirm endpoint either way. */}
          <form onSubmit={form.handleSubmit(() => onConfirm())} className="space-y-4">
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                <Lock className="size-3.5" />
                {isPending ? "Processing…" : `Pay ${formatCurrency(amount)}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
