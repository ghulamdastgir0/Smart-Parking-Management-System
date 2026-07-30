"use client";

import { useEffect } from "react";
import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import { getApiErrorMessage } from "@/lib/api-error";

export function setServerFieldError<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  error: unknown,
  field: FieldPath<TFieldValues>,
) {
  form.setError(field, { type: "server", message: getApiErrorMessage(error) });
}

/**
 * RHF only re-validates the field being edited, so a confirm-password mismatch set on
 * `targetName` doesn't clear when `sourceName` (the other password field) changes to match
 * it. This re-triggers validation on `targetName` whenever `sourceName` changes.
 */
export function useConfirmFieldSync<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  sourceName: FieldPath<TFieldValues>,
  targetName: FieldPath<TFieldValues>,
) {
  const sourceValue = form.watch(sourceName);

  useEffect(() => {
    if (form.getFieldState(targetName).isTouched || form.getValues(targetName)) {
      void form.trigger(targetName);
    }
    // Only re-sync when the source field's value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceValue]);
}
