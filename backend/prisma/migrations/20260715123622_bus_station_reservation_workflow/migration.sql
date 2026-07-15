/*
  Warnings:

  - You are about to drop the column `qrCodeToken` on the `Reservation` table. All the data in the column will be lost.
  - Added the required column `columns` to the `ParkingLot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rows` to the `ParkingLot` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QrCodeType" AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- CreateEnum
CREATE TYPE "QrCodeStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED');

-- DropIndex
DROP INDEX "Reservation_qrCodeToken_key";

-- AlterTable
ALTER TABLE "ParkingLot" ADD COLUMN     "columns" INTEGER NOT NULL,
ADD COLUMN     "rows" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "qrCodeToken";

-- CreateTable
CREATE TABLE "QrCode" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "type" "QrCodeType" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "QrCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QrCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QrCode_token_key" ON "QrCode"("token");

-- CreateIndex
CREATE INDEX "QrCode_reservationId_type_idx" ON "QrCode"("reservationId", "type");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "QrCode" ADD CONSTRAINT "QrCode_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
