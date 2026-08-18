-- Migration: Add skill_booking_deletions table for conversation-level "delete for me"
-- Mirrors the chat_deletions table for Barter trades.
-- This table tracks which skill booking chats each user has hidden from their list.

CREATE TABLE IF NOT EXISTS skill_booking_deletions (
  booking_id  UUID NOT NULL REFERENCES skill_bookings(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
  PRIMARY KEY (booking_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_booking_deletions_user
  ON skill_booking_deletions(user_id);
