-- ReservationStatus: drop EXPIRED, add OVERTIME (table is empty, safe recreate)
ALTER TYPE "ReservationStatus" RENAME TO "ReservationStatus_old";
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'CHECKED_IN', 'OVERTIME', 'PENDING_PAYMENT', 'COMPLETED', 'CANCELLED');
ALTER TABLE "Reservation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Reservation" ALTER COLUMN "status" TYPE "ReservationStatus" USING (status::text::"ReservationStatus");
ALTER TABLE "Reservation" ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';
DROP TYPE "ReservationStatus_old";

-- CreateEnum
CREATE TYPE "ChallanType" AS ENUM ('EXTENSION', 'OVERTIME');

-- CreateEnum
CREATE TYPE "NotificationRecipientRole" AS ENUM ('USER', 'MANAGER');

-- CreateTable
CREATE TABLE "Challan" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "type" "ChallanType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "forCheckoutAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientRole" "NotificationRecipientRole" NOT NULL,
    "reservationId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "forCheckoutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Challan_reservationId_idx" ON "Challan"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "Challan_reservationId_type_forCheckoutAt_key" ON "Challan"("reservationId", "type", "forCheckoutAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_reservationId_type_forCheckoutAt_key" ON "Notification"("reservationId", "type", "forCheckoutAt");

-- AddForeignKey
ALTER TABLE "Challan" ADD CONSTRAINT "Challan_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
