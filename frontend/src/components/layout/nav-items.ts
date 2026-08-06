import {
  Building2,
  FileText,
  LayoutDashboard,
  MapPin,
  ScanLine,
  Ticket,
  User,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types/enums";

export interface NavItem {
  href: string;
  label: string;
  /** Shorter label for the bottom tab bar, where space is tight. Falls back to `label`. */
  shortLabel?: string;
  icon: LucideIcon;
  roles?: Role[];
}

// Order matters: the bottom nav bar pins items from the front of this list and pushes
// whatever doesn't fit into the "More" sheet, so put the highest-priority items first.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  {
    href: "/nearby",
    label: "Nearby Parking",
    shortLabel: "Nearby",
    icon: MapPin,
    roles: ["CUSTOMER"],
  },
  { href: "/parking-lots", label: "Parking Lots", shortLabel: "Lots", icon: Building2 },
  {
    href: "/reservations",
    label: "My Reservations",
    shortLabel: "Bookings",
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
  { href: "/admin/users", label: "Users", icon: Users, roles: ["ADMIN"] },
  { href: "/admin/managers", label: "Staff", icon: UserCog, roles: ["ADMIN"] },
  { href: "/admin/policies", label: "Policies", icon: FileText, roles: ["ADMIN"] },
  { href: "/profile", label: "Profile", icon: User },
];

// Total tab slots in the bottom bar, including the trailing "More" tab once it's needed.
// If a role's visible item count fits within this budget, every item gets its own tab and
// no "More" tab is rendered at all.
export const BOTTOM_NAV_MAX_TABS = 5;

export function visibleNavItems(items: NavItem[], role: Role | undefined) {
  return items.filter((item) => !item.roles || (role && item.roles.includes(role)));
}
