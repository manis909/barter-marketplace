-- ============================================================
-- ADD pickup confirmation columns to rental_requests
-- Date: 2026-08-25
-- 
-- Purpose: Add pickup confirmation flags to support the full rental flow:
--   STEP 1: Request (pending)
--   STEP 2: Owner accepts → payment happens, status: 'accepted' (awaiting pickup)
--   STEP 3: Pickup confirmation (both sides confirm pickup)
--   STEP 4: Status becomes 'rented' (active rental)
--   STEP 5: Return confirmation (both sides confirm return)
--   STEP 6: Status becomes 'returned', deposit refunded
--
-- These columns mirror the existing return confirmation pattern.
-- ============================================================

-- 1. Add pickup confirmation columns
ALTER TABLE rental_requests
  ADD COLUMN IF NOT EXISTS renter_confirmed_pickup BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE rental_requests
  ADD COLUMN IF NOT EXISTS owner_confirmed_pickup BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Update the status constraint to allow 'rented' status
ALTER TABLE rental_requests
  DROP CONSTRAINT IF EXISTS rental_requests_status_check;

ALTER TABLE rental_requests
  ADD CONSTRAINT rental_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'rented', 'declined', 'returned', 'cancelled'));

-- 3. Update the confirmation constraint to include pickup flags
-- The constraint ensures that confirmation flags can only be TRUE when status allows it
ALTER TABLE rental_requests
  DROP CONSTRAINT IF EXISTS rental_requests_confirm_only_open;

ALTER TABLE rental_requests
  ADD CONSTRAINT rental_requests_confirm_only_open
  CHECK (
    -- If status allows confirmations, flags can be TRUE or FALSE
    -- If status doesn't allow confirmations, all flags must be FALSE
    status IN ('accepted', 'rented', 'returned')
    OR (
      renter_confirmed_return = FALSE AND 
      owner_confirmed_return = FALSE AND
      renter_confirmed_pickup = FALSE AND 
      owner_confirmed_pickup = FALSE
    )
  );

-- 4. Add index for pickup confirmation queries
CREATE INDEX IF NOT EXISTS idx_rental_requests_pickup_flags
  ON rental_requests(renter_confirmed_pickup, owner_confirmed_pickup)
  WHERE status = 'accepted';

-- 5. Note: The rental_requests table already has deposit_amount column
--    from previous migration. Deposit is held when status becomes 'accepted'
--    and refunded when status becomes 'returned' (after both return confirmations).