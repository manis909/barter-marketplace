-- Migration: Add proof flow columns and trade_proofs table

-- 1. Alter status column length limit on trade_offers to accommodate 'awaiting_admin_verification'
ALTER TABLE trade_offers
  ALTER COLUMN status TYPE VARCHAR(30);

-- 2. Drop the existing status CHECK constraint if it exists (usually named trade_offers_status_check)
ALTER TABLE trade_offers
  DROP CONSTRAINT IF EXISTS trade_offers_status_check;

-- 3. Add the updated status CHECK constraint including 'awaiting_admin_verification'
ALTER TABLE trade_offers
  ADD CONSTRAINT trade_offers_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled', 'awaiting_admin_verification'));

-- 4. Add proof submission tracking columns to trade_offers with check constraint on proof_status
ALTER TABLE trade_offers
  ADD COLUMN IF NOT EXISTS sender_proof_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS receiver_proof_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS proof_status VARCHAR(30) NOT NULL DEFAULT 'proof_pending'
    CONSTRAINT trade_offers_proof_status_check
    CHECK (proof_status IN ('proof_pending', 'awaiting_admin_verification', 'completed'));

-- 5. Create table to store proof image references with TIMESTAMPTZ
CREATE TABLE IF NOT EXISTS trade_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES trade_offers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
