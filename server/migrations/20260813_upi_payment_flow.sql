-- Migration: UPI manual payment verification flow
-- Adds pending_verification state, UPI submission fields,
-- rejection audit trail, and UTR uniqueness constraint.

-- 1. Drop existing payment_status CHECK constraint
ALTER TABLE skill_bookings
  DROP CONSTRAINT IF EXISTS skill_bookings_payment_status_check;

-- 2. Re-add CHECK with 'pending_verification' included
ALTER TABLE skill_bookings
  ADD CONSTRAINT skill_bookings_payment_status_check
  CHECK (payment_status IN ('unpaid', 'pending_verification', 'paid'));

-- 3. UPI submission fields
ALTER TABLE skill_bookings
  ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_utr VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMPTZ;

-- 4. Rejection audit trail (rejection does NOT clear screenshot/utr)
ALTER TABLE skill_bookings
  ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_rejected_at TIMESTAMPTZ;

-- 5. Unique UTR constraint — prevents same transaction being submitted
--    on two different bookings (catches both accidental and deliberate reuse).
--    Partial: only enforces uniqueness on non-NULL values, so unpaid rows
--    (NULL utr) don't conflict with each other.
ALTER TABLE skill_bookings
  DROP CONSTRAINT IF EXISTS skill_bookings_payment_utr_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_bookings_payment_utr_unique
  ON skill_bookings (payment_utr)
  WHERE payment_utr IS NOT NULL;
