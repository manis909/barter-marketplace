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

// PATCH mark one notification as read
router.patch("/:id/read", requireAuth, async (req, res) => {
  await db.query(
    "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
    [req.params.id, req.userId]
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