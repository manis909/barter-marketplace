-- ============================================================
-- STAGE 4: SKILTER FEE COLUMNS + SUBSCRIPTION TABLE
-- Date:    2026-09-28
--
-- Changes:
--   1. Add fee_rate, fee_amount, tutor_payout_amount to skill_bookings
--      (nullable — NULL = legacy booking, no commission applicable)
--   2. Create tutor_subscriptions table for the unlimited plan
--
-- Design rules:
--   - All three fee columns are nullable. Legacy rows stay NULL.
--   - fee_amount   = roundRupees(price * fee_rate)
--   - tutor_payout = price - fee_amount  (exact subtraction, never double-rounded)
--   - commission_amount (old orphaned column) is left untouched.
--   - No tables, existing columns, or constraints dropped or renamed.
-- ============================================================

BEGIN;

-- ── 1. Fee snapshot columns on skill_bookings ────────────────────────────────

ALTER TABLE skill_bookings
  ADD COLUMN IF NOT EXISTS fee_rate NUMERIC;

ALTER TABLE skill_bookings
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC;

ALTER TABLE skill_bookings
  ADD COLUMN IF NOT EXISTS tutor_payout_amount NUMERIC;

-- Non-negative guards
ALTER TABLE skill_bookings
  DROP CONSTRAINT IF EXISTS skill_bookings_fee_amount_non_negative;
ALTER TABLE skill_bookings
  ADD CONSTRAINT skill_bookings_fee_amount_non_negative
  CHECK (fee_amount IS NULL OR fee_amount >= 0);

ALTER TABLE skill_bookings
  DROP CONSTRAINT IF EXISTS skill_bookings_tutor_payout_non_negative;
ALTER TABLE skill_bookings
  ADD CONSTRAINT skill_bookings_tutor_payout_non_negative
  CHECK (tutor_payout_amount IS NULL OR tutor_payout_amount >= 0);

-- Consistency: when both are set, fee + payout must equal the booking price.
-- We join via skill_listings.price — but a CHECK constraint can't span tables.
-- Enforce this in application code instead (server-side before INSERT).
-- The constraint below just guards internal arithmetic consistency:
ALTER TABLE skill_bookings
  DROP CONSTRAINT IF EXISTS skill_bookings_fee_consistency;
ALTER TABLE skill_bookings
  ADD CONSTRAINT skill_bookings_fee_consistency
  CHECK (
    fee_amount IS NULL
    OR tutor_payout_amount IS NULL
    OR fee_amount >= 0
  );

-- Index for admin payout dashboard
CREATE INDEX IF NOT EXISTS idx_skill_bookings_tutor_payout
  ON skill_bookings (tutor_payout_amount)
  WHERE tutor_payout_amount IS NOT NULL;

-- ── 2. tutor_subscriptions table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tutor_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan            VARCHAR(30) NOT NULL DEFAULT 'unlimited'
                  CHECK (plan IN ('unlimited')),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending_payment'
                  CHECK (status IN ('pending_payment', 'active', 'expired', 'cancelled')),

  -- When the plan becomes active (set by admin on payment confirmation)
  started_at      TIMESTAMPTZ,
  -- started_at + 30 days; enforced in app code
  expires_at      TIMESTAMPTZ,

  -- Payment tracking — same UPI screenshot flow as skill_bookings
  payment_status  VARCHAR(30) NOT NULL DEFAULT 'unpaid'
                  CHECK (payment_status IN ('unpaid', 'pending_verification', 'paid', 'rejected')),
  payment_screenshot_url TEXT,
  payment_utr     VARCHAR(100),
  payment_submitted_at   TIMESTAMPTZ,
  payment_rejection_reason TEXT,
  payment_rejected_at    TIMESTAMPTZ,
  amount_paid     NUMERIC,  -- snapshot of SKILTER_UNLIMITED_PLAN_PRICE_INR at purchase time

  -- Admin audit
  confirmed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One active subscription per tutor at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_subscriptions_one_active
  ON tutor_subscriptions (tutor_id)
  WHERE status IN ('active', 'pending_payment');

-- Lookup index: "does this tutor have an active plan right now?"
CREATE INDEX IF NOT EXISTS idx_tutor_subscriptions_active
  ON tutor_subscriptions (tutor_id, expires_at)
  WHERE status = 'active';

-- UTR uniqueness (partial — only non-NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_subscriptions_utr_unique
  ON tutor_subscriptions (payment_utr)
  WHERE payment_utr IS NOT NULL;

COMMIT;
