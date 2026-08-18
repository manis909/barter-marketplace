const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const db = require("../models/db");

// Holds a reference to the shared Socket.io instance, set once from server.js
let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

/*
|--------------------------------------------------------------------------
| NOTIFICATION TYPE GROUPS
|--------------------------------------------------------------------------
*/

// Normal Skilter notification types
const SKILTER_TYPES = [
  "skill_booking",
  "skill_booking_accepted",
  "skill_booking_declined",
  "skill_booking_completed",
  "skill_booking_cancelled",
  "new_skill_message",
];

// Skilter report-action notification types
const SKILTER_REPORT_TYPES = [
  "skilter_report_warn",
  "skilter_report_restrict",
  "skilter_report_suspend",
  "skilter_report_ban",
  "skilter_report_escalate",
];

// Everything considered Skilter
const ALL_SKILTER_TYPES = [
  ...SKILTER_TYPES,
  ...SKILTER_REPORT_TYPES,
];

/*
|--------------------------------------------------------------------------
| GET ALL BARTER NOTIFICATIONS
|--------------------------------------------------------------------------
|
| This endpoint intentionally excludes ALL Skilter notifications.
|
*/

router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT *
       FROM notifications
       WHERE user_id = $1
         AND type != ALL($2::text[])
       ORDER BY created_at DESC`,
      [req.userId, ALL_SKILTER_TYPES]
    );

    res.json({
      notifications: result.rows,
    });
  } catch (error) {
    console.error("GET /notifications error:", error);

    res.status(500).json({
      message: "Failed to fetch notifications",
    });
  }
});

/*
|--------------------------------------------------------------------------
| MARK ALL BARTER NOTIFICATIONS AS READ
|--------------------------------------------------------------------------
*/

router.patch("/read-all", requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1
         AND is_read = FALSE
         AND type != ALL($2::text[])`,
      [req.userId, ALL_SKILTER_TYPES]
    );

    res.json({
      success: true,
    });
  } catch (error) {
    console.error("PATCH /notifications/read-all error:", error);

    res.status(500).json({
      message: "Failed to mark notifications as read",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET ONLY SKILTER NOTIFICATIONS
|--------------------------------------------------------------------------
*/

router.get("/skilter", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT *
       FROM notifications
       WHERE user_id = $1
         AND type = ANY($2::text[])
       ORDER BY created_at DESC`,
      [req.userId, ALL_SKILTER_TYPES]
    );

    res.json({
      notifications: result.rows,
    });
  } catch (error) {
    console.error("GET /notifications/skilter error:", error);

    res.status(500).json({
      message: "Failed to fetch Skilter notifications",
    });
  }
});

/*
|--------------------------------------------------------------------------
| MARK ALL SKILTER NOTIFICATIONS AS READ
|--------------------------------------------------------------------------
*/

router.patch("/skilter/read-all", requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1
         AND is_read = FALSE
         AND type = ANY($2::text[])`,
      [req.userId, ALL_SKILTER_TYPES]
    );

    res.json({
      success: true,
    });
  } catch (error) {
    console.error("PATCH /notifications/skilter/read-all error:", error);

    res.status(500).json({
      message: "Failed to mark Skilter notifications as read",
    });
  }
});

/*
|--------------------------------------------------------------------------
| DELETE SELECTED SKILTER NOTIFICATIONS
|--------------------------------------------------------------------------
*/

router.delete("/skilter/bulk", requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "ids must be a non-empty array",
      });
    }

    await db.query(
      `DELETE FROM notifications
       WHERE id = ANY($1::uuid[])
         AND user_id = $2
         AND type = ANY($3::text[])`,
      [ids, req.userId, ALL_SKILTER_TYPES]
    );

    res.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE /notifications/skilter/bulk error:", error);

    res.status(500).json({
      message: "Failed to delete Skilter notifications",
    });
  }
});

/*
|--------------------------------------------------------------------------
| MARK ONE NOTIFICATION AS READ
|--------------------------------------------------------------------------
*/

router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1
         AND user_id = $2`,
      [req.params.id, req.userId]
    );

    res.json({
      success: true,
    });
  } catch (error) {
    console.error("PATCH /notifications/:id/read error:", error);

    res.status(500).json({
      message: "Failed to mark notification as read",
    });
  }
});

/*
|--------------------------------------------------------------------------
| DELETE SELECTED BARTER NOTIFICATIONS
|--------------------------------------------------------------------------
|
| Because ALL_SKILTER_TYPES are excluded, this endpoint cannot delete
| Skilter notifications.
|
*/

router.delete("/bulk", requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "ids must be a non-empty array",
      });
    }

    await db.query(
      `DELETE FROM notifications
       WHERE id = ANY($1::uuid[])
         AND user_id = $2
         AND type != ALL($3::text[])`,
      [ids, req.userId, ALL_SKILTER_TYPES]
    );

    res.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE /notifications/bulk error:", error);

    res.status(500).json({
      message: "Failed to delete notifications",
    });
  }
});

/*
|--------------------------------------------------------------------------
| CREATE NOTIFICATION HELPER
|--------------------------------------------------------------------------
|
| Used by:
|   - chat.js
|   - trades.js
|   - verification
|   - reports.js
|   - etc.
|
*/

async function createNotification(
  userId,
  type,
  title,
  body,
  tradeOfferId = null
) {
  void tradeOfferId;

  const result = await db.query(
    `INSERT INTO notifications
      (user_id, type, title, body)
     VALUES
      ($1, $2, $3, $4)
     RETURNING *`,
    [userId, type, title, body]
  );

  const notification = result.rows[0];

  console.log("NOTIFICATION CREATED:", notification);

  /*
  |--------------------------------------------------------------------------
  | REALTIME SOCKET EVENT
  |--------------------------------------------------------------------------
  */

  if (ioInstance) {
    ioInstance
      .to(`user:${userId}`)
      .emit("newNotification", notification);
  }

  return notification;
}

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = router;
module.exports.createNotification = createNotification;
module.exports.setIO = setIO;