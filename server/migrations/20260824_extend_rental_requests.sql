-- ============================================================
-- EXTEND rental_requests — deposit + return double-confirmation
-- Date: 2026-08-23
-- Depends on: 20260823_baseline_rental_tables.sql (Step A)
--
-- Purpose: Add the fields needed for the rental lifecycle to work:
--   1. deposit_amount          — security deposit, tracked separately
--      from total_amount. total_amount = rental fee only
--      (daily_rate x days_requested), NOT including deposit.
--   2. renter_confirmed_return / owner_confirmed_return —
--      double-confirm flags mirroring trade_offers.sender_confirmed /
--      receiver_confirmed (see server/routes/trades.js handleConfirmTrade).
--      The deposit is released ONLY when BOTH are TRUE.
--   3. Widen rental_requests.status CHECK to include 'cancelled'
--      (requester withdraws a pending request). rentals.status is
--      intentionally left untouched (available/requested/rented) —
--      when a request is declined/cancelled the rentals row is
--      reverted to 'available' by the app logic, no new status value.
--
-- IDEMPOTENT: all ALTERs use IF NOT EXISTS / IF EXISTS guards,
-- matching the convention in this repo's other migrations.
-- ============================================================

-- 1. Add the three new columns (each guarded so re-runs are safe).
ALTER TABLE rental_requests
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE rental_requests
  ADD COLUMN IF NOT EXISTS renter_confirmed_return BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE rental_requests
  ADD COLUMN IF NOT EXISTS owner_confirmed_return BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Widen the status CHECK to include 'cancelled'.
--    Drop the auto-named constraint first, then re-add with the full set.
--    Status lifecycle now: pending -> accepted -> (returned | cancelled)
--                            pending -> declined
ALTER TABLE rental_requests
  DROP CONSTRAINT IF EXISTS rental_requests_status_check;

ALTER TABLE rental_requests
  ADD CONSTRAINT rental_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'returned', 'cancelled'));

-- 3. Index for the "who still needs to confirm?" query path.
CREATE INDEX IF NOT EXISTS idx_rental_requests_confirm_flags
  ON rental_requests(renter_confirmed_return, owner_confirmed_return)
  WHERE status = 'accepted';

-- 4. Defensive CHECK: confirmation flags may only be set once the request
--    has reached 'accepted' (awaiting return confirmations) or 'returned'
--    (both parties have confirmed, deposit released). On pending/declined/
--    cancelled, both flags must remain FALSE. Mirrors the trade_offers
--    "only confirm while active" spirit in handleConfirmTrade.
ALTER TABLE rental_requests
  DROP CONSTRAINT IF EXISTS rental_requests_confirm_only_open;

ALTER TABLE rental_requests
  ADD CONSTRAINT rental_requests_confirm_only_open
  CHECK (
    status IN ('accepted', 'returned')
    OR (renter_confirmed_return = FALSE AND owner_confirmed_return = FALSE)
  );