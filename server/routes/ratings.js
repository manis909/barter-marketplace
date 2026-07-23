const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const db = require("../models/db");

// POST a new rating
router.post("/", requireAuth, async (req, res) => {
  try {
    const { trade_offer_id, reviewee_id, rating, review } = req.body;
    const reviewer_id = req.userId;

    // Prevent duplicate rating for the same trade by the same reviewer
    const existing = await db.query(
      "SELECT * FROM ratings WHERE trade_offer_id = $1 AND reviewer_id = $2",
      [trade_offer_id, reviewer_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "You already rated this trade" });
    }

    const result = await db.query(
      `INSERT INTO ratings (trade_offer_id, reviewer_id, reviewee_id, rating, review)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [trade_offer_id, reviewer_id, reviewee_id, rating, review]
    );

    res.status(201).json({ rating: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to submit rating", error: error.message });
  }
});

// GET average rating + count for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as total
       FROM ratings WHERE reviewee_id = $1`,
      [req.params.userId]
    );
    res.json({ summary: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch rating summary" });
  }
});

module.exports = router;