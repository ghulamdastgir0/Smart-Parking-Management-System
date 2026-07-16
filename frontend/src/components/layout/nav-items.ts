import {
  Building2,
  LayoutDashboard,
  MapPin,
  ScanLine,
  Settings2,
  Ticket,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types/enums";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/nearby", label: "Nearby Parking", icon: MapPin },
  { href: "/parking-lots", label: "Parking Lots", icon: Building2 },
  {
    href: "/reservations",
    label: "My Reservations",
    icon: Ticket,
    roles: ["CUSTOMER"],
  },
  {
    href: "/admin/reservations",
    label: "Reservations",
    icon: Ticket,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/admin/parking-lots",
    label: "Manage Lots",
    icon: Settings2,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/checkpoint",
    label: "Checkpoint",
    icon: ScanLine,
    roles: ["ADMIN", "MANAGER"],
  },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["ADMIN"] },
  { href: "/profile", label: "Profile", icon: User },
];

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/nearby", label: "Nearby", icon: MapPin, roles: ["CUSTOMER"] },
  {
    href: "/reservations",
    label: "Bookings",
    icon: Ticket,
    roles: ["CUSTOMER"],
  },
  {
    href: "/admin/reservations",
    label: "Reservations",
    icon: Ticket,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/checkpoint",
    label: "Checkpoint",
    icon: ScanLine,
    roles: ["ADMIN", "MANAGER"],
  },
  { href: "/profile", label: "Profile", icon: User },
];

export function visibleNavItems(items: NavItem[], role: Role | undefined) {
  return items.filter((item) => !item.roles || (role && item.roles.includes(role)));
}
