const express = require('express');
const router = express.Router();
const db = require('../models/db');
const requireAuth = require('../middleware/auth');

// ── POST /api/feedback ────────────────────────────────────────────────────
// Submit new feedback. Auth optional — anonymous submissions allowed.
// The JWT is decoded when present so we can store user_id; missing token
// is fine (is_anonymous=true or logged-out users).
const jwt = require('jsonwebtoken');

router.post('/', async (req, res) => {
  try {
    const { rating, category, message, is_anonymous } = req.body;

    // Validation
    if (!rating || !message || !message.trim()) {
      return res.status(400).json({ error: 'Rating and message are required.' });
    }
    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }
    if (message.trim().length > 1000) {
      return res.status(400).json({ error: 'Message must be 1000 characters or fewer.' });
    }

    // Decode user from token if present — not required
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch {
        // Invalid/expired token — treat as anonymous, don't block the request
      }
    }

    const result = await db.query(
      `INSERT INTO feedback (user_id, rating, category, message, is_anonymous)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, rating, category, message, is_anonymous, created_at`,
      [
        is_anonymous ? null : userId,
        ratingNum,
        category?.trim() || null,
        message.trim(),
        Boolean(is_anonymous),
      ]
    );

    res.status(201).json({ feedback: result.rows[0] });
  } catch (err) {
    console.error('POST /feedback error:', err.message);
    res.status(500).json({ error: 'Failed to submit feedback.' });
  }
});

// ── GET /api/feedback ─────────────────────────────────────────────────────
// Return all non-anonymous reviews for the Community Reviews section.
// Joined to users for display name/initials.
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        f.id,
        f.rating,
        f.category,
        f.message,
        f.is_anonymous,
        f.created_at,
        CASE WHEN f.is_anonymous THEN NULL ELSE u.username  END AS username,
        CASE WHEN f.is_anonymous THEN NULL ELSE u.full_name END AS full_name
      FROM feedback f
      LEFT JOIN users u ON u.id = f.user_id
      ORDER BY f.created_at DESC
      LIMIT 50
    `);

    res.json({ feedback: result.rows });
  } catch (err) {
    console.error('GET /feedback error:', err.message);
    res.status(500).json({ error: 'Failed to load feedback.' });
  }
});

// ── GET /api/feedback/summary ─────────────────────────────────────────────
// Returns avg rating, total count, and per-star distribution.
router.get('/summary', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        ROUND(AVG(rating)::numeric, 1)       AS avg_rating,
        COUNT(*)                              AS total,
        COUNT(*) FILTER (WHERE rating = 5)   AS five_star,
        COUNT(*) FILTER (WHERE rating = 4)   AS four_star,
        COUNT(*) FILTER (WHERE rating = 3)   AS three_star,
        COUNT(*) FILTER (WHERE rating = 2)   AS two_star,
        COUNT(*) FILTER (WHERE rating = 1)   AS one_star
      FROM feedback
    `);
    res.json({ summary: result.rows[0] });
  } catch (err) {
    console.error('GET /feedback/summary error:', err.message);
    res.status(500).json({ error: 'Failed to load summary.' });
  }
});

module.exports = router;
