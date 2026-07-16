-- Slot numbering restarts per floor (each floor's grid begins at "A1"), so uniqueness must
-- be scoped to floor, not lot — otherwise a second floor on the same lot collides with the
-- first floor's slot numbers.
DROP INDEX "ParkingSlot_lotId_slotNumber_key";

CREATE UNIQUE INDEX "ParkingSlot_floorId_slotNumber_key" ON "ParkingSlot"("floorId", "slotNumber");
