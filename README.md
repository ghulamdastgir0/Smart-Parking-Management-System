# Smart Parking Management System

A full-stack platform for finding, reserving, and managing parking across multiple lots — with QR-code based check-in/check-out, live occupancy tracking, automatic overtime/extension billing, and role-based dashboards for customers, on-site staff, and administrators.

Built with **NestJS + PostgreSQL (Prisma)** on the backend and **Next.js + Redux Toolkit + React Query** on the frontend, with **Socket.IO** for real-time updates.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Data Model](#data-model)
- [Reservation Lifecycle](#reservation-lifecycle)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [Roles & Access Control](#roles--access-control)

## Overview

Smart Parking Management System (SPMS) lets a **customer** search for nearby parking lots on a map, reserve a specific slot for a time window, and use a generated QR code to check in and out of the facility. **Parking staff / managers** scan those QR codes at a checkpoint to move a reservation through its lifecycle, and get real-time alerts when a vehicle overstays. **Admins** manage lots, floors, slots, users, and view system-wide reservation activity.

The system models real-world parking operations: multi-floor lots with per-floor slot grids, dynamic slot pricing, automatic no-show cancellation, automatic 1-hour extensions when a slot is still free, overtime penalties when another booking is queued for the same slot, and a dummy (sandboxed) payment flow for checkout billing.

## Key Features

- **Geolocation search** — find nearby parking lots by coordinates, ranked by distance, rendered on an interactive Leaflet/OpenStreetMap view with marker clustering.
- **Multi-floor slot management** — each lot has one or more floors, each with its own row/column slot grid, slot type (Standard/Large), and dynamic base pricing.
- **Reservations** — book a specific slot for a time window with real-time double-booking/overlap prevention.
- **QR-code check-in / check-out** — booking a slot issues a check-in QR; scanning it at the checkpoint occupies the slot and issues a check-out QR; scanning that computes the final charge and closes the reservation.
- **Automated lifecycle monitoring** (cron, every minute):
  - Auto-cancels reservations with no check-in within the grace window, freeing the slot.
  - Sends staged reminders as the reserved time approaches and enters its grace period.
  - **Auto-extends** a session by 1 hour (with a corresponding charge) if the slot has no queued reservation.
  - **Flags overtime** and alerts staff for immediate intervention if another reservation is waiting for the same slot.
- **Dummy payment processing** — checkout charges a saved payment method (masked card display only — no real PAN/CVV ever stored); a designated test card number simulates a decline for retry-flow testing.
- **Real-time notifications** — persisted in-app notifications plus Socket.IO push so a customer's dashboard updates instantly when staff scan their QR code on a different device.
- **Audit logging** — append-only audit trail for reservation, payment, and admin actions.
- **Role-based dashboards** — distinct views/permissions for `CUSTOMER`, `MANAGER`, and `ADMIN`.
- **API documentation** — interactive Swagger/OpenAPI docs generated from the NestJS controllers.

## Architecture

```
                          ┌─────────────────────┐
                          │   Next.js Frontend   │
                          │  (React, Redux, RQ)  │
                          └──────────┬───────────┘
                                     │ REST (Axios) + WebSocket
                                     ▼
                          ┌─────────────────────┐
                          │   NestJS Backend     │
                          │  Auth · Reservations │
                          │  Checkpoint · Lots   │
                          │  Notifications · RT  │
                          └──────────┬───────────┘
                     ┌───────────────┼────────────────┐
                     ▼               ▼                ▼
             ┌───────────────┐ ┌───────────┐ ┌──────────────────┐
             │  PostgreSQL   │ │ Cron jobs │ │ Socket.IO gateway │
             │   (Prisma)    │ │(@nestjs/  │ │ (per-user rooms)  │
             │               │ │ schedule) │ │                   │
             └───────────────┘ └───────────┘ └──────────────────┘
```

## Tech Stack

**Backend**
- [NestJS 11](https://nestjs.com/) (TypeScript)
- [Prisma ORM](https://www.prisma.io/) + PostgreSQL
- JWT authentication (`@nestjs/jwt`, `passport-jwt`), bcrypt password hashing
- `@nestjs/websockets` + Socket.IO for real-time push
- `@nestjs/schedule` for cron-based reservation monitoring
- `qrcode` for QR generation
- Swagger (`@nestjs/swagger`) for API docs

**Frontend**
- [Next.js 16](https://nextjs.org/) (App Router) + React 19
- Redux Toolkit (global/session-persistent UI state) + TanStack React Query (server state)
- Tailwind CSS + shadcn/ui component primitives
- React Leaflet + Leaflet.markercluster for map search
- `html5-qrcode` / `qrcode.react` for scanning and rendering QR codes
- Socket.IO client for live updates
- React Hook Form + Zod for form validation

## Data Model

Core Prisma models: `User`, `PaymentMethod`, `ParkingLot`, `ParkingFloor`, `ParkingSlot`, `Reservation`, `Payment`, `QrCode`, `Challan` (extension/overtime charges), `Notification`, `OccupancyLog`, `AuditLog`.

Highlights:
- Slots belong to a **floor**, floors belong to a **lot** — pricing and status live on the slot, layout (rows/columns) lives on the floor.
- A `Reservation` tracks status through `CONFIRMED → CHECKED_IN → (OVERTIME) → PENDING_PAYMENT → COMPLETED`, or `CANCELLED` on no-show.
- `Challan` records are uniquely keyed per `(reservation, type, forCheckoutAt)` so the monitoring cron's decisions are idempotent across ticks.
- `PaymentMethod` stores only cardholder name, brand, last 4 digits, and expiry — never a full card number, mirroring how real processors handle merchant-side storage.

See [backend/prisma/schema.prisma](backend/prisma/schema.prisma) for the full schema.

## Reservation Lifecycle

1. **Book** — customer reserves an available slot for a time window; a `CHECK_IN` QR code is generated.
2. **Check-in** — staff scans the QR at the checkpoint; the slot becomes `OCCUPIED`, the check-in QR is invalidated, and a `CHECK_OUT` QR is issued.
3. **Monitoring** — every minute, a cron job:
   - Cancels reservations that never checked in within the grace window.
   - Sends a 15-minutes-remaining reminder, an end-of-window notice, and a grace-period warning.
   - At grace-period expiry: **extends** the booking 1 hour and bills for it if the slot is free, or **flags overtime**, bills a penalty, and alerts staff if another reservation is queued.
4. **Check-out** — staff scans the checkout QR; the system totals the base charge plus any extension/overtime challans and charges the customer's saved payment method. On decline, the reservation stays `CHECKED_IN` and the same QR can be rescanned to retry.
5. **Complete** — on successful payment the reservation is `COMPLETED` and the slot returns to `AVAILABLE`.

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL instance

### Backend

```bash
cd backend
npm install
# create a .env file with the variables listed below
npm run prisma:migrate
npm run start:dev       # http://localhost:3000
```

Swagger docs are served at `/api` once the server is running.

### Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:3001
```

## Environment Variables

**Backend** (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign/verify JWTs |
| `JWT_EXPIRES_IN` | JWT expiry (e.g. `1d`) |
| `PORT` | Backend HTTP port |
| `FRONTEND_URL` | Allowed origin for CORS / Socket.IO |
| `MAPS_API_KEY` | API key for the driving-distance/ETA maps provider |
| `MAPS_API_BASE_URL` / `MAPS_MATRIX_URL` | Maps provider endpoints |
| `RESERVATION_CHECKIN_GRACE_MINUTES` | Minutes allowed before a no-show auto-cancels |
| `CHECKOUT_GRACE_BUFFER_MINUTES` | Grace period after reserved end time before extend/overtime resolution |
| `CHECKOUT_REMINDER_OFFSET_MINUTES` | Minutes-before-end reminder offset |
| `OVERTIME_PENALTY_MULTIPLIER` | Multiplier applied to the hourly rate for overtime penalties |
| `RESERVATION_MAX_ADVANCE_DAYS` | Max days in advance a reservation can be made |

**Frontend** (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API |

## Project Structure

```
backend/
  src/
    modules/
      auth/            # Registration, login, JWT strategy, role guards
      users/            # User + payment-method management
      parking-lot/       # Lots, floors, nearby search
      parking-slot/       # Slot listing/availability
      reservation/       # Booking, cancellation, monitoring cron
      checkpoint/         # QR check-in / check-out
      notification/       # In-app notifications
    common/
      realtime/          # Socket.IO gateway
      notification/       # Notification persistence service
      audit/              # Append-only audit logging
      qr/                 # QR token generation
  prisma/                # Schema + migrations

frontend/
  src/
    app/                 # Next.js App Router pages (auth, dashboard, admin, checkpoint, map...)
    features/             # Feature-scoped API hooks/components (reservations, parking-lots, ...)
    components/            # Shared UI, layout, map, auth components
    store/                 # Redux slices
```

## API Overview

All endpoints are prefixed by the backend base URL; interactive docs are available via Swagger at `/api`.

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login` |
| Users | `POST /users`, `GET /users`, `GET /users/me`, `PATCH /users/me/password`, `PUT /users/me/payment-method`, `GET /users/me/payment-method`, `GET /users/:id`, `DELETE /users/:id` |
| Parking Lots | `GET /parking-lots/nearby`, `GET /parking-lots`, `GET /parking-lots/:id`, `POST /parking-lots`, `PATCH /parking-lots/:id`, `DELETE /parking-lots/:id`, `GET/POST /parking-lots/:lotId/floors` |
| Parking Slots | `GET /parking-slots`, `GET /parking-slots/:id` |
| Reservations | `POST /reservations`, `GET /reservations/mine`, `GET /reservations`, `GET /reservations/:id`, `POST /reservations/:id/cancel`, `POST /reservations/:id/checkout-payment/confirm`, `POST /reservations/:id/checkout-payment/fail` |
| Checkpoint | `POST /checkpoint/check-in`, `POST /checkpoint/check-out` |
| Notifications | `GET /notifications/mine`, `PATCH /notifications/mine/read` |

## Roles & Access Control

| Role | Capabilities |
|---|---|
| `CUSTOMER` | Search lots, make/cancel reservations, manage own profile/payment method, view own notifications |
| `MANAGER` | Everything a customer can + operate the checkpoint (scan check-in/check-out QRs) for their managed lot(s) |
| `ADMIN` | Full access: manage lots/floors, manage users, view all reservations |

Access is enforced with JWT authentication (`JwtAuthGuard`) plus a `RolesGuard`/`@Roles()` decorator on protected routes.

---

*Speaker notes covering the project's architecture and workflows in presentation form are available in [`docs/SPEAKER_NOTES.md`](docs/SPEAKER_NOTES.md).*
