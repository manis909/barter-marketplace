-- Migration: Extend ratings to Barter, Skilter, and Rental transactions
-- Each rating must reference exactly one module-specific transaction.

BEGIN;

-- 1. Add module-specific transaction references.
ALTER TABLE ratings
  ADD COLUMN IF NOT EXISTS skill_booking_id UUID,
  ADD COLUMN IF NOT EXISTS rental_booking_id UUID;

-- 2. Replace the Barter SET NULL foreign key with restrictive deletion.
ALTER TABLE ratings
  DROP CONSTRAINT IF EXISTS fk_rating_trade;

ALTER TABLE ratings
  ADD CONSTRAINT fk_rating_trade
  FOREIGN KEY (trade_offer_id)
  REFERENCES trade_offers(id)
  ON DELETE RESTRICT;

-- 3. Add restrictive foreign keys for Skilter and Rental transactions.
ALTER TABLE ratings
  DROP CONSTRAINT IF EXISTS fk_rating_skill_booking;

ALTER TABLE ratings
  ADD CONSTRAINT fk_rating_skill_booking
  FOREIGN KEY (skill_booking_id)
  REFERENCES skill_bookings(id)
  ON DELETE RESTRICT;

ALTER TABLE ratings
  DROP CONSTRAINT IF EXISTS fk_rating_rental_booking;

ALTER TABLE ratings
  ADD CONSTRAINT fk_rating_rental_booking
  FOREIGN KEY (rental_booking_id)
  REFERENCES rental_bookings(id)
  ON DELETE RESTRICT;

-- 4. Every rating must belong to exactly one module transaction.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'ratings'::regclass
      AND conname = 'ratings_exactly_one_transaction_check'
  ) THEN
    ALTER TABLE ratings
      ADD CONSTRAINT ratings_exactly_one_transaction_check
      CHECK (
        num_nonnulls(
          trade_offer_id,
          skill_booking_id,
          rental_booking_id
        ) = 1
      );
  END IF;
END
$$;

-- 5. One rating per reviewer per module transaction.
CREATE UNIQUE INDEX IF NOT EXISTS ratings_reviewer_trade_offer_unique
  ON ratings (reviewer_id, trade_offer_id)
  WHERE trade_offer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ratings_reviewer_skill_booking_unique
  ON ratings (reviewer_id, skill_booking_id)
  WHERE skill_booking_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ratings_reviewer_rental_booking_unique
  ON ratings (reviewer_id, rental_booking_id)
  WHERE rental_booking_id IS NOT NULL;

COMMIT;
