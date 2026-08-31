-- ============================================================
-- Migration: Full Rental Chat messaging features
-- Date: 2026-08-24
--
-- Purpose:
--   1. Extend rental_messages with feature columns mirroring
--      skill_messages and barter messages (replies, attachments,
--      reactions, edit flag, soft-delete flag).
--   2. Allow NULL in rental_messages.message for attachment-only messages.
--   3. Create rental_message_deletions ("delete for me" per message).
--   4. Create rental_booking_deletions ("hide chat" per conversation).
--   5. Add supporting foreign keys and performance indexes.
--
-- IDEMPOTENT: guarded with IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- ============================================================

-- 1. Ensure rental_messages table exists
CREATE TABLE IF NOT EXISTS rental_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES rental_bookings(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES users(id)           ON DELETE CASCADE,
  message     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Allow NULL message column for attachment-only messages
ALTER TABLE rental_messages
  ALTER COLUMN message DROP NOT NULL;

-- 3. Add messaging feature columns to rental_messages
ALTER TABLE rental_messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID
        REFERENCES rental_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attachment_url      TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type     TEXT,   -- 'image' | 'video'
  ADD COLUMN IF NOT EXISTS reactions           JSONB   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS edited              BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted             BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Message-level "delete for me" table
CREATE TABLE IF NOT EXISTS rental_message_deletions (
  message_id  UUID NOT NULL REFERENCES rental_messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id)           ON DELETE CASCADE,
  PRIMARY KEY (message_id, user_id)
);

-- 5. Conversation-level "delete for me" (hide chat) table
CREATE TABLE IF NOT EXISTS rental_booking_deletions (
  booking_id  UUID NOT NULL REFERENCES rental_bookings(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id)           ON DELETE CASCADE,
  PRIMARY KEY (booking_id, user_id)
);

-- 6. Performance indexes
CREATE INDEX IF NOT EXISTS idx_rental_messages_booking
  ON rental_messages(booking_id);

CREATE INDEX IF NOT EXISTS idx_rental_msg_deletions_user
  ON rental_message_deletions(user_id);

CREATE INDEX IF NOT EXISTS idx_rental_booking_deletions_user
  ON rental_booking_deletions(user_id);
