-- ============================================================
-- ADD COMMISSION COLUMNS TO rental_bookings
-- Date:    2026-09-28
-- Purpose: Snapshot commission figures at booking-creation time
--          so later config changes never alter old bookings.
--
-- Design decisions:
--   1. All three columns are nullable.
--      NULL = legacy booking created before this migration.
--      Legacy bookings pay out their full agreed_total_amount
--      (no commission was ever charged on them).
--   2. commission_rate is stored as a NUMERIC fraction (e.g. 0.10),
--      NOT exposed to borrowers — only shown on owner-facing and
--      admin-facing API responses.
--   3. commission_amount = roundRupees(agreed_total_amount * commission_rate)
--      owner_payout_amount = agreed_total_amount - commission_amount
--      These two always sum exactly to agreed_total_amount.
--   4. No existing rows or constraints are dropped or renamed.
-- ============================================================

BEGIN;

-- 1. commission_rate: fraction snapshotted at booking time (e.g. 0.10 for 10%).
ALTER TABLE rental_bookings
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC;

-- 2. commission_amount: whole-rupee amount the platform keeps.
ALTER TABLE rental_bookings
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC;

-- 3. owner_payout_amount: whole-rupee amount the owner receives.
--    = agreed_total_amount - commission_amount for new bookings.
--    = agreed_total_amount for legacy rows (commission_amount IS NULL).
ALTER TABLE rental_bookings
  ADD COLUMN IF NOT EXISTS owner_payout_amount NUMERIC;

-- 4. Non-negative check: when present, commission and payout must be >= 0.
ALTER TABLE rental_bookings
  DROP CONSTRAINT IF EXISTS rental_bookings_commission_non_negative;

ALTER TABLE rental_bookings
  ADD CONSTRAINT rental_bookings_commission_non_negative
  CHECK (
    commission_amount IS NULL OR commission_amount >= 0
  );

ALTER TABLE rental_bookings
  DROP CONSTRAINT IF EXISTS rental_bookings_payout_non_negative;

ALTER TABLE rental_bookings
  ADD CONSTRAINT rental_bookings_payout_non_negative
  CHECK (
    owner_payout_amount IS NULL OR owner_payout_amount >= 0
  );

-- 5. Consistency check: when both are present, payout + commission = agreed_total_amount.
--    Cast to NUMERIC to avoid integer truncation in the comparison.
ALTER TABLE rental_bookings
  DROP CONSTRAINT IF EXISTS rental_bookings_payout_consistency;

ALTER TABLE rental_bookings
  ADD CONSTRAINT rental_bookings_payout_consistency
  CHECK (
    owner_payout_amount IS NULL
    OR commission_amount IS NULL
    OR (owner_payout_amount + commission_amount = agreed_total_amount)
  );

-- 6. Index for admin payout dashboard queries.
CREATE INDEX IF NOT EXISTS idx_rental_bookings_payout_amount
  ON rental_bookings (owner_payout_amount)
  WHERE owner_payout_amount IS NOT NULL;

COMMIT;
