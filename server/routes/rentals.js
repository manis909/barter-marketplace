const express = require('express');
const router = express.Router();

const db = require('../models/db');
const requireAuth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');

// ── POST /api/rentals ────────────────────────────────────────────────
// Create a new rental listing. Owner must be authenticated and verified.
// rate_amount is informational only — no payment processing, coins,
// commission, or gateway involved. Payment happens directly between
// the two students outside the app.
router.post('/', requireAuth, requireVerified, async (req, res) => {
  try {
    console.log('POST /rentals request body:', req.body);

    const { item_name, description, category, image_urls, rate_type, rate_amount } = req.body;

    if (!item_name || !String(item_name).trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    if (rate_type !== 'hourly' && rate_type !== 'daily') {
      return res.status(400).json({ error: 'rate_type must be either "hourly" or "daily"' });
    }

    if (rate_amount === undefined || rate_amount === null || rate_amount === '' || isNaN(rate_amount) || Number(rate_amount) <= 0) {
      return res.status(400).json({ error: 'rate_amount is required and must be a positive number' });
    }

    const normalizedImageUrls = Array.isArray(image_urls) ? image_urls.filter(Boolean) : [];
    const normalizedCategory = category ? String(category).trim() : null;

    const result = await db.query(
      `INSERT INTO rental_listings (owner_id, item_name, description, category, image_urls, rate_type, rate_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'available')
       RETURNING *`,
      [
        req.userId,
        String(item_name).trim(),
        description || null,
        normalizedCategory,
        normalizedImageUrls,
        rate_type,
        Number(rate_amount),
      ]
    );

    console.log('Database insert result:', result.rows[0]);
    res.status(201).json({ rental: result.rows[0] });
  } catch (err) {
    console.error('POST /rentals error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// ── GET /api/rentals/mine ────────────────────────────────────────────
// Get all rental listings owned by the authenticated user (all statuses).
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, u.username AS owner_name
       FROM rental_listings r
       JOIN users u ON u.id = r.owner_id
       WHERE r.owner_id = $1
       ORDER BY r.created_at DESC`,
      [req.userId]
    );

    res.json({ rentals: result.rows });
  } catch (err) {
    console.error('GET /rentals/mine error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/rentals ─────────────────────────────────────────────────
// Get all publicly rentable listings (status = 'available').
// Supports ?category= and ?search= query params.
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const normalizedSearch = String(search || '').trim();
    let query = `
      SELECT r.*, u.username AS owner_name
      FROM rental_listings r
      JOIN users u ON u.id = r.owner_id
      WHERE r.status = $1
    `;
    const values = ['available'];

    if (category) {
      const normalizedCategory = String(category).trim();
      query += ` AND LOWER(r.category) = LOWER($${values.length + 1})`;
      values.push(normalizedCategory);
    }

    if (normalizedSearch) {
      const searchTerms = normalizedSearch
        .split(/\s+/)
        .filter(Boolean)
        .map((term) => term.replace(/[%_]/g, '\\$&'));

      if (searchTerms.length > 0) {
        const searchClauses = [];

        for (const term of searchTerms) {
          const baseIndex = values.length + 1;
          const pattern = `%${term}%`;
          searchClauses.push(`(
            LOWER(r.item_name) LIKE LOWER($${baseIndex}) OR
            LOWER(r.description) LIKE LOWER($${baseIndex + 1}) OR
            LOWER(r.category) LIKE LOWER($${baseIndex + 2})
          )`);
          values.push(pattern, pattern, pattern);
        }

        query += ` AND (${searchClauses.join(' OR ')})`;
      }
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await db.query(query, values);
    res.json({ rentals: result.rows });
  } catch (err) {
    console.error('GET /rentals error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/rentals/:id ─────────────────────────────────────────────
// Get a single rental listing by ID (public endpoint).
// NOTE: rental_listings has no view_count column, so no view tracking here.
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, u.username AS owner_name
       FROM rental_listings r
       JOIN users u ON u.id = r.owner_id
       WHERE r.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rental listing not found' });
    }

    res.json({ rental: result.rows[0] });
  } catch (err) {
    console.error('GET /rentals/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/rentals/:id ─────────────────────────────────────────────
// Update a rental listing (owner only).
// Owner may only set status to 'available' or 'paused'.
// The 'rented' transition is controlled exclusively by Member 3's
// booking flow — reject it here rather than silently ignoring it.
router.put('/:id', requireAuth, requireVerified, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership before allowing update
    const existing = await db.query(
      'SELECT owner_id FROM rental_listings WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Rental listing not found' });
    }

    if (existing.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'You do not have permission to edit this listing' });
    }

    const { item_name, description, category, image_urls, rate_type, rate_amount, status } = req.body;

    if (item_name !== undefined && !String(item_name).trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    if (rate_type !== undefined && rate_type !== 'hourly' && rate_type !== 'daily') {
      return res.status(400).json({ error: 'rate_type must be either "hourly" or "daily"' });
    }

    if (rate_amount !== undefined && rate_amount !== null && rate_amount !== '') {
      if (isNaN(rate_amount) || Number(rate_amount) <= 0) {
        return res.status(400).json({ error: 'rate_amount must be a positive number' });
      }
    }

    if (status !== undefined) {
      if (status === 'rented') {
        return res.status(400).json({ error: 'The "rented" status is controlled by the booking flow and cannot be set here' });
      }
      if (status !== 'available' && status !== 'paused') {
        return res.status(400).json({ error: 'status must be either "available" or "paused"' });
      }
    }

    // If image_urls is provided, normalize and update it (an empty array is
    // valid — it clears the images). If NOT provided, pass null so COALESCE
    // preserves the existing value unchanged.
    const normalizedImageUrls = image_urls !== undefined
      ? (Array.isArray(image_urls) ? image_urls.filter(Boolean) : [])
      : null;
    const normalizedCategory = category !== undefined && category !== null ? String(category).trim() : null;

    const result = await db.query(
      `UPDATE rental_listings
       SET item_name = COALESCE($1, item_name),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           image_urls = COALESCE($4, image_urls),
           rate_type = COALESCE($5, rate_type),
           rate_amount = COALESCE($6, rate_amount),
           status = COALESCE($7, status),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        item_name !== undefined ? String(item_name).trim() : null,
        description !== undefined ? description : null,
        normalizedCategory,
        normalizedImageUrls,
        rate_type !== undefined ? rate_type : null,
        rate_amount !== undefined && rate_amount !== null && rate_amount !== '' ? Number(rate_amount) : null,
        status !== undefined ? status : null,
        id
      ]
    );

    res.json({ rental: result.rows[0] });
  } catch (err) {
    console.error('PUT /rentals/:id error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// ── DELETE /api/rentals/:id ──────────────────────────────────────────
// Delete a rental listing (owner only).
// rental_bookings references rental_listings with ON DELETE CASCADE,
// so dependent bookings are removed automatically — no manual cascade.
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Verify ownership
    const existing = await db.query(
      'SELECT owner_id FROM rental_listings WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Rental listing not found' });
    }

    if (existing.rows[0].owner_id !== req.userId) {
      return res.status(403).json({
        error: 'You do not have permission to delete this listing'
      });
    }

    await db.query('DELETE FROM rental_listings WHERE id = $1', [id]);

    res.json({ message: 'Listing deleted successfully' });
  } catch (err) {
    console.error('DELETE /rentals/:id error:', err);
    res.status(500).json({
      error: err.message || 'Server error'
    });
  }
});

module.exports = router;