# AGENT.md

Reference doc for AI coding agents working in this repo. Keep this file in sync with the codebase — **update it whenever you make a structural edit** (new module/feature, new env var, changed script, changed data model, changed API route).

## What this project is

Smart Parking Management System (SPMS): a full-stack platform for finding, reserving, and managing parking across multiple lots — QR-code check-in/check-out, live occupancy tracking, automatic overtime/extension billing, and role-based dashboards for customers, staff, and admins.

Full product/architecture writeup lives in [README.md](README.md) — read it for the "why" (reservation lifecycle, data model rationale, feature list). This file is the "where/how" for making changes.

## Repo layout

Two independent apps, no monorepo tooling (no shared root package.json/workspaces) — install and run each separately.

```
backend/     NestJS 11 + Prisma + PostgreSQL API (port 3000)
frontend/    Next.js 16 (App Router) + React 19 (port 3001)
docs/        SPEAKER_NOTES.md — presentation-form architecture walkthrough
```

### backend/src

```
modules/
  auth/            Register, login, JWT strategy, RolesGuard/@Roles()
  users/           User + payment-method management
  parking-lot/     Lots, floors, nearby search, maps/distance service
  parking-slot/    Slot listing/availability
  reservation/     Booking, cancellation, billing, monitoring cron
  checkpoint/      QR check-in / check-out
  notification/    In-app notifications
common/
  realtime/        Socket.IO gateway (per-user rooms)
  notification/    Notification persistence service
  audit/           Append-only audit logging
  qr/              QR token generation
  exceptions/      Custom exceptions (e.g. slot-unavailable)
  filters/         Global HTTP exception filter
  validators/      Reusable class-validator decorators (password complexity, Luhn)
prisma/            schema.prisma + migrations/
```

Each module follows standard Nest conventions: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `dto/`.

### frontend/src

```
app/               Next.js App Router pages
  (auth)/          login, register
  (app)/           dashboard, nearby, parking-lots (+ [id], [id]/book — single
                    route, branches by role between customer browse/book and
                    staff manage view), reservations, checkpoint, notifications,
                    profile, admin/{parking-lots/{new,[id]/edit},managers/{new},
                    users,reservations}
components/
  ui/              shadcn/ui primitives (button, dialog, form, table, ...)
  layout/          app-shell, sidebar, topbar, bottom-nav, breadcrumbs
  map/             Leaflet map components (nearby search, location picker)
  shared/          empty-state, error-state, page-header, status-badge,
                    confirm-dialog (shared destructive-action confirmation)
  auth/, checkpoint/, theme/
features/          Feature-scoped API hooks (React Query) + types, one dir per
                    domain: auth, parking-lots (+ schemas.ts for the shared
                    floor Zod schema), parking-slots, reservations,
                    checkpoint, notifications, users
store/             Redux Toolkit slices (filters, ui) — client/UI state only;
                    server state goes through React Query in features/*
lib/               api-client (axios), auth-token, jwt, billing, format,
                    geocode, card-form, query-provider, validators.ts (shared
                    Zod field builders: email/name/password), form-errors.ts
                    (setServerFieldError, useConfirmFieldSync)
hooks/             use-countdown, use-debounced-value, use-geolocation,
                    use-realtime-sync (Socket.IO)
types/             enums.ts (shared enums mirroring backend)
```

Pattern: server state = React Query (`features/*/api.ts` + `hooks.ts`); global UI state = Redux (`store/slices/*`); forms = React Hook Form + Zod.

## Tech stack

- **Backend**: NestJS 11, Prisma ORM + PostgreSQL, JWT auth (`passport-jwt`), bcrypt, `@nestjs/websockets` + Socket.IO, `@nestjs/schedule` cron, `qrcode`, Swagger at `/api`.
- **Frontend**: Next.js 16 App Router, React 19, Redux Toolkit, TanStack React Query, Tailwind CSS + shadcn/ui, React Leaflet, `html5-qrcode`/`qrcode.react`, Socket.IO client, React Hook Form + Zod.

## Commands

**Backend** (`cd backend`)
```
npm run start:dev       # dev server w/ watch, http://localhost:3000
npm run build            # nest build
npm run lint              # eslint --fix
npm run format             # prettier --write
npm test                    # jest unit tests
npm run test:e2e             # jest e2e (test/jest-e2e.json)
npm run prisma:migrate        # apply/create a migration (dev)
npm run prisma:generate        # regenerate Prisma client
npm run prisma:studio           # open Prisma Studio
```

**Frontend** (`cd frontend`)
```
npm run dev      # next dev -p 3001
npm run build     # next build
npm run lint        # eslint
```

There is no root-level install/build — run npm commands inside `backend/` or `frontend/`.

## Data model (Prisma)

Core models: `User`, `PaymentMethod`, `ParkingLot`, `ParkingFloor`, `ParkingSlot`, `Reservation`, `Payment`, `QrCode`, `Challan` (extension/overtime charges), `Notification`, `OccupancyLog`, `AuditLog`.

- Slots belong to a floor, floors belong to a lot — pricing/status on the slot, row/column layout on the floor.
- `Reservation.status`: `CONFIRMED → CHECKED_IN → (OVERTIME) → PENDING_PAYMENT → COMPLETED`, or `CANCELLED` on no-show.
- `Challan` is uniquely keyed per `(reservation, type, forCheckoutAt)` so the monitoring cron's decisions are idempotent across ticks.
- `PaymentMethod` stores only cardholder name, brand, last-4, expiry — never a full PAN/CVV (dummy/sandboxed payment flow).
- `User.isBlocked` (default `false`) — see [Staff & account lifecycle](#staff--account-lifecycle).
- `ParkingLot.isActive` (default `true`) — deactivated lots are hidden from customers (404 on direct access) but stay visible/manageable for staff.
- `ParkingSlot.restrictedReason` (nullable) — set when `status` is toggled to `MAINTENANCE`, cleared when toggled back to `AVAILABLE`.

Full schema: [backend/prisma/schema.prisma](backend/prisma/schema.prisma). Always add a Prisma migration (`npm run prisma:migrate`) alongside any schema change — never hand-edit migration SQL after it's applied.

## Validation conventions

Validated at three tiers — keep all three in sync when changing a field's constraints:

- **Frontend (Zod)**: reuse `frontend/src/lib/validators.ts` (`emailField`, `nameField(label)`, `newPasswordField` — min 8/max 72 chars, ≥3 of 4 character classes) instead of inlining `z.string().email()`/`.min(8)` per form. Confirm-password fields need `useConfirmFieldSync(form, sourceField, targetField)` (`frontend/src/lib/form-errors.ts`) so a mismatch clears when the *other* password field is edited, not just itself. Server-side errors (e.g. login/change-password failures) should be surfaced via `setServerFieldError(form, error, field)` so they render as a real `FormMessage` and self-clear on the next edit, not just a transient toast.
- **Backend (class-validator DTOs)**: `@MaxLength` on every free-text field; `backend/src/common/validators/` has reusable decorators — `@IsPasswordComplex()` and `@IsLuhnValid()` — for anything requiring the same rule elsewhere. Numeric limits mirror the frontend's (e.g. names ≤20 chars, email ≤254, addresses ≤255).
- **Database (Prisma)**: `@db.VarChar(n)` on the same fields in `schema.prisma`, applied via a real migration — never widen/narrow a column without one. `User.password` (bcrypt hash) and server-generated text (`Notification.title/message`, `Challan.reason`, `AuditLog.*`) are deliberately left unbounded.

Destructive actions (delete lot/user, cancel reservation) use the shared `<ConfirmDialog>` (`frontend/src/components/shared/confirm-dialog.tsx`) rather than a hand-rolled `Dialog` — it wires up the pending/disabled state and destructive styling consistently.

## Reservation lifecycle (see README for full detail)

Book → check-in (QR scan, slot → OCCUPIED) → cron monitoring (no-show cancel, reminders, auto-extend +1h if slot free, else flag overtime + penalty) → check-out (QR scan, bill = base + challans) → COMPLETED, slot → AVAILABLE. Monitoring cron runs every minute via `@nestjs/schedule` in `reservation-monitoring.service.ts`.

## Onboarding

`frontend/src/app/(auth)/register/page.tsx` is a two-step wizard in one page: step 1 creates the account (`useRegister`, no navigation on success), step 2 reuses `BillingForm` to collect a payment method, then hard-navigates to `/dashboard` once saved — a new customer never passes through `/complete-profile` or sees any dashboard chrome mid-signup. `/complete-profile` still exists as a fallback for accounts that reach `AppShell` without a payment method (`needsBilling` in `app-shell.tsx`); that route intentionally renders without the sidebar/topbar/bottom-nav since it's still onboarding, not real app usage.

## Roles & access control

`CUSTOMER` (search/book/manage own profile — booking is CUSTOMER-only, enforced server-side via `@Roles(Role.CUSTOMER)` on `POST /reservations`), `MANAGER` (+ checkpoint scanning and slot/lot management for managed lots), `ADMIN` (full: lots/floors/staff/all reservations). Enforced via `JwtAuthGuard` + `RolesGuard`/`@Roles()`.

## Staff & account lifecycle

- **MANAGER/ADMIN accounts are never self-registered** — public registration (`POST /auth/register`) always creates a `CUSTOMER`. The only way to create a MANAGER or ADMIN account is `POST /users/staff` (ADMIN only, `backend/src/modules/users/dto/create-staff.dto.ts`), surfaced at `frontend/src/app/(app)/admin/managers/new/page.tsx` ("Add Staff", with a Manager/Admin role select). The `/admin/managers` route/nav label is "Staff" — it lists both roles (excluding the current admin) with Edit/Block/Unblock, plus Delete for `MANAGER` rows only (`DELETE /users/managers/:id` — deliberately does not allow deleting ADMIN accounts this way).
- **`/admin/users` shows CUSTOMER accounts only** — staff accounts are managed exclusively via `/admin/managers`, not the general Users list.
- **Blocking, not deleting, is the moderation tool for existing accounts**: `PATCH /users/:id/block` / `/unblock` (ADMIN only, any role) sets `User.isBlocked`, which `AuthService.login()` checks and rejects with 403 — blocking does **not** revoke an already-issued JWT, only future logins. Blocking additionally force-cancels the user's `CONFIRMED` reservations (frees the slot) in the same transaction; `CHECKED_IN` ones are left alone. A user may still delete their *own* account (`DELETE /users/me`, any role) — that's a separate, unrestricted self-service path.
- **Managers can't change their own email** (`UsersService.updateProfile` throws `ForbiddenException` when `requestingUserRole === MANAGER` and `dto.email` is set) — that identity is admin-owned; an admin can still change it for them via `PATCH /users/:id` → `adminUpdateProfile()`, which has no such restriction. The Edit-Profile dialog on `/profile` disables the email field for managers accordingly.
- **Slot restriction**: `PATCH /parking-slots/:id` toggles a single slot between `AVAILABLE`/`MAINTENANCE`; `PATCH /parking-slots/bulk-status` (registered *before* `:id` in the controller — see the ordering comment there) applies one status + reason to many slot ids at once, validating all of them up front (all-or-nothing). The staff-only "manage" mode of `SlotGrid` (`frontend/src/features/parking-slots/components/slot-grid.tsx`) is a multi-select UI over the bulk endpoint, not a modal-per-slot flow — don't reintroduce a one-at-a-time restrict dialog.

## API surface

Prefixed by backend base URL; interactive Swagger docs at `/api`. Key resources: `/auth`, `/users` (+ `/me`, `/me/password`, `/me/payment-method`, `/staff`, `/managers/:id`, `/:id`, `/:id/block|unblock`), `/parking-lots` (+ `/nearby`, `/:lotId/floors` — `findAll`/`findOne`/`findNearby` require auth now and filter `isActive` for `CUSTOMER` role), `/parking-slots` (+ `/bulk-status`, `/:id`), `/reservations` (+ `/mine`, `/:id/cancel`, `/:id/checkout-payment/confirm|fail` — `POST /reservations` is CUSTOMER-only), `/checkpoint` (`/check-in`, `/check-out`), `/notifications`. README's API table predates this pass and is out of date for `/users`/`/parking-slots` — trust this file and the source over it until it's refreshed.

## Environment variables

**backend/.env**: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `FRONTEND_URL`, `MAPS_API_KEY`, `MAPS_API_BASE_URL`, `MAPS_MATRIX_URL`, `RESERVATION_CHECKIN_GRACE_MINUTES`, `CHECKOUT_GRACE_BUFFER_MINUTES`, `CHECKOUT_REMINDER_OFFSET_MINUTES`, `OVERTIME_PENALTY_MULTIPLIER`, `RESERVATION_MAX_ADVANCE_DAYS`.

**frontend/.env.local**: `NEXT_PUBLIC_API_URL`.

Never commit real secrets to these files; both are gitignored per-app.

## Real-time

Socket.IO gateway (`backend/src/common/realtime/realtime.gateway.ts`) pushes to per-user rooms. Frontend consumes it via `frontend/src/hooks/use-realtime-sync.ts` — this replaced polling (see git history: "Replace polling with websocket"). When adding a feature that needs live updates on the client, prefer wiring into this gateway/hook rather than adding new polling. The hook also surfaces connect/disconnect state via a stable-id sonner toast (`"realtime-status"`) so a dropped socket isn't silently missed — keep the id stable if you touch this so reconnect retries replace-in-place instead of stacking toasts.

## UI conventions / gotchas

- **Dialog z-index**: `frontend/src/components/ui/dialog.tsx` uses `z-[1000]`/`z-[1001]`, not Tailwind's default `z-50` — Leaflet's own controls (`.leaflet-top`/`.leaflet-bottom`) sit at `z-index: 1000` by default and will render on top of a `z-50` dialog on any page with a map (lot detail/edit/new all embed one). Don't drop this back to `z-50`.
- **Breadcrumbs** (`frontend/src/components/layout/breadcrumbs.tsx`) naively join URL segments into hrefs, which assumes every path prefix is a real page. `/admin/parking-lots/[id]/...` breaks that assumption — the bare `/admin/parking-lots/[id]` prefix isn't a route (the real detail page is the sibling `/parking-lots/[id]`), so `resolveHref` special-cases exactly that one segment (index 2, admin/parking-lots/&lt;uuid&gt;) to point there instead. If you add another route with a similar "prefix isn't a real page" mismatch, extend `resolveHref` rather than the naive join — and keep the special-case keyed to the exact segment index, not just "prefix contains a uuid," or you'll get duplicate React keys on deeper segments (this shipped as a bug once already).
- Parking-lot list/detail/management UI lives under the single `/parking-lots` route (see repo layout above) — there is no separate `/admin/parking-lots` list page anymore, only `/admin/parking-lots/new` and `/admin/parking-lots/[id]/edit` (linked from the detail page's staff-only Edit button, not from a list).

## Frontend-specific agent note

`frontend/AGENTS.md` (auto-loaded by some tools as `frontend/CLAUDE.md`) flags that this repo's Next.js version may have breaking changes vs. training data — check `frontend/node_modules/next/dist/docs/` before relying on prior Next.js knowledge when working in `frontend/`.

## Maintenance

This file must be kept current. When you make a change that affects the facts above (new module, new route, new env var, changed script, schema change, new top-level directory), update the relevant section here in the same change.
