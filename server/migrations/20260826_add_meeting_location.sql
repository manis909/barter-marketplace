-- ============================================================
-- ADD meeting_location to rental_requests
-- Date: 2026-08-26
-- 
-- Purpose: Add a free-text meeting location field to rental requests.
-- This is shown to both parties after the request is created and helps
-- coordinate the physical handoff location (e.g., "near hostel gate").
-- Not a scheduling/map tool — just a plain text note.
-- ============================================================

ALTER TABLE rental_requests
  ADD COLUMN IF NOT EXISTS meeting_location TEXT;

-- No constraint needed — it's optional free text, can be NULL or empty.
