-- Ensure gen_random_uuid() is available regardless of Postgres version/build
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateTable
CREATE TABLE "ParkingFloor" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "rows" INTEGER NOT NULL,
    "columns" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkingFloor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParkingFloor_lotId_floorNumber_key" ON "ParkingFloor"("lotId", "floorNumber");

-- AddForeignKey
ALTER TABLE "ParkingFloor" ADD CONSTRAINT "ParkingFloor_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ParkingLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: give every existing lot a single "Ground Floor" carrying over its old
-- rows/columns, so pre-existing slots have somewhere to attach.
INSERT INTO "ParkingFloor" ("id", "lotId", "name", "floorNumber", "rows", "columns", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", 'Ground Floor', 0, "rows", "columns", now(), now()
FROM "ParkingLot";

-- AlterTable: add floorId nullable first so existing rows can be backfilled below
ALTER TABLE "ParkingSlot" ADD COLUMN "floorId" TEXT;

-- Data migration: attach existing slots to their lot's new Ground Floor
UPDATE "ParkingSlot" AS slot
SET "floorId" = floor."id"
FROM "ParkingFloor" AS floor
WHERE floor."lotId" = slot."lotId" AND floor."floorNumber" = 0;

-- Now safe to enforce NOT NULL + FK on the backfilled column
ALTER TABLE "ParkingSlot" ALTER COLUMN "floorId" SET NOT NULL;
ALTER TABLE "ParkingSlot" ADD CONSTRAINT "ParkingSlot_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "ParkingFloor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: drop the now-meaningless lot-level layout columns (capacity moved to ParkingFloor)
ALTER TABLE "ParkingLot" DROP COLUMN "columns",
DROP COLUMN "rows";
