const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const db = require("../models/db");

// ── GET /api/rental-bookings/mine ───────────────────────────────────────────
// Fetch all rental bookings for the current user (as borrower or owner),
// joined with listing + user info for the chat list.
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rb.*,
              rl.item_name,
              rl.description  AS item_description,
              rl.category     AS item_category,
              rl.image_urls   AS item_image_urls,
              u_borrower.username   AS borrower_username,
              u_borrower.full_name  AS borrower_name,
              u_borrower.profile_image AS borrower_profile_image,
              u_owner.username   AS owner_username,
              u_owner.full_name  AS owner_name,
              u_owner.profile_image AS owner_profile_image
       FROM rental_bookings rb
       LEFT JOIN rental_listings rl ON rl.id = rb.rental_listing_id
       JOIN users u_borrower ON u_borrower.id = rb.borrower_id
       JOIN users u_owner    ON u_owner.id    = rb.owner_id
       WHERE rb.borrower_id = $1 OR rb.owner_id = $1
       ORDER BY rb.created_at DESC`,
      [req.userId]
    );

    res.json({ success: true, bookings: result.rows });
  } catch (error) {
    console.error("GET /rental-bookings/mine error:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// ── GET /api/rental-bookings/hidden/mine ────────────────────────────────────
// Fetch all rental booking IDs that the current user has hidden from their chat list
router.get("/hidden/mine", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT booking_id FROM rental_booking_deletions WHERE user_id = $1`,
      [req.userId]
    );
    res.json(result.rows.map(r => r.booking_id));
  } catch (error) {
    console.error("GET /rental-bookings/hidden/mine error:", error);
    res.status(500).json({ error: "Failed to fetch hidden chats" });
  }
});

// ── DELETE /api/rental-bookings/:bookingId/for-me ───────────────────────────
// Hide this rental booking chat from the current user's list only
router.delete("/:bookingId/for-me", requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.userId;

    // Verify booking exists and user is part of it
    const bookingRes = await db.query(
      `SELECT id FROM rental_bookings WHERE id = $1 AND (borrower_id = $2 OR owner_id = $2)`,
      [bookingId, userId]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found or you're not part of this chat" });
    }

    // Insert into hidden bookings (ignore if already exists)
    await db.query(
      `INSERT INTO rental_booking_deletions (booking_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (booking_id, user_id) DO NOTHING`,
      [bookingId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE /rental-bookings/:bookingId/for-me error:", error);
    res.status(500).json({ error: "Failed to hide chat" });
  }
});

module.exports = router;
