-- Enums for every status column, a seat counter that the database guards with CHECK constraints,
-- a waitlist, a transactional outbox, and the fields the VNPay reconciliation job needs.
--
-- Written by hand: `prisma migrate diff` drops and re-creates the status columns, which would
-- delete every status. Here the columns are converted in place with USING casts, after unknown
-- legacy values (the old API accepted any status string) are normalised.
--
-- Prisma stores DateTime as UTC in timestamp(3) columns, so "now" is NOW() AT TIME ZONE 'UTC'
-- (plain NOW() would be compared through the session time zone).

-- ===== Enums =====
CREATE TYPE "BookingStatus" AS ENUM ('active', 'waitlisted', 'cancelled');
CREATE TYPE "SubscriptionStatus" AS ENUM ('pending', 'active', 'failed', 'expired');
CREATE TYPE "TokenUserType" AS ENUM ('member', 'staff');
CREATE TYPE "OutboxStatus" AS ENUM ('pending', 'processing', 'done', 'failed');

-- ===== Booking =====
-- The old API stored whatever status the client sent. Known seat-holding spellings become 'active',
-- every spelling of cancelled becomes 'cancelled', and anything unrecognised is treated as
-- cancelled: it must not take a seat it may never have been meant to hold.
UPDATE "Booking" SET "status" = CASE
  WHEN lower(trim("status")) IN ('active', 'confirmed', 'pending', 'booked') THEN 'active'
  ELSE 'cancelled'
END
WHERE "status" NOT IN ('active', 'cancelled');

ALTER TABLE "Booking"
  ALTER COLUMN "status" TYPE "BookingStatus" USING "status"::"BookingStatus",
  ADD COLUMN "waitlisted_at" TIMESTAMP(3),
  ADD COLUMN "waitlist_seq" BIGINT,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Queue order. Values are taken while the class row is locked, so they increase in the order
-- members joined the waitlist; timestamps from concurrent requests do not.
CREATE SEQUENCE "Booking_waitlist_seq" AS BIGINT;

DROP INDEX "Booking_class_id_idx";
CREATE INDEX "Booking_class_id_status_waitlist_seq_idx" ON "Booking"("class_id", "status", "waitlist_seq");

-- A waitlisted booking must have a place in the queue.
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_waitlisted_has_position"
  CHECK ("status" <> 'waitlisted' OR ("waitlisted_at" IS NOT NULL AND "waitlist_seq" IS NOT NULL));

-- ===== Class: seat counter =====
ALTER TABLE "Class" ADD COLUMN "booked_count" INTEGER NOT NULL DEFAULT 0;

UPDATE "Class" c
SET "booked_count" = sub.n
FROM (
  SELECT "class_id", COUNT(*)::int AS n FROM "Booking" WHERE "status" = 'active' GROUP BY "class_id"
) sub
WHERE sub."class_id" = c."id";

-- Classes the old code overbooked: those members really hold seats, so the capacity is raised to
-- match. Otherwise the CHECK below would refuse every later write to the row, including the
-- cancellations that would bring it back under capacity. Staff can lower it again once seats free up.
UPDATE "Class" SET "capacity" = "booked_count" WHERE "booked_count" > "capacity";

-- The last line of defence against overbooking: the database refuses any write that would sell
-- more seats than the class has, whatever the application code does.
ALTER TABLE "Class" ADD CONSTRAINT "Class_booked_count_within_capacity"
  CHECK ("booked_count" >= 0 AND "booked_count" <= "capacity");
-- NOT VALID: a legacy class with capacity 0 (and no bookings) is left as it is; new writes are checked.
ALTER TABLE "Class" ADD CONSTRAINT "Class_capacity_positive" CHECK ("capacity" > 0) NOT VALID;

-- ===== Subscription =====
-- Only spellings of known statuses are kept; an unknown status ('cancelled', 'suspended', ...)
-- never becomes 'active', because that would grant gym access.
UPDATE "Subscription"
SET "status" = CASE
  WHEN lower(trim("status")) IN ('pending', 'active', 'failed', 'expired') THEN lower(trim("status"))
  WHEN "start_date" IS NULL THEN 'failed'
  ELSE 'expired'
END
WHERE "status" NOT IN ('pending', 'active', 'failed', 'expired');

ALTER TABLE "Subscription"
  ALTER COLUMN "status" TYPE "SubscriptionStatus" USING "status"::"SubscriptionStatus",
  ADD COLUMN "amount" DECIMAL(65,30),
  ADD COLUMN "vnp_create_date" TEXT,
  ADD COLUMN "vnp_transaction_no" TEXT,
  ADD COLUMN "paid_at" TIMESTAMP(3),
  ADD COLUMN "failure_reason" TEXT,
  ADD COLUMN "reconcile_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "next_reconcile_at" TIMESTAMP(3);

-- Pending orders created before this migration.
-- Older than the 24-hour payment link: abandoned checkouts. Marked failed here, without queueing
-- a "payment failed" e-mail for every old cart. A late genuine IPN can still activate them
-- (see applyPaymentResult).
UPDATE "Subscription"
SET "status" = 'failed', "failure_reason" = 'legacy_abandoned'
WHERE "status" = 'pending' AND "created_at" < (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 day';

-- Recent ones: snapshot the price and let the reconciler ask VNPay about them.
UPDATE "Subscription" s
SET "amount" = p."price", "next_reconcile_at" = (NOW() AT TIME ZONE 'UTC')
FROM "Package" p
WHERE p."id" = s."package_id" AND s."status" = 'pending';

CREATE INDEX "Subscription_status_next_reconcile_at_idx" ON "Subscription"("status", "next_reconcile_at");

-- ===== Member: password reset attempts =====
-- A reset code is invalidated after 5 wrong guesses (on top of the per-IP rate limit).
ALTER TABLE "Member" ADD COLUMN "reset_attempts" INTEGER NOT NULL DEFAULT 0;

-- ===== RefreshToken =====
-- A token with an unknown user type could never be refreshed; drop it instead of guessing.
DELETE FROM "RefreshToken" WHERE "user_type" NOT IN ('member', 'staff');

ALTER TABLE "RefreshToken"
  ALTER COLUMN "user_type" TYPE "TokenUserType" USING "user_type"::"TokenUserType";

-- Every refresh looks the token up by its hash.
CREATE INDEX "RefreshToken_token_hash_idx" ON "RefreshToken"("token_hash");

-- ===== Checkin =====
CREATE INDEX "Checkin_checkin_time_idx" ON "Checkin"("checkin_time");

-- ===== Outbox =====
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OutboxEvent_status_available_at_idx" ON "OutboxEvent"("status", "available_at");
