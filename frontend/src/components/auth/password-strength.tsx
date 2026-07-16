import { cn } from "@/lib/utils";

function scorePassword(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"];
const COLORS = [
  "bg-destructive",
  "bg-destructive",
  "bg-warning",
  "bg-primary",
  "bg-success",
];

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = scorePassword(password);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full bg-muted transition-colors",
              i < score && COLORS[score],
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{LABELS[score]}</p>
    </div>
  );
}
