-- AlterTable
ALTER TABLE "ParkingLot" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ParkingSlot" ADD COLUMN     "restrictedReason" VARCHAR(255);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false;

