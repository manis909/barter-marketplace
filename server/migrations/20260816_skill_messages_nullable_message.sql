-- Migration: Allow NULL in skill_messages.message so attachment-only messages
-- (with no text body) can be inserted, matching the Barter messages table behaviour.
-- The soft-delete route also no longer nulls the message column (it was causing
-- NOT NULL violations); this migration is still needed for attachment-only sends.

ALTER TABLE skill_messages ALTER COLUMN message DROP NOT NULL;
