const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const db = require("../models/db");

// GET all notifications for the logged-in user
router.get("/", requireAuth, async (req, res) => {
  const result = await db.query(
    "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
    [req.userId]
  );
  res.json({ notifications: result.rows });
});

// PATCH mark one notification as read
router.patch("/:id/read", requireAuth, async (req, res) => {
  await db.query(
    "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
    [req.params.id, req.userId]
  );
  res.json({ success: true });
});

// Helper used by other routes (e.g. Member 3's trades.js) to create a notification
async function createNotification(userId, type, title, body) {
  await db.query(
    "INSERT INTO notifications (user_id, type, title, body) VALUES ($1, $2, $3, $4)",
    [userId, type, title, body]
  );
}

module.exports = router;
module.exports.createNotification = createNotification;