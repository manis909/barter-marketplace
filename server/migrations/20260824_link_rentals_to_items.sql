-- ============================================================
-- LINK rentals to items — enables "Request to Rent" on /item/:id
-- Date: 2026-08-23
-- Depends on: 20260823_baseline_rental_tables.sql (Step A)
--
-- Purpose: The live `rentals` table had no linkage to `items`.
--   The item detail page (/item/:id) needs to know whether an item
--   supports rental in order to show the "Request to Rent" action.
--   This adds a nullable item_id FK so a rental listing can be
--   attached to an existing item listing. Nullable so pre-existing
--   standalone rental rows remain valid.
--
-- IDEMPOTENT: guarded with IF NOT EXISTS, matching repo convention.
-- ============================================================

ALTER TABLE rentals
  ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES items(id);

CREATE INDEX IF NOT EXISTS idx_rentals_item_id
  ON rentals(item_id);