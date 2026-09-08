-- Add category support to the existing Member 3 rentals table.
-- This does not create or replace any Rental tables.
ALTER TABLE rentals
  ADD COLUMN IF NOT EXISTS category TEXT;
