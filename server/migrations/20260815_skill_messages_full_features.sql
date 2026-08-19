-- Migration: Add full messaging feature columns to skill_messages
-- and create the skill_message_deletions table.
-- Mirrors the columns already present on the Barter `messages` table.
-- All changes are additive (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- 1. Add feature columns to skill_messages
ALTER TABLE skill_messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID
        REFERENCES skill_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attachment_url      TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type     TEXT,   -- 'image' | 'video'
  ADD COLUMN IF NOT EXISTS reactions           JSONB   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS edited              BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted             BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. "Delete for me" table — one row per (message, user) pair
--    Mirrors the Barter `message_deletions` table.
CREATE TABLE IF NOT EXISTS skill_message_deletions (
  message_id  UUID NOT NULL REFERENCES skill_messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
  PRIMARY KEY (message_id, user_id)
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skill_messages_booking
  ON skill_messages(booking_id);

CREATE INDEX IF NOT EXISTS idx_skill_msg_deletions_user
  ON skill_message_deletions(user_id);
