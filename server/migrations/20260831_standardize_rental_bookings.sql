-- ============================================================
-- STANDARDIZE rental_bookings to the sanctioned schema
-- Date: 2026-08-31
--
-- Purpose:
--   1. Add meeting_location
--   2. Add payment fields mirroring the proven rental_requests flow
--   3. Add deposit_amount
--   4. Add split pickup/return confirmation flags
--   5. Add updated_at trigger to keep booking timestamps fresh
--
-- This migration intentionally does not touch `rentals` data or
-- rental_requests. It updates the sanctioned `rental_bookings` table
-- only, in line with the live schema design already approved.
-- ============================================================

BEGIN;

-- 1) Booking-level meeting location.
ALTER TABLE rental_bookings
  ADD COLUMN IF NOT EXISTS meeting_location TEXT;

-- 2) Security deposit on the booking itself.
ALTER TABLE rental_bookings
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC NOT NULL DEFAULT 0;

-- 3) Payment verification fields, matching the proven rental_requests pattern.
ALTER TABLE rental_bookings
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_utr TEXT,
  ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_rejected_at TIMESTAMPTZ;

ALTER TABLE rental_bookings
  DROP CONSTRAINT IF EXISTS rental_bookings_payment_status_check;

ALTER TABLE rental_bookings
  ADD CONSTRAINT rental_bookings_payment_status_check
  CHECK (payment_status IN ('unpaid', 'pending_verification', 'paid', 'rejected'));

-- 4) Pickup confirmation fields for borrower/owner double confirmation.
ALTER TABLE rental_bookings
  ADD COLUMN IF NOT EXISTS borrower_confirmed_pickup BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS owner_confirmed_pickup BOOLEAN NOT NULL DEFAULT FALSE;

-- 5) Return confirmation fields for borrower/owner double confirmation.
ALTER TABLE rental_bookings
  ADD COLUMN IF NOT EXISTS borrower_confirmed_return BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS owner_confirmed_return BOOLEAN NOT NULL DEFAULT FALSE;

-- 6) Split confirmation constraints: pickup and return are separate states.
ALTER TABLE rental_bookings
  DROP CONSTRAINT IF EXISTS rental_bookings_pickup_flags_only_active;

ALTER TABLE rental_bookings
  ADD CONSTRAINT rental_bookings_pickup_flags_only_active
  CHECK (
    status IN ('accepted', 'active', 'return_pending', 'completed', 'disputed')
    OR (
      borrower_confirmed_pickup = FALSE AND
      owner_confirmed_pickup = FALSE
    )
  );

ALTER TABLE rental_bookings
  DROP CONSTRAINT IF EXISTS rental_bookings_return_flags_only_active;

ALTER TABLE rental_bookings
  ADD CONSTRAINT rental_bookings_return_flags_only_active
  CHECK (
    status IN ('active', 'return_pending', 'completed', 'disputed')
    OR (
      borrower_confirmed_return = FALSE AND
      owner_confirmed_return = FALSE
    )
  );

-- 7) Auto-update booking timestamps using a standard Postgres trigger.
CREATE OR REPLACE FUNCTION set_rental_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rental_bookings_updated_at ON rental_bookings;

CREATE TRIGGER trg_rental_bookings_updated_at
BEFORE UPDATE ON rental_bookings
FOR EACH ROW
EXECUTE FUNCTION set_rental_bookings_updated_at();

-- 8) Indexes for admin/payment and state queries.
CREATE INDEX IF NOT EXISTS idx_rental_bookings_pickup_flags
  ON rental_bookings (borrower_confirmed_pickup, owner_confirmed_pickup)
  WHERE status IN ('accepted', 'active', 'return_pending');

CREATE INDEX IF NOT EXISTS idx_rental_bookings_return_flags
  ON rental_bookings (borrower_confirmed_return, owner_confirmed_return)
  WHERE status IN ('active', 'return_pending', 'completed', 'disputed');

CREATE INDEX IF NOT EXISTS idx_rental_bookings_payment_status
  ON rental_bookings (payment_status)
  WHERE payment_status IN ('pending_verification', 'paid', 'rejected');

CREATE INDEX IF NOT EXISTS idx_rental_bookings_meeting_location
  ON rental_bookings (meeting_location)
  WHERE meeting_location IS NOT NULL;

COMMIT;
