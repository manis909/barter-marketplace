-- Migration: Add rental_booking_id to reports for Rental report linking
-- Allows reports to link to rental bookings in addition to trade offers and skill bookings.

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS rental_booking_id UUID
    REFERENCES rental_bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reports_rental_booking
  ON reports(rental_booking_id);
