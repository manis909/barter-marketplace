const express = require('express');
const router = express.Router();

const db = require('../models/db');
const requireAuth = require('../middleware/auth');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(val) { return UUID_RE.test(val); }

// ── GET /api/rental-wishlist ───────────────────────────────────────────────
// Returns all wishlisted rental listings for the current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rw.id AS wishlist_id,
              rw.created_at AS wishlisted_at,
              rl.id,
              rl.owner_id,
              rl.item_name,
              rl.description,
              rl.category,
              rl.rate_amount,
              rl.rate_type,
              rl.image_urls,
              rl.status,
              rl.created_at,
              u.full_name AS owner_name,
              u.username AS owner_username,
              u.profile_image AS owner_profile_image
       FROM rental_wishlists rw
       JOIN rental_listings rl ON rl.id = rw.rental_listing_id
       LEFT JOIN users u ON u.id = rl.owner_id
       WHERE rw.user_id = $1
       ORDER BY rw.created_at DESC`,
      [req.userId]
    );

    res.json({ success: true, wishlist: result.rows });
  } catch (err) {
    console.error('GET /api/rental-wishlist error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/rental-wishlist/ids ───────────────────────────────────────────
// Lightweight route: returns array of wishlisted rental_listing_ids
router.get('/ids', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rental_listing_id FROM rental_wishlists WHERE user_id = $1`,
      [req.userId]
    );
    res.json({ success: true, ids: result.rows.map(r => r.rental_listing_id) });
  } catch (err) {
    console.error('GET /api/rental-wishlist/ids error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/rental-wishlist/:rentalListingId ─────────────────────────────
router.post('/:rentalListingId', requireAuth, async (req, res) => {
  try {
    const { rentalListingId } = req.params;
    if (!isValidUUID(rentalListingId)) {
      return res.status(400).json({ error: 'Invalid rental listing id' });
    }

    const listingCheck = await db.query(
      'SELECT id FROM rental_listings WHERE id = $1',
      [rentalListingId]
    );
    if (listingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Rental listing not found' });
    }

    const result = await db.query(
      `INSERT INTO rental_wishlists (user_id, rental_listing_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, rental_listing_id) DO NOTHING
       RETURNING *`,
      [req.userId, rentalListingId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ success: true, message: 'Rental already in wishlist' });
    }

    res.status(201).json({ success: true, wishlistEntry: result.rows[0] });
  } catch (err) {
    console.error('POST /api/rental-wishlist/:rentalListingId error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/rental-wishlist/:rentalListingId ───────────────────────────
router.delete('/:rentalListingId', requireAuth, async (req, res) => {
  try {
    const { rentalListingId } = req.params;
    if (!isValidUUID(rentalListingId)) {
      return res.status(400).json({ error: 'Invalid rental listing id' });
    }

    const result = await db.query(
      'DELETE FROM rental_wishlists WHERE user_id = $1 AND rental_listing_id = $2 RETURNING *',
      [req.userId, rentalListingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wishlist entry not found' });
    }

    res.json({ success: true, message: 'Rental removed from wishlist' });
  } catch (err) {
    console.error('DELETE /api/rental-wishlist/:rentalListingId error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
