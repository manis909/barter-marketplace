const express = require("express");
const router = express.Router();

const db = require("../models/db");
const requireAuth = require("../middleware/auth");

// ── UUID guard ────────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(val) { return UUID_RE.test(val); }

// ── GET /api/skill-wishlist ────────────────────────────────────────────────
// Returns wishlisted skills from both skill_listings and skill_provider_applications
router.get("/", requireAuth, async (req, res) => {
  try {
    // Get wishlist for skill_listings
    const listingResult = await db.query(
      `SELECT sw.id AS wishlist_id, sw.created_at AS wishlisted_at,
              sl.id, sl.teacher_id, sl.skill_name, sl.description,
              sl.category, sl.price_type, sl.price, sl.price_unit,
              sl.session_type, sl.max_participants, sl.image_urls, sl.status,
              u.full_name AS teacher_name, 'listing' AS source
       FROM skill_wishlists sw
       JOIN skill_listings sl ON sl.id = sw.skill_listing_id
       JOIN users u ON u.id = sl.teacher_id
       WHERE sw.user_id = $1
       ORDER BY sw.created_at DESC`,
      [req.userId]
    );

    // Get wishlist for skill_provider_applications
    const appResult = await db.query(
      `SELECT sw.id AS wishlist_id, sw.created_at AS wishlisted_at,
              spa.id, spa.user_id AS teacher_id, spa.skill_name, spa.skill_description AS description,
              spa.category, spa.experience_level, spa.teaching_mode,
              u.full_name AS teacher_name, 'application' AS source
       FROM skill_wishlists sw
       JOIN skill_provider_applications spa ON spa.id = sw.skill_listing_id
       JOIN users u ON u.id = spa.user_id
       WHERE sw.user_id = $1 AND spa.status = 'approved'
       ORDER BY sw.created_at DESC`,
      [req.userId]
    );

    const allWishlist = [...listingResult.rows, ...appResult.rows];
    res.json({ success: true, wishlist: allWishlist });
  } catch (err) {
    console.error("GET /api/skill-wishlist error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── POST /api/skill-wishlist/:skillListingId ──────────────────────────────
// Supports both skill_listing IDs and skill_provider_application IDs
router.post("/:skillListingId", requireAuth, async (req, res) => {
  try {
    const { skillListingId } = req.params;
    if (!isValidUUID(skillListingId)) {
      return res.status(400).json({ error: "Invalid skill id" });
    }

    // Check if it's a skill_listing
    const listingCheck = await db.query("SELECT id FROM skill_listings WHERE id = $1", [skillListingId]);
    if (listingCheck.rows.length === 0) {
      // Check if it's a skill_provider_application (only approved ones)
      const appCheck = await db.query(
        "SELECT id FROM skill_provider_applications WHERE id = $1 AND status = 'approved'",
        [skillListingId]
      );
      if (appCheck.rows.length === 0) {
        return res.status(404).json({ error: "Skill not found" });
      }
    }

    const result = await db.query(
      `INSERT INTO skill_wishlists (user_id, skill_listing_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, skill_listing_id) DO NOTHING
       RETURNING *`,
      [req.userId, skillListingId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ success: true, message: "Skill already in wishlist" });
    }
    res.status(201).json({ success: true, wishlistEntry: result.rows[0] });
  } catch (err) {
    console.error("POST /api/skill-wishlist/:skillListingId error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── DELETE /api/skill-wishlist/:skillListingId ────────────────────────────
router.delete("/:skillListingId", requireAuth, async (req, res) => {
  try {
    const { skillListingId } = req.params;
    if (!isValidUUID(skillListingId)) {
      return res.status(400).json({ error: "Invalid skill listing id" });
    }

    const result = await db.query(
      "DELETE FROM skill_wishlists WHERE user_id = $1 AND skill_listing_id = $2 RETURNING *",
      [req.userId, skillListingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Wishlist entry not found" });
    }
    res.json({ success: true, message: "Skill removed from wishlist" });
  } catch (err) {
    console.error("DELETE /api/skill-wishlist/:skillListingId error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
