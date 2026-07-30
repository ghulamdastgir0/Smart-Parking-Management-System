import { z } from "zod";

const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/\d{2}$/;

function luhnCheck(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export const cardNumberField = z
  .string()
  .min(1, "Card number is required")
  .refine((v) => /^\d{4} \d{4} \d{4} \d{4}$/.test(v), "Enter a valid 16-digit card number")
  .refine((v) => luhnCheck(v.replace(/\s+/g, "")), "Card number is not valid");

export const expiryField = z
  .string()
  .min(1, "Expiry is required")
  .refine((v) => EXPIRY_PATTERN.test(v), "Use MM/YY format")
  .refine((v) => {
    if (!EXPIRY_PATTERN.test(v)) return true; // already flagged by the previous check
    const { month, year } = parseExpiry(v);
    const expiresAt = new Date(2000 + year, month, 1); // first of the month AFTER expiry
    return expiresAt.getTime() > Date.now();
  }, "Card has expired");

export const cvvField = z
  .string()
  .min(1, "CVV is required")
  .refine((v) => /^\d{3,4}$/.test(v), "Enter a valid CVV");

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return (digits.match(/.{1,4}/g) ?? []).join(" ");
}

export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function parseExpiry(expiry: string): { month: number; year: number } {
  const [month, year] = expiry.split("/").map(Number);
  return { month, year: 2000 + year };
}
