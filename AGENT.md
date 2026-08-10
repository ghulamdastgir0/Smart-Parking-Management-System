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
  policy/          Admin policy-PDF upload/list/delete + RAG chunk search
  assistant/       AI assistant ("Adam") — LangGraph agent + tool registry, see below
common/
  realtime/        Socket.IO gateway (per-user rooms)
  notification/    Notification persistence service
  audit/           Append-only audit logging
  qr/              QR token generation
  embedding/       Local embedding model wrapper (@huggingface/transformers, used by policy RAG + assistant)
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
                    users,reservations,policies}
components/
  ui/              shadcn/ui primitives (button, dialog, form, table, ...)
  layout/          app-shell, sidebar, topbar, bottom-nav, breadcrumbs
  map/             Leaflet map components (nearby search, location picker)
  shared/          empty-state, error-state, page-header, status-badge,
                    confirm-dialog (shared destructive-action confirmation)
  assistant/       assistant-launcher (bottom-right FAB), assistant-panel
                    (floating chat window for Adam, the AI assistant)
  auth/, checkpoint/, theme/
features/          Feature-scoped API hooks (React Query) + types, one dir per
                    domain: auth, parking-lots (+ schemas.ts for the shared
                    floor Zod schema), parking-slots, reservations,
                    checkpoint, notifications, users, policies (admin PDF
                    upload/list/delete), assistant (SSE chat client — raw
                    fetch, not React Query, since it streams)
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

- **Backend**: NestJS 11, Prisma ORM + PostgreSQL, JWT auth (`passport-jwt`), bcrypt, `@nestjs/websockets` + Socket.IO, `@nestjs/schedule` cron, `qrcode`, Swagger at `/api` (dev only — disabled in production). AI assistant: `@langchain/langgraph` + `@langchain/google-genai` (Gemini) for the agent, `@huggingface/transformers` (local, offline `Xenova/all-MiniLM-L6-v2`, 384-dim — package is `@huggingface/transformers`, the maintained successor to the now-deprecated `@xenova/transformers`; the model id itself still lives under the `Xenova/` org on the HF Hub, unrelated to the npm package name) for policy-doc/query embeddings, `pdf-parse` for PDF text extraction.
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

Core models: `User`, `PaymentMethod`, `ParkingLot`, `ParkingFloor`, `ParkingSlot`, `Reservation`, `Payment`, `QrCode`, `Challan` (extension/overtime charges), `Notification`, `OccupancyLog`, `AuditLog`, `PolicyDocument`, `PolicyChunk` (admin-uploaded policy PDFs, chunked + embedded for the AI assistant's RAG tool).

- Slots belong to a floor, floors belong to a lot — pricing/status on the slot, row/column layout on the floor.
- `Reservation.status`: `CONFIRMED → CHECKED_IN → (OVERTIME) → PENDING_PAYMENT → COMPLETED`, or `CANCELLED` on no-show.
- `Challan` is uniquely keyed per `(reservation, type, forCheckoutAt)` so the monitoring cron's decisions are idempotent across ticks.
- `PaymentMethod` stores only cardholder name, brand, last-4, expiry — never a full PAN/CVV (dummy/sandboxed payment flow).
- `User.isBlocked` (default `false`) — see [Staff & account lifecycle](#staff--account-lifecycle).
- `ParkingLot.isActive` (default `true`) — deactivated lots are hidden from customers (404 on direct access) but stay visible/manageable for staff.
- `ParkingSlot.restrictedReason` (nullable) — set when `status` is toggled to `MAINTENANCE`, cleared when toggled back to `AVAILABLE`.
- `PolicyChunk.embedding` is a plain `Float[]` (Postgres `double precision[]`) — deliberately **not** pgvector, so no Postgres extension is required. Similarity search is brute-force cosine in application code (`PolicyService.search()`), which is fine at this corpus size (dozens–hundreds of chunks per document).

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

`CUSTOMER` (search/book/manage own profile — booking is CUSTOMER-only, enforced server-side via `@Roles(Role.CUSTOMER)` on `POST /reservations`), `MANAGER` (+ checkpoint scanning and slot/lot management for managed lots), `ADMIN` (full: lots/floors/staff/all reservations, policy documents). Enforced via `JwtAuthGuard` + `RolesGuard`/`@Roles()` on REST routes, and via `ToolRegistry.forRole()` for the AI assistant (see AI Assistant section) — both read from the same `Role` enum, so a new role-gated capability needs both the controller guard *and* (if it should be assistant-reachable) a tool registered with matching `roles`.

## Staff & account lifecycle

- **MANAGER/ADMIN accounts are never self-registered** — public registration (`POST /auth/register`) always creates a `CUSTOMER`. The only way to create a MANAGER or ADMIN account is `POST /users/staff` (ADMIN only, `backend/src/modules/users/dto/create-staff.dto.ts`), surfaced at `frontend/src/app/(app)/admin/managers/new/page.tsx` ("Add Staff", with a Manager/Admin role select). The `/admin/managers` route/nav label is "Staff" — it lists both roles (excluding the current admin) with Edit/Block/Unblock, plus Delete for `MANAGER` rows only (`DELETE /users/managers/:id` — deliberately does not allow deleting ADMIN accounts this way).
- **`/admin/users` shows CUSTOMER accounts only** — staff accounts are managed exclusively via `/admin/managers`, not the general Users list.
- **Blocking, not deleting, is the moderation tool for existing accounts**: `PATCH /users/:id/block` / `/unblock` (ADMIN only, any role) sets `User.isBlocked`, which `AuthService.login()` checks and rejects with 403 — blocking does **not** revoke an already-issued JWT, only future logins. Blocking additionally force-cancels the user's `CONFIRMED` reservations (frees the slot) in the same transaction; `CHECKED_IN` ones are left alone. A user may still delete their *own* account (`DELETE /users/me`, any role) — that's a separate, unrestricted self-service path.
- **Managers can't change their own email** (`UsersService.updateProfile` throws `ForbiddenException` when `requestingUserRole === MANAGER` and `dto.email` is set) — that identity is admin-owned; an admin can still change it for them via `PATCH /users/:id` → `adminUpdateProfile()`, which has no such restriction. The Edit-Profile dialog on `/profile` disables the email field for managers accordingly.
- **Slot restriction**: `PATCH /parking-slots/:id` toggles a single slot between `AVAILABLE`/`MAINTENANCE`; `PATCH /parking-slots/bulk-status` (registered *before* `:id` in the controller — see the ordering comment there) applies one status + reason to many slot ids at once, validating all of them up front (all-or-nothing). The staff-only "manage" mode of `SlotGrid` (`frontend/src/features/parking-slots/components/slot-grid.tsx`) is a multi-select UI over the bulk endpoint, not a modal-per-slot flow — don't reintroduce a one-at-a-time restrict dialog.

## API surface

Prefixed by backend base URL; interactive Swagger docs at `/api`. Key resources: `/auth`, `/users` (+ `/me`, `/me/password`, `/me/payment-method`, `/staff`, `/managers/:id`, `/:id`, `/:id/block|unblock`), `/parking-lots` (+ `/nearby`, `/:lotId/floors`, `/:lotId/floors/:floorId` (PATCH rename/renumber, DELETE) — `findAll`/`findOne`/`findNearby` require auth now and filter `isActive` for `CUSTOMER` role), `/parking-slots` (+ `/bulk-status`, `/:id`), `/reservations` (+ `/mine`, `/:id/cancel`, `/:id/checkout-payment/confirm|fail` — `POST /reservations` is CUSTOMER-only), `/checkpoint` (`/check-in`, `/check-out`), `/notifications`, `/policies` (ADMIN only — upload/list/delete policy PDFs), `/assistant/chat` + `/assistant/chat/resume` (SSE — see AI Assistant section below). README's API table predates this pass and is out of date for `/users`/`/parking-slots` — trust this file and the source over it until it's refreshed.

## AI Assistant ("Adam")

An in-app chat assistant (floating bottom-right launcher in `AppShell`, available to every authenticated role) that can do anything the signed-in user is allowed to do via the API, plus answer policy questions.

- **Agent**: `backend/src/modules/assistant/assistant.service.ts` builds a `createReactAgent` (`@langchain/langgraph/prebuilt`) per request, backed by `ChatGoogleGenerativeAI` (model/key from `GEMINI_MODEL`/`GEMINI_API_KEY`). System prompt names the assistant "Adam" and is built per-request with the caller's role/date context.
- **RBAC**: `ToolRegistry` (`tool-registry.ts`) holds every tool as a plain `{name, schema, roles, mutating, execute}` descriptor (see `tools/*.tools.ts`, one file per domain) and is filtered by the caller's `role` *before* the graph is built — a role's tool list simply doesn't include anything it can't do, so the model has no path to attempt a forbidden action. Every tool's `execute` calls straight into the existing Nest **services** (not HTTP), passing the real `AuthenticatedUser`, so service-level ownership checks (e.g. "manager only manages their own lot") and `AuditService` logging fire exactly as they do for the REST controllers.
- **Confirm-before-mutate**: any `mutating: true` tool is wrapped with LangGraph's `interrupt()` before it runs, pausing the graph and emitting an SSE `confirmation_required` event; the frontend shows Approve/Cancel; `POST /assistant/chat/resume` resumes via `new Command({ resume: approved })`. Backed by an in-memory `MemorySaver` (module singleton in `AssistantService`) — **not persisted to Postgres**, so history/pending confirmations reset on backend restart. Thread id = the user's own id (one continuous conversation per user, no client-side conversation id).
- **Streaming**: both endpoints are hand-rolled SSE (`@Res({ passthrough: false })`, manual `res.write`), not Nest's `@Sse()` — event types: `token`, `tool_call`, `tool_result`, `confirmation_required`, `done`, `error`. Frontend parses them with a manual `fetch()` + `ReadableStream` reader (`frontend/src/features/assistant/api.ts`) since the native `EventSource` API can't send a POST body/bearer header.
- **Security exclusion (deliberate)**: no tool exists for changing password, saving/replacing a payment method, or creating a staff account — those require a raw secret (password, full card number) to transit through the chat/LLM, which the system prompt is instructed to decline and redirect to the relevant Settings/Admin page instead.
- **Gemini schema gotcha**: Gemini's function-calling schema rejects some JSON-Schema keywords zod emits — notably `exclusiveMinimum` (from zod's `.positive()`). Use `.min(n)` instead of `.positive()` in any tool's zod schema. (`uuid()`, `email()`, `datetime()`, `.min()/.max()`, `.int()`, `enum` are all fine — verified empirically against the live API.)
- **Policy RAG**: `search_company_policies` tool → `PolicyService.search()` — embeds the query with the same local `EmbeddingService` used for ingestion, brute-force cosine over all `PolicyChunk` rows, top-5 returned as context. Admins upload/manage source PDFs at `/admin/policies` (`POST/GET/DELETE /policies`); only the extracted, chunked text is stored — the original PDF bytes are not persisted.

## Environment variables

**backend/.env**: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `FRONTEND_URL`, `MAPS_API_KEY`, `MAPS_API_BASE_URL`, `MAPS_MATRIX_URL`, `RESERVATION_CHECKIN_GRACE_MINUTES`, `CHECKOUT_GRACE_BUFFER_MINUTES`, `CHECKOUT_REMINDER_OFFSET_MINUTES`, `OVERTIME_PENALTY_MULTIPLIER`, `RESERVATION_MAX_ADVANCE_DAYS`, `GEMINI_API_KEY`, `GEMINI_MODEL` (AI assistant — see above).

**frontend/.env.local**: `NEXT_PUBLIC_API_URL`.

Never commit real secrets to these files; both are gitignored per-app. `backend/.env.production` (and any other `backend/.env.*`) is also gitignored — used to hold the real production `DATABASE_URL` (hosted Postgres) locally without it touching version control.

## Security hardening (backend)

- **`NODE_ENV=production` gates two things** in `main.ts`: the CORS check (blocks the "allow any origin" dev bypass) and Swagger — `SwaggerModule.setup('api/docs', ...)` only runs when `NODE_ENV !== 'production'`, so the API schema isn't publicly enumerable in prod. Both `Dockerfile`s set `NODE_ENV=production`; don't unset it in Cloud Run env vars.
- **`helmet()`** is applied globally in `main.ts` (sets `X-Frame-Options`, `X-Content-Type-Options`, HSTS, etc.).
- **Rate limiting**: `@nestjs/throttler`'s `ThrottlerGuard` is registered globally via `APP_GUARD` in `app.module.ts` (default: 100 req/min/IP). `POST /auth/login` and `POST /auth/register` (`auth.controller.ts`) have tighter per-route `@Throttle()` overrides (10/min and 5/min respectively) against credential stuffing.
- **`HttpExceptionFilter`** (`common/filters/http-exception.filter.ts`) only returns the raw `exception.message`/`exception.name` for unhandled (non-`HttpException`) errors when `NODE_ENV !== 'production'` — in production it returns a generic "Internal server error" instead, since an unhandled error's message can leak internal details (DB errors, paths). Deliberate `HttpException`s (validation errors, 401s, etc.) are unaffected and still return their real message in every environment.
- **Resolved**: the local embedding model previously ran on `@xenova/transformers`, whose `onnxruntime-web` → `protobufjs` chain carried an unpatched critical CVE. Migrated to `@huggingface/transformers` (maintained successor, same author, newer `onnxruntime-web` clear of that chain) — verified with a real embed call post-migration (384 dims, correct similarity ordering between related/unrelated sentences) before trusting it, not just a version bump on faith.

## Deployment (Cloud Run)

Both apps have production `Dockerfile`s (`backend/Dockerfile`, `frontend/Dockerfile`) targeting Cloud Run — two separate services, no shared image.

- **backend/Dockerfile**: multi-stage `node:24-slim` build. Production stage runs `npm ci --omit=dev`, so only `dependencies` ship — `prisma` (the CLI, not just `@prisma/client`) must stay a listed dependency for this to work. `prisma.config.ts` (project root, not inside `prisma/`) is copied explicitly into the production stage — it's what resolves `datasource.url` from `DATABASE_URL` for `prisma migrate deploy`; omitting it makes migrate deploy fail with a "datasource.url is required" error even though `DATABASE_URL` is set (this shipped broken once and was caught by a local end-to-end build test, not by inspection). Container `CMD` runs `prisma migrate deploy` before `node dist/main` — migrations apply automatically on every new revision's cold start. `main.ts` already binds `0.0.0.0` and reads `process.env.PORT`, which is what Cloud Run requires. Runs as the non-root `node` user.
- **frontend/Dockerfile**: multi-stage build using Next's `output: "standalone"` (set in `next.config.ts`). `NEXT_PUBLIC_API_URL` is a build `ARG`, not a runtime env var — Next inlines `NEXT_PUBLIC_*` vars into the client bundle at build time, so the backend's Cloud Run URL must be passed via `--build-arg`/substitution at image-build time, not set later as a Cloud Run service env var (setting it post-build has no effect). Runs as non-root `node` user; `HOSTNAME=0.0.0.0` is set explicitly since the standalone server defaults to `localhost` otherwise, which fails Cloud Run's health check.
- **Local validation pattern**: both images were verified with real `docker build` + `docker run` against a throwaway `postgres:16-alpine` container on a dedicated Docker network (not just `docker build` succeeding) — this is what caught the missing `prisma.config.ts`. Repeat this end-to-end boot test after any Dockerfile change rather than trusting a clean build alone.
- **Production DB is Supabase Postgres** (`aws-0-ap-south-1.pooler.supabase.com`). Two separate connection strings are required, both as Cloud Run env vars/secrets — mixing them up either hangs migrations or defeats the point of pooling for the app:
  - `DATABASE_URL` — the **transaction pooler** (port `6543`). What the running app uses (`PrismaService` constructs `PrismaPg` directly from `process.env.DATABASE_URL` — see `backend/src/prisma/prisma.service.ts`), fine for short ad-hoc queries/transactions.
  - `MIGRATE_DATABASE_URL` — the **session pooler** (same host, port `5432`). Required for `prisma migrate deploy`'s advisory locks/DDL — transaction-mode pooling doesn't support those and **hangs indefinitely instead of erroring** (burned ~15 min of build/debug time discovering this). The Dockerfile `CMD` overrides `DATABASE_URL` with `MIGRATE_DATABASE_URL` (falling back to `DATABASE_URL` if unset, so plain single-URL setups like the local Postgres test still work) for just the migrate step, then starts the app with the real `DATABASE_URL`.
  - Real credentials for both live in `backend/.env.production` (gitignored via `backend/.gitignore`'s `.env.*` pattern) — never commit it, never assume it matches `backend/.env` (dev still points at local Postgres).
  - **RLS is enabled with zero policies on every table** (migration `20260810120000_enable_row_level_security`) — deliberately, not an oversight. Supabase auto-exposes every `public` schema table through a PostgREST REST API by default; without RLS, anyone holding the project's `anon` key could read `User.password`/`QrCode.token` directly, bypassing the NestJS backend entirely (caught via Supabase's own database linter). The app's connection uses Supabase's `postgres` owner role, which bypasses RLS, so this has zero effect on app behavior — it only blocks PostgREST's `anon`/`authenticated` roles, which this app never uses anyway. If a future feature ever needs Supabase's REST API directly, it'll need real per-role policies, not just blanket enablement.
- **First ADMIN account**: since `POST /users/staff` (the only way to create staff) is itself ADMIN-gated, the very first admin has to be seeded directly into the DB, bypassing the API's password-complexity validation — done once via a one-off script (bcrypt-hashing with the same `SALT_ROUNDS = 10` as `auth.service.ts`, using the `PrismaPg` adapter pattern, run inside the built backend image via `docker cp` + `docker start`) rather than through any app code path. If another initial admin is ever needed, replicate that pattern rather than adding a permanent seed script/endpoint.
- **Live services** (project `internship26-gd`, region `asia-south1`, chosen to sit close to the Supabase DB's `ap-south-1`): backend `https://spms-backend-397963581210.asia-south1.run.app`, frontend `https://spms-frontend-397963581210.asia-south1.run.app`. Backend's `FRONTEND_URL` env var was updated post-deploy (`gcloud run services update --update-env-vars`) once the frontend's real URL was known — the two services have a circular URL dependency, so backend necessarily deploys first with a placeholder, then gets patched.
- **CI/CD**: pushes to `main` auto-build and auto-deploy both services via Cloud Build GitHub triggers (`spms-backend-deploy` → `backend/cloudbuild.yaml`, `spms-frontend-deploy` → `frontend/cloudbuild.yaml`; both build+push+`gcloud run deploy`, no manual step needed). Both run under a dedicated `spms-cloud-build@internship26-gd.iam.gserviceaccount.com` service account (`roles/cloudbuild.builds.builder`, `run.admin`, `artifactregistry.writer`, `iam.serviceAccountUser`, `logging.logWriter`) — this project requires an explicit user-managed service account; the default Cloud Build SA is rejected at build time (`invalid value for build.service_account`) even though earlier gcloud SDK versions still accept it at trigger-*creation* time, which is a confusing trap (trigger creation succeeds, then every build fails until you notice and swap the service account). GitHub connection itself goes through the classic 1st-gen "Cloud Build GitHub App" (`github.com/apps/google-cloud-build`) — installing the app on GitHub is necessary but not sufficient; you must also actually reach a completed state in Cloud Build's own **Repositories** page (Cloud Build → Repositories → 1st gen) before `gcloud builds triggers create github --repo-owner --repo-name` will stop returning a content-free `INVALID_ARGUMENT`.

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
