-- The per-cycle idempotency key was missing recipientId, so a MANAGER notification for the
-- same (reservation, type, cycle) as an already-sent USER notification was wrongly treated
-- as a duplicate and skipped.
DROP INDEX "Notification_reservationId_type_forCheckoutAt_key";

CREATE UNIQUE INDEX "Notification_recipientId_reservationId_type_forCheckoutAt_key"
  ON "Notification"("recipientId", "reservationId", "type", "forCheckoutAt");
