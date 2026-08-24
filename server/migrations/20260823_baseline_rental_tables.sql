-- ============================================================
-- BASELINE SNAPSHOT - rentals, rental_requests, transactions
-- Date:    2026-08-23
-- Purpose: DOCUMENTATION-ONLY baseline of the live rental schema.
--          These tables were created outside this repo's migration
--          history. Captures their EXACT shape as read directly
--          from the live database (information_schema + pg_indexes
--          + pg_constraintdef).
--
-- IMPORTANT: This is a baseline snapshot, NOT a change.
--   - The tables already exist in the live DB.
--   - CREATE TABLE IF NOT EXISTS makes this safe to review/run
--     idempotently - it NO-OPs when tables are present.
--   - No columns/constraints are altered or dropped here.
--
-- Documented SEPARETELY from shared/schema.sql, which still
-- declares the stale rental_listings / rental_bookings design
-- that does NOT exist in the live database.
-- ============================================================

CREATE TABLE IF NOT EXISTS rentals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES users(id),
    title           TEXT NOT NULL,
    description     TEXT,
    daily_rate      NUMERIC NOT NULL,
    status          TEXT NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'requested', 'rented')),
    image_url       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rental_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id       UUID NOT NULL REFERENCES rentals(id),
  requester_id    UUID NOT NULL REFERENCES users(id),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined', 'returned')),
  total_amount    NUMERIC,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  pillar        TEXT NOT NULL CHECK (pillar IN ('barter', 'skill', 'rental')),
  type          TEXT NOT NULL CHECK (type IN ('incoming', 'outgoing')),
  amount        NUMERIC NOT NULL,
  description   TEXT,
  related_id    UUID,
  status        TEXT NOT NULL DEFAULT 'completed'
                CHECK (status IN ('completed', 'pending', 'failed', 'disputed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rental_requests_rental_id
  ON rental_requests(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_requests_requester_id
  ON rental_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id
  ON transactions(user_id);