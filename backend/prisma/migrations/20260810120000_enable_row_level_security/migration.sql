-- This app only ever connects to Postgres directly (via Prisma's PrismaPg adapter), never
-- through Supabase's auto-generated PostgREST API — so no RLS policies are defined here on
-- purpose. Enabling RLS with zero policies denies all access to PostgREST's `anon`/
-- `authenticated` roles by default, closing off direct unauthenticated reads of sensitive
-- columns (User.password, QrCode.token, etc.) that Supabase's REST API would otherwise expose
-- to anyone holding the project's anon key. The app's own connection uses Supabase's `postgres`
-- owner role, which bypasses RLS entirely, so this has no effect on application behavior.

ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ParkingLot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ParkingFloor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ParkingSlot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Reservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."OccupancyLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."QrCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Challan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PolicyDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PolicyChunk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
