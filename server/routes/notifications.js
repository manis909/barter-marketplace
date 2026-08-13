const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const db = require("../models/db");

// Holds a reference to the shared Socket.io instance, set once from server.js
let ioInstance = null;
function setIO(io) {
  ioInstance = io;
}

// GET all notifications for the logged-in user
router.get("/", requireAuth, async (req, res) => {
  const result = await db.query(
    "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
    [req.userId]
  );
  res.json({ notifications: result.rows });
});

// PATCH mark ALL notifications as read for the logged-in user
router.patch("/read-all", requireAuth, async (req, res) => {
  await db.query(
    "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
    [req.userId]
  );
  res.json({ success: true });
});

// ── Skilter-specific notification types ──────────────────────────────────
// These routes are scoped to only the Skilter notification types so the
// Skilter bell and notification page never mix in Barter notifications.
// They must appear BEFORE the /:id wildcard route below.

const SKILTER_TYPES = [
  "skill_booking",
  "skill_booking_accepted",
  "skill_booking_declined",
  "skill_booking_completed",
  "skill_booking_cancelled",
  "new_skill_message",
];

// GET only Skilter notifications for the logged-in user
router.get("/skilter", requireAuth, async (req, res) => {
  const result = await db.query(
    "SELECT * FROM notifications WHERE user_id = $1 AND type = ANY($2::text[]) ORDER BY created_at DESC",
    [req.userId, SKILTER_TYPES]
  );
  res.json({ notifications: result.rows });
});

// PATCH mark ALL Skilter notifications as read (does not touch Barter notifications)
router.patch("/skilter/read-all", requireAuth, async (req, res) => {
  await db.query(
    "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE AND type = ANY($2::text[])",
    [req.userId, SKILTER_TYPES]
  );
  res.json({ success: true });
});

// DELETE bulk-delete scoped to Skilter notifications only.
// Body: { ids: ["uuid1", "uuid2", ...] }
// The extra AND type = ANY(...) guard ensures a caller cannot delete
// Barter notifications even if they supply Barter notification IDs here.
router.delete("/skilter/bulk", requireAuth, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "ids must be a non-empty array" });
  }
  await db.query(
    "DELETE FROM notifications WHERE id = ANY($1::uuid[]) AND user_id = $2 AND type = ANY($3::text[])",
    [ids, req.userId, SKILTER_TYPES]
  );
  res.json({ success: true });
});

// ── End Skilter-specific routes ───────────────────────────────────────────

// PATCH mark one notification as read
router.patch("/:id/read", requireAuth, async (req, res) => {
  await db.query(
    "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
    [req.params.id, req.userId]
  );
  res.json({ success: true });
});

// DELETE bulk — removes a list of notifications that belong to this user.
// Body: { ids: ["uuid1", "uuid2", ...] }
router.delete("/bulk", requireAuth, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "ids must be a non-empty array" });
  }
  // Only delete rows that actually belong to the requesting user — prevents
  // someone from deleting another user's notifications by guessing IDs.
  await db.query(
    "DELETE FROM notifications WHERE id = ANY($1::uuid[]) AND user_id = $2",
    [ids, req.userId]
  );
  res.json({ success: true });
});

// Helper used by other routes (chat.js, trades.js, verification, etc.) to create a notification
async function createNotification(userId, type, title, body, tradeOfferId = null) {
  const result = await db.query(
    "INSERT INTO notifications (user_id, type, title, body, trade_offer_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [userId, type, title, body, tradeOfferId]
  );

  const notification = result.rows[0];

  // Push a realtime event to this specific user, if they're connected
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit("newNotification", notification);
  }

  return notification;
}

module.exports = router;
module.exports.createNotification = createNotification;
module.exports.setIO = setIO;