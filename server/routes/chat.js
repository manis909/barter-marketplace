const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const db = require("../models/db");
const { createNotification } = require("./notifications");

// CHANGED: multer setup for handling attachment uploads to local disk
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "chat");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB cap
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed"));
    }
  },
});

// must be defined BEFORE /:tradeOfferId so Express doesn't
// treat "hidden" as a tradeOfferId value.
router.get("/hidden/mine", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT trade_offer_id FROM chat_deletions WHERE user_id = $1`,
      [req.userId]
    );
    res.json(result.rows.map(r => r.trade_offer_id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch hidden chats" });
  }
});

// GET all messages for a trade
router.get("/:tradeOfferId", requireAuth, async (req, res) => {
  try {
    const { tradeOfferId } = req.params;

    const trade = await db.query(`SELECT * FROM trade_offers WHERE id = $1`, [tradeOfferId]);
    const t = trade.rows[0];

    if (!t) {
      return res.status(404).json({ message: "Trade not found" });
    }
    if (req.userId !== t.sender_id && req.userId !== t.receiver_id) {
      return res.status(403).json({ message: "Not part of this trade" });
    }

    const result = await db.query(
      `SELECT * FROM messages
       WHERE trade_offer_id = $1
       AND id NOT IN (SELECT message_id FROM message_deletions WHERE user_id = $2)
       ORDER BY created_at ASC`,
      [tradeOfferId, req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch messages", error: error.message });
  }
});

// Send a new message
// CHANGED: now accepts multipart/form-data with an optional "attachment" file
router.post("/", requireAuth, upload.single("attachment"), async (req, res) => {
  try {
    const { trade_offer_id, message, reply_to_message_id } = req.body;
    const sender_id = req.userId;

    const trade = await db.query(`SELECT * FROM trade_offers WHERE id = $1`, [trade_offer_id]);
    const t = trade.rows[0];

    if (!t) {
      return res.status(404).json({ message: "Trade not found" });
    }
    if (sender_id !== t.sender_id && sender_id !== t.receiver_id) {
      return res.status(403).json({ message: "Not part of this trade" });
    }

    // Completed trades are archived — no new messages allowed
    if (t.status === "completed") {
      return res.status(403).json({
        message: "This trade has been completed. The chat is now closed.",
        code: "TRADE_COMPLETED",
      });
    }

    // CHANGED: build attachment fields if a file was uploaded
    let attachment_url = null;
    let attachment_type = null;
    if (req.file) {
      attachment_url = `/uploads/chat/${req.file.filename}`;
      attachment_type = req.file.mimetype.startsWith("video/") ? "video" : "image";
    }

    if (!message?.trim() && !attachment_url) {
      return res.status(400).json({ message: "Message or attachment is required" });
    }

    const result = await db.query(
      `INSERT INTO messages (trade_offer_id, sender_id, message, reply_to_message_id, attachment_url, attachment_type)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [trade_offer_id, sender_id, message || null, reply_to_message_id || null, attachment_url, attachment_type]
    );

    const newMessage = result.rows[0];

    const io = req.app.get("io");
    if (io) {
      io.to(String(trade_offer_id)).emit("newMessage", newMessage);
    }

    const recipientId = sender_id === t.sender_id ? t.receiver_id : t.sender_id;
    await createNotification(
      recipientId,
      "new_message",
      "New Message",
      "You have a new message in your trade chat.",
      trade_offer_id
    );

    res.status(201).json(newMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send message", error: error.message });
  }
});

// toggle a reaction
router.patch("/:messageId/react", requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.userId;

    if (!emoji) {
      return res.status(400).json({ message: "emoji is required" });
    }

    const msgResult = await db.query(`SELECT * FROM messages WHERE id = $1`, [messageId]);
    const msg = msgResult.rows[0];
    if (!msg) {
      return res.status(404).json({ message: "Message not found" });
    }

    const trade = await db.query(`SELECT * FROM trade_offers WHERE id = $1`, [msg.trade_offer_id]);
    const t = trade.rows[0];
    if (!t || (userId !== t.sender_id && userId !== t.receiver_id)) {
      return res.status(403).json({ message: "Not part of this trade" });
    }

    const reactions = { ...(msg.reactions || {}) };
    const alreadyHadThisEmoji = (msg.reactions?.[emoji] || []).includes(userId);

    for (const key of Object.keys(reactions)) {
      reactions[key] = (reactions[key] || []).filter((id) => id !== userId);
      if (reactions[key].length === 0) delete reactions[key];
    }

    if (!alreadyHadThisEmoji) {
      reactions[emoji] = [...(reactions[emoji] || []), userId];
    }

    const updated = await db.query(
      `UPDATE messages SET reactions = $1 WHERE id = $2 RETURNING *`,
      [JSON.stringify(reactions), messageId]
    );

    const updatedMessage = updated.rows[0];

    const io = req.app.get("io");
    if (io) {
      io.to(String(msg.trade_offer_id)).emit("messageReactionUpdated", updatedMessage);
    }

    res.json(updatedMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update reaction" });
  }
});

// edit a message's text (sender only)
router.patch("/:messageId", requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;
    const userId = req.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "message text is required" });
    }

    const msgResult = await db.query(`SELECT * FROM messages WHERE id = $1`, [messageId]);
    const msg = msgResult.rows[0];
    if (!msg) {
      return res.status(404).json({ message: "Message not found" });
    }
    if (msg.sender_id !== userId) {
      return res.status(403).json({ message: "Not your message" });
    }
    if (msg.deleted) {
      return res.status(400).json({ message: "Cannot edit a deleted message" });
    }

    const updated = await db.query(
      `UPDATE messages SET message = $1, edited = true WHERE id = $2 RETURNING *`,
      [message, messageId]
    );

    const updatedMessage = updated.rows[0];

    const io = req.app.get("io");
    if (io) {
      io.to(String(msg.trade_offer_id)).emit("messageEdited", updatedMessage);
    }

    res.json(updatedMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to edit message" });
  }
});

// "Delete for everyone" — soft delete a single message (sender only)
router.delete("/message/:messageId", requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    const msgResult = await db.query(`SELECT * FROM messages WHERE id = $1`, [messageId]);
    const msg = msgResult.rows[0];
    if (!msg) {
      return res.status(404).json({ message: "Message not found" });
    }
    if (msg.sender_id !== userId) {
      return res.status(403).json({ message: "Not your message" });
    }

    const updated = await db.query(
      `UPDATE messages SET message = NULL, deleted = true WHERE id = $1 RETURNING *`,
      [messageId]
    );

    const updatedMessage = updated.rows[0];

    const io = req.app.get("io");
    if (io) {
      io.to(String(msg.trade_offer_id)).emit("messageDeleted", updatedMessage);
    }

    res.json(updatedMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete message" });
  }
});

// "Delete for me": hides a single message from just this user
router.post("/message/:messageId/hide", requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    const msgResult = await db.query(`SELECT * FROM messages WHERE id = $1`, [messageId]);
    const msg = msgResult.rows[0];
    if (!msg) {
      return res.status(404).json({ message: "Message not found" });
    }

    const trade = await db.query(`SELECT * FROM trade_offers WHERE id = $1`, [msg.trade_offer_id]);
    const t = trade.rows[0];
    if (!t || (userId !== t.sender_id && userId !== t.receiver_id)) {
      return res.status(403).json({ message: "Not part of this trade" });
    }

    await db.query(
      `INSERT INTO message_deletions (message_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      [messageId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to hide message" });
  }
});

// "Delete for me": hides this chat from the current user's list only
router.delete("/:tradeOfferId/for-me", requireAuth, async (req, res) => {
  try {
    const { tradeOfferId } = req.params;
    const userId = req.userId;

    const trade = await db.query(`SELECT * FROM trade_offers WHERE id = $1`, [tradeOfferId]);
    const t = trade.rows[0];
    if (!t) return res.status(404).json({ message: "Trade not found" });
    if (userId !== t.sender_id && userId !== t.receiver_id) {
      return res.status(403).json({ message: "Not part of this trade" });
    }

    await db.query(
      `INSERT INTO chat_deletions (trade_offer_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (trade_offer_id, user_id) DO NOTHING`,
      [tradeOfferId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete chat for you" });
  }
});

// "Delete for everyone": permanently removes all messages in this chat
router.delete("/:tradeOfferId/for-everyone", requireAuth, async (req, res) => {
  try {
    const { tradeOfferId } = req.params;
    const userId = req.userId;

    const trade = await db.query(`SELECT * FROM trade_offers WHERE id = $1`, [tradeOfferId]);
    const t = trade.rows[0];
    if (!t) return res.status(404).json({ message: "Trade not found" });
    if (userId !== t.sender_id && userId !== t.receiver_id) {
      return res.status(403).json({ message: "Not part of this trade" });
    }

    await db.query(`DELETE FROM messages WHERE trade_offer_id = $1`, [tradeOfferId]);

    const io = req.app.get("io");
    if (io) {
      io.to(String(tradeOfferId)).emit("chatDeletedForEveryone", { tradeOfferId });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete chat for everyone" });
  }
});

module.exports = router;
