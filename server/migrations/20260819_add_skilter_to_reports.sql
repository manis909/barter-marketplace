-- Migration: Add skill_booking_id to reports for Skilter report linking
-- Allows reports to link to skill bookings (Skilter) in addition to trade_offers (Barter)

ALTER TABLE reports ADD COLUMN skill_booking_id UUID REFERENCES skill_bookings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_reports_skill_booking ON reports(skill_booking_id);
