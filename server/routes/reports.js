const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const db = require("../models/db");

// POST a new report
router.post("/", requireAuth, async (req, res) => {
  try {
    const { reported_user_id, reason } = req.body;
    const reported_by = req.userId;

    await db.query(
      "INSERT INTO reports (reported_by, reported_user_id, reason) VALUES ($1, $2, $3)",
      [reported_by, reported_user_id, reason]
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to submit report" });
  }
});

module.exports = router;