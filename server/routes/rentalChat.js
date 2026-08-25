const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const db = require("../models/db");
const { createNotification } = require("./notifications");

// ── Multer: disk storage for chat attachments (mirrors skillChat.js) ────────
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "rental-chat");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed"));
    }
  },
});

// ── Helper: verify the requester is a participant in the rental booking ─────
async function getBookingAndVerify(bookingId, userId) {
  const result = await db.query(`SELECT * FROM rental_bookings WHERE id = $1`, [bookingId]);
  const b = result.rows[0];
  if (!b) return { booking: null, allowed: false };
  const allowed = userId === b.borrower_id || userId === b.owner_id;
  return { booking: b, allowed };
}

// ── GET /api/rental-chat/:bookingId ─────────────────────────────────────────
// Fetch all messages for a rental booking, excluding messages the requester
// deleted for themselves. Joins users so sender_name is included in every row.
router.get("/:bookingId", requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { booking, allowed } = await getBookingAndVerify(bookingId, req.userId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (!allowed)  return res.status(403).json({ message: "Not part of this booking" });

    const result = await db.query(
      `SELECT rm.*, u.username AS sender_name
       FROM rental_messages rm
       JOIN users u ON u.id = rm.sender_id
       WHERE rm.booking_id = $1
         AND rm.id NOT IN (
               SELECT message_id FROM rental_message_deletions WHERE user_id = $2
             )
       ORDER BY rm.created_at ASC`,
      [bookingId, req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("GET /rental-chat/:bookingId error:", error);
    res.status(500).json({ message: "Failed to fetch messages", error: error.message });
  }
});

// ── POST /api/rental-chat ───────────────────────────────────────────────────
// Send a new message (text and/or image/video attachment).
// Accepts multipart/form-data when an attachment is included.
router.post("/", requireAuth, upload.single("attachment"), async (req, res) => {
  try {
    const { booking_id, message, reply_to_message_id } = req.body;
    const sender_id = req.userId;

    const { booking: b, allowed } = await getBookingAndVerify(booking_id, sender_id);
    if (!b)      return res.status(404).json({ message: "Booking not found" });
    if (!allowed) return res.status(403).json({ message: "Not part of this booking" });

    let attachment_url  = null;
    let attachment_type = null;
    if (req.file) {
      attachment_url  = `/uploads/rental-chat/${req.file.filename}`;
      attachment_type = req.file.mimetype.startsWith("video/") ? "video" : "image";
    }

    if (!message?.trim() && !attachment_url) {
      return res.status(400).json({ message: "Message or attachment is required" });
    }

    const result = await db.query(
      `INSERT INTO rental_messages
         (booking_id, sender_id, message, reply_to_message_id, attachment_url, attachment_type)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        booking_id,
        sender_id,
        message?.trim() || null,
        reply_to_message_id || null,
        attachment_url,
        attachment_type,
      ]
    );

    const userRow = await db.query(
      `SELECT username AS sender_name FROM users WHERE id = $1`,
      [sender_id]
    );
    const newMessage = { ...result.rows[0], sender_name: userRow.rows[0]?.sender_name || null };

    const io = req.app.get("io");
    if (io) io.to(String(booking_id)).emit("newRentalMessage", newMessage);

    const recipientId = sender_id === b.borrower_id ? b.owner_id : b.borrower_id;
    await createNotification(
      recipientId,
      "new_rental_message",
      "New Message",
      "You have a new message in your rental booking chat.",
      booking_id
    );

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("POST /rental-chat error:", error);
    res.status(500).json({ message: "Failed to send message", error: error.message });
  }
});

// ── PATCH /api/rental-chat/:messageId/react ─────────────────────────────────
// Toggle an emoji reaction on a message (same logic as Skill Chat).
router.patch("/:messageId/react", requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji }     = req.body;
    const userId        = req.userId;

    if (!emoji) return res.status(400).json({ message: "emoji is required" });

    const msgResult = await db.query(`SELECT * FROM rental_messages WHERE id = $1`, [messageId]);
    const msg = msgResult.rows[0];
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const { allowed } = await getBookingAndVerify(msg.booking_id, userId);
    if (!allowed) return res.status(403).json({ message: "Not part of this booking" });

    // Toggle: remove the user from all emojis first, then add if not already present
    const reactions = { ...(msg.reactions || {}) };
    const hadEmoji  = (reactions[emoji] || []).includes(userId);

    for (const key of Object.keys(reactions)) {
      reactions[key] = (reactions[key] || []).filter(id => id !== userId);
      if (reactions[key].length === 0) delete reactions[key];
    }
    if (!hadEmoji) {
      reactions[emoji] = [...(reactions[emoji] || []), userId];
    }

    const updated = await db.query(
      `UPDATE rental_messages SET reactions = $1 WHERE id = $2 RETURNING *`,
      [JSON.stringify(reactions), messageId]
    );
    const updatedMessage = updated.rows[0];

    res.json(updatedMessage);
  } catch (error) {
    console.error("PATCH /rental-chat/:messageId/react error:", error);
    res.status(500).json({ message: "Failed to update reaction" });
  }
});

// ── PATCH /api/rental-chat/:messageId ───────────────────────────────────────
// Edit message text (sender only).
// Must be defined BEFORE /:messageId/react so Express matches react first.
router.patch("/:messageId", requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message }   = req.body;
    const userId        = req.userId;

    if (!message?.trim()) {
      return res.status(400).json({ message: "message text is required" });
    }

    const msgResult = await db.query(`SELECT * FROM rental_messages WHERE id = $1`, [messageId]);
    const msg = msgResult.rows[0];
    if (!msg) return res.status(404).json({ message: "Message not found" });
    if (msg.sender_id !== userId) return res.status(403).json({ message: "Not your message" });
    if (msg.deleted) return res.status(400).json({ message: "Cannot edit a deleted message" });

    const updated = await db.query(
      `UPDATE rental_messages SET message = $1, edited = TRUE WHERE id = $2 RETURNING *`,
      [message.trim(), messageId]
    );
    const updatedMessage = updated.rows[0];

    res.json(updatedMessage);
  } catch (error) {
    console.error("PATCH /rental-chat/:messageId error:", error);
    res.status(500).json({ message: "Failed to edit message" });
  }
});

// ── DELETE /api/rental-chat/message/:messageId ──────────────────────────────
// "Delete for everyone" — soft-deletes the message (sender only).
// Must be defined BEFORE /:bookingId to avoid Express param collision.
router.delete("/message/:messageId", requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId        = req.userId;

    const msgResult = await db.query(`SELECT * FROM rental_messages WHERE id = $1`, [messageId]);
    const msg = msgResult.rows[0];
    if (!msg) return res.status(404).json({ message: "Message not found" });
    if (msg.sender_id !== userId) return res.status(403).json({ message: "Not your message" });

    const updated = await db.query(
      `UPDATE rental_messages SET deleted = TRUE WHERE id = $1 RETURNING *`,
      [messageId]
    );
    const updatedMessage = updated.rows[0];

    res.json(updatedMessage);
  } catch (error) {
    console.error("DELETE /rental-chat/message/:messageId error:", error);
    res.status(500).json({ message: "Failed to delete message" });
  }
});

// ── POST /api/rental-chat/message/:messageId/hide ───────────────────────────
// "Delete for me" — inserts a row into rental_message_deletions so the message
// is filtered out for this user only.
// Must be defined BEFORE /:bookingId.
router.post("/message/:messageId/hide", requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId        = req.userId;

    const msgResult = await db.query(`SELECT * FROM rental_messages WHERE id = $1`, [messageId]);
    const msg = msgResult.rows[0];
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const { allowed } = await getBookingAndVerify(msg.booking_id, userId);
    if (!allowed) return res.status(403).json({ message: "Not part of this booking" });

    await db.query(
      `INSERT INTO rental_message_deletions (message_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      [messageId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("POST /rental-chat/message/:messageId/hide error:", error);
    res.status(500).json({ message: "Failed to hide message" });
  }
});

module.exports = router;
