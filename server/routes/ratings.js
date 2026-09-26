const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const db = require("../models/db");
const ratingUniqueConstraints = new Set([
  "ratings_reviewer_trade_offer_unique",
  "ratings_reviewer_skill_booking_unique",
  "ratings_reviewer_rental_booking_unique",
]);

// GET /api/ratings/check/:tradeOfferId — has the current user already rated this trade?
// Returns { rated: true/false }
router.get("/check/:tradeOfferId", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id FROM ratings WHERE trade_offer_id = $1 AND reviewer_id = $2",
      [req.params.tradeOfferId, req.userId]
    );
    res.json({ rated: result.rows.length > 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to check rating status" });
  }
});

// POST a new rating
router.post("/", requireAuth, async (req, res) => {
  let duplicateMessage = "You already rated this transaction";
  try {
    const {
      trade_offer_id,
      skill_booking_id,
      rental_booking_id,
      reviewee_id,
      rating,
      review,
    } = req.body;
    const reviewer_id = req.userId;

    const transactionOptions = [
      {
        id: trade_offer_id,
        column: "trade_offer_id",
        table: "trade_offers",
        firstParticipant: "sender_id",
        secondParticipant: "receiver_id",
        notFoundMessage: "Trade not found",
        participantMessage: "You are not a participant in this trade",
        incompleteMessage: "This trade is not completed yet",
        duplicateMessage: "You already rated this trade",
      },
      {
        id: skill_booking_id,
        column: "skill_booking_id",
        table: "skill_bookings",
        firstParticipant: "requester_id",
        secondParticipant: "teacher_id",
        notFoundMessage: "Skill booking not found",
        participantMessage: "You are not a participant in this skill booking",
        incompleteMessage: "This skill booking is not completed yet",
        duplicateMessage: "You already rated this skill booking",
      },
      {
        id: rental_booking_id,
        column: "rental_booking_id",
        table: "rental_bookings",
        firstParticipant: "borrower_id",
        secondParticipant: "owner_id",
        notFoundMessage: "Rental booking not found",
        participantMessage: "You are not a participant in this rental booking",
        incompleteMessage: "This rental booking is not completed yet",
        duplicateMessage: "You already rated this rental booking",
      },
    ].filter(option => option.id !== undefined && option.id !== null && option.id !== "");

    if (transactionOptions.length !== 1) {
      return res.status(400).json({
        message: "Exactly one transaction ID is required",
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const transaction = transactionOptions[0];
    duplicateMessage = transaction.duplicateMessage;
    const transactionResult = await db.query(
      `SELECT ${transaction.firstParticipant}, ${transaction.secondParticipant}, status
       FROM ${transaction.table}
       WHERE id = $1`,
      [transaction.id]
    );
    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ message: transaction.notFoundMessage });
    }

    const transactionRow = transactionResult.rows[0];
    const isParticipant = [
      transactionRow[transaction.firstParticipant],
      transactionRow[transaction.secondParticipant],
    ].some(
      participantId => String(participantId) === String(reviewer_id)
    );
    if (!isParticipant) {
      return res.status(403).json({ message: transaction.participantMessage });
    }

    if (transactionRow.status !== "completed") {
      return res.status(409).json({ message: transaction.incompleteMessage });
    }

    const firstParticipantId = transactionRow[transaction.firstParticipant];
    const secondParticipantId = transactionRow[transaction.secondParticipant];
    const expectedReviewee = String(firstParticipantId) === String(reviewer_id)
      ? secondParticipantId
      : firstParticipantId;
    if (String(expectedReviewee) === String(reviewer_id)) {
      return res.status(400).json({ message: "You cannot rate yourself" });
    }
    if (reviewee_id !== undefined && reviewee_id !== null && String(reviewee_id) !== String(expectedReviewee)) {
      return res.status(403).json({
        message: "Reviewee is not the other transaction participant",
      });
    }

    const existing = await db.query(
      `SELECT id FROM ratings WHERE ${transaction.column} = $1 AND reviewer_id = $2`,
      [transaction.id, reviewer_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: transaction.duplicateMessage });
    }

    const result = await db.query(
      `INSERT INTO ratings (${transaction.column}, reviewer_id, reviewee_id, rating, review)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [transaction.id, reviewer_id, expectedReviewee, rating, review]
    );

    res.status(201).json({ rating: result.rows[0] });
  } catch (error) {
    if (
      error?.code === "23505" &&
      ratingUniqueConstraints.has(error?.constraint)
    ) {
      return res.status(409).json({ message: duplicateMessage });
    }
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