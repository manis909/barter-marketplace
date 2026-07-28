const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const db = require("../models/db");
const { createNotification } = require("./notifications");

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
      `SELECT * FROM messages WHERE trade_offer_id = $1 ORDER BY created_at ASC`,
      [tradeOfferId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch messages", error: error.message });
  }
});

// Send a new message
// CHANGED: now accepts an optional reply_to_message_id so a message can quote another one
router.post("/", requireAuth, async (req, res) => {
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

    const result = await db.query(
      `INSERT INTO messages (trade_offer_id, sender_id, message, reply_to_message_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [trade_offer_id, sender_id, message, reply_to_message_id || null]
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
    res.status(500).json({ message: "Failed to send message" });
  }
});

// CHANGED: new route — toggle a reaction (one emoji per user per message, WhatsApp-style)
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

    // Remove this user from every emoji first — only one reaction per user allowed
    for (const key of Object.keys(reactions)) {
      reactions[key] = (reactions[key] || []).filter((id) => id !== userId);
      if (reactions[key].length === 0) delete reactions[key];
    }

    // Re-add only if this wasn't a toggle-off of the same emoji
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

module.exports = router;