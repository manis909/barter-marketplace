-- One-time verification celebration state.
--
-- The "celebration seen" flag lives on the user account, alongside the
-- verification itself. It is intentionally NOT derived from a time window:
--
--   * verified_at                      -> when this verification was granted
--   * verification_celebration_seen_at -> when the user first saw the
--                                         celebration for THIS verification
--
-- Both start NULL, so any account approved before this migration existed will
-- still see the celebration the first time it opens its profile afterwards,
-- no matter how long ago it was approved. A later re-approval clears
-- verification_celebration_seen_at again, which is what makes the celebration
-- fire exactly once per verification event.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_celebration_seen_at TIMESTAMPTZ;

COMMENT ON COLUMN users.verified_at IS
  'Timestamp of the current verification approval. NULL when never approved.';
COMMENT ON COLUMN users.verification_celebration_seen_at IS
  'Timestamp the user first opened the verification celebration for the current verification. NULL = not seen yet.';
