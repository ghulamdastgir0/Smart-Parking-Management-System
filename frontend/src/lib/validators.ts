import { z } from "zod";

export const EMAIL_MAX_LENGTH = 254;
export const NAME_MAX_LENGTH = 20;
export const PASSWORD_MIN_LENGTH = 8;
// bcrypt only hashes the first 72 bytes of a password — anything typed beyond that is
// silently ignored at login time, so capping input here keeps what's typed and what's
// actually checked in sync.
export const PASSWORD_MAX_LENGTH = 72;

export const emailField = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(EMAIL_MAX_LENGTH, "Email is too long")
  .email("Enter a valid email");

export function nameField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(NAME_MAX_LENGTH, `${label} must be ${NAME_MAX_LENGTH} characters or fewer`)
    .regex(
      /^[A-Za-z' -]+$/,
      `${label} can only contain letters, spaces, hyphens, and apostrophes`,
    );
}

function passwordComplexityCount(value: string): number {
  return [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(value)).length;
}

export const PASSWORD_COMPLEXITY_MESSAGE =
  "Password must include at least 3 of: uppercase, lowercase, a number, and a symbol";

// For NEW/CHANGED passwords only (register, admin "add user", change-password's newPassword).
// Login's password and change-password's currentPassword must stay presence-only checks —
// they need to keep accepting passwords created before this rule existed.
export const newPasswordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer`)
  .refine((value) => passwordComplexityCount(value) >= 3, PASSWORD_COMPLEXITY_MESSAGE);
