import {
  AlertTriangle,
  Bell,
  CarFront,
  CheckCircle2,
  Clock,
  CreditCard,
  LogIn,
  LogOut,
  ReceiptText,
  TimerOff,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  RESERVATION_CONFIRMED: { icon: CheckCircle2, tone: "text-primary" },
  CHECKIN_SUCCESS: { icon: LogIn, tone: "text-success" },
  CHECKOUT_INITIATED: { icon: ReceiptText, tone: "text-warning" },
  CHECKOUT_SUCCESS: { icon: LogOut, tone: "text-success" },
  CHECKOUT_COMPLETED: { icon: LogOut, tone: "text-success" },
  PAYMENT_COMPLETED: { icon: CreditCard, tone: "text-success" },
  RESERVATION_EXPIRED: { icon: TimerOff, tone: "text-destructive" },
  CHECKOUT_REMINDER_15MIN: { icon: Clock, tone: "text-warning" },
  CHECKOUT_TIME_REACHED: { icon: Clock, tone: "text-warning" },
  GRACE_PERIOD_WARNING: { icon: AlertTriangle, tone: "text-warning" },
  VEHICLE_REMOVAL_NOTICE: { icon: CarFront, tone: "text-destructive" },
  STAFF_INTERVENTION_REQUIRED: { icon: AlertTriangle, tone: "text-destructive" },
  AUTO_EXTENDED: { icon: Clock, tone: "text-primary" },
};

export function NotificationIcon({ type, className }: { type: string; className?: string }) {
  const entry = ICONS[type] ?? { icon: Bell, tone: "text-muted-foreground" };
  const Icon = entry.icon;
  return <Icon className={cn("size-4", entry.tone, className)} />;
}
