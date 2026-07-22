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
router.post("/", requireAuth, async (req, res) => {
  try {
    const { trade_offer_id, message } = req.body;
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
      `INSERT INTO messages (trade_offer_id, sender_id, message) VALUES ($1,$2,$3) RETURNING *`,
      [trade_offer_id, sender_id, message]
    );

    const newMessage = result.rows[0];

    const io = req.app.get("io");
    if (io) {
      io.to(String(trade_offer_id)).emit("newMessage", newMessage);
    }

    // Notify the other person in the trade that a new message arrived
    const recipientId = sender_id === t.sender_id ? t.receiver_id : t.sender_id;
    await createNotification(
      recipientId,
      "new_message",
      "New Message",
      "You have a new message in your trade chat."
    );

    res.status(201).json(newMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

module.exports = router;