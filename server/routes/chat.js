const express = require("express");
const router = express.Router();
const db = require("../models/db");

// GET all messages for a trade
router.get("/:tradeOfferId", async (req, res) => {
  try {
    const { tradeOfferId } = req.params;

    const result = await db.query(
      `SELECT * FROM messages
       WHERE trade_offer_id = $1
       ORDER BY created_at ASC`,
      [tradeOfferId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch messages",
      error: error.message
    });
  }
});

// Send a new message
router.post("/", async (req, res) => {
  try {
    const {
      trade_offer_id,
      sender_id,
      message
    } = req.body;

    const result = await db.query(
      `INSERT INTO messages
      (trade_offer_id, sender_id, message)
      VALUES ($1,$2,$3)
      RETURNING *`,
      [trade_offer_id, sender_id, message]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to send message",
    });
  }
});

module.exports = router;