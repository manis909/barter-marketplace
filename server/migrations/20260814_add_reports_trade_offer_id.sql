-- Migration: Add trade_offer_id to reports so reports can link to trade conversations

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS trade_offer_id UUID REFERENCES trade_offers(id) ON DELETE SET NULL;

-- Optional: create an index for faster lookups by trade_offer_id
CREATE INDEX IF NOT EXISTS idx_reports_trade_offer ON reports(trade_offer_id);
