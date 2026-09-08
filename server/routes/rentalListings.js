const express = require('express');
const router = express.Router();
const db = require('../models/db');
const requireAuth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');

function normaliseListing(row) {
  if (!row) return null;

  const imageUrls = Array.isArray(row.image_urls)
    ? row.image_urls.filter(Boolean)
    : row.image_urls
      ? [row.image_urls].filter(Boolean)
      : [];

  return {
    ...row,
    id: row.id,
    owner_id: row.owner_id,
    item_name: row.item_name || row.title,
    description: row.description,
    category: row.category,
    image_urls: imageUrls,
    rate_type: row.rate_type || 'daily',
    rate_amount: Number(row.rate_amount ?? row.daily_rate ?? 0),
    status: row.status,
    owner_name: row.owner_name || row.owner_username || 'Owner',
  };
}

router.post('/', requireAuth, requireVerified, async (req, res) => {
  try {
    const { item_name, description, category, image_urls, rate_type, rate_amount, status } = req.body;

    if (!item_name || !String(item_name).trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const normalizedRateType = String(rate_type || 'daily').trim().toLowerCase();
    if (!['hourly', 'daily'].includes(normalizedRateType)) {
      return res.status(400).json({ error: 'rate_type must be hourly or daily' });
    }

    if (rate_amount === undefined || rate_amount === null || rate_amount === '' || Number(rate_amount) <= 0) {
      return res.status(400).json({ error: 'rate_amount must be a positive number' });
    }

    const normalizedImageUrls = Array.isArray(image_urls) ? image_urls.filter(Boolean) : [];

    const result = await db.query(
      `INSERT INTO rental_listings (owner_id, item_name, description, category, image_urls, rate_type, rate_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.userId,
        String(item_name).trim(),
        description || null,
        category ? String(category).trim() : null,
        normalizedImageUrls,
        normalizedRateType,
        Number(rate_amount),
        status || 'available',
      ]
    );

    res.status(201).json({ rental: normaliseListing(result.rows[0]) });
  } catch (err) {
    console.error('POST /rental-listings error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT l.*, u.username AS owner_name
       FROM rental_listings l
       JOIN users u ON u.id = l.owner_id
       WHERE l.owner_id = $1
       ORDER BY l.created_at DESC`,
      [req.userId]
    );

    res.json({ rentals: result.rows.map(normaliseListing) });
  } catch (err) {
    console.error('GET /rental-listings/mine error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT l.*, u.username AS owner_name
       FROM rental_listings l
       JOIN users u ON u.id = l.owner_id
       WHERE l.id = $1`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Rental listing not found' });
    }

    res.json({ rental: normaliseListing(result.rows[0]) });
  } catch (err) {
    console.error('GET /rental-listings/:id error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { item_name, description, category, image_urls, rate_type, rate_amount, status } = req.body;

    const existing = await db.query(
      'SELECT * FROM rental_listings WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.userId]
    );

    if (!existing.rows[0]) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const nextItemName = item_name !== undefined ? String(item_name).trim() : existing.rows[0].item_name;
    const nextDescription = description !== undefined ? description : existing.rows[0].description;
    const nextCategory = category !== undefined ? String(category).trim() : existing.rows[0].category;
    const nextRateType = rate_type !== undefined ? String(rate_type).trim().toLowerCase() : (existing.rows[0].rate_type || 'daily');
    const nextRateAmount = rate_amount !== undefined ? Number(rate_amount) : Number(existing.rows[0].rate_amount || 0);
    const nextStatus = status !== undefined ? status : (existing.rows[0].status || 'available');
    const nextImageUrls = Array.isArray(image_urls) ? image_urls.filter(Boolean) : existing.rows[0].image_urls;

    if (!nextItemName) {
      return res.status(400).json({ error: 'Item name is required' });
    }
    if (!['hourly', 'daily'].includes(nextRateType)) {
      return res.status(400).json({ error: 'rate_type must be hourly or daily' });
    }
    if (!Number.isFinite(nextRateAmount) || nextRateAmount <= 0) {
      return res.status(400).json({ error: 'rate_amount must be a positive number' });
    }

    const result = await db.query(
      `UPDATE rental_listings
       SET item_name = $1, description = $2, category = $3, image_urls = $4, rate_type = $5, rate_amount = $6, status = $7, updated_at = NOW()
       WHERE id = $8 AND owner_id = $9
       RETURNING *`,
      [nextItemName, nextDescription, nextCategory, nextImageUrls, nextRateType, nextRateAmount, nextStatus, req.params.id, req.userId]
    );

    res.json({ rental: normaliseListing(result.rows[0]) });
  } catch (err) {
    console.error('PUT /rental-listings/:id error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM rental_listings WHERE id = $1 AND owner_id = $2 RETURNING *',
      [req.params.id, req.userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({ success: true, message: 'Rental listing deleted' });
  } catch (err) {
    console.error('DELETE /rental-listings/:id error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const normalizedSearch = String(search || '').trim();

    let query = `
      SELECT l.*, u.username AS owner_name
      FROM rental_listings l
      JOIN users u ON u.id = l.owner_id
      WHERE l.status = $1
    `;
    const values = ['available'];

    if (category) {
      const normalizedCategory = String(category).trim();
      query += ` AND LOWER(l.category) = LOWER($${values.length + 1})`;
      values.push(normalizedCategory);
    }

    if (normalizedSearch) {
      const searchTerms = normalizedSearch
        .split(/\s+/)
        .filter(Boolean)
        .map((term) => term.replace(/[%_]/g, '\\$&'));

      if (searchTerms.length > 0) {
        const clauses = [];

        for (const term of searchTerms) {
          const baseIndex = values.length + 1;
          const pattern = `%${term}%`;
          clauses.push(`(
            LOWER(l.item_name) LIKE LOWER($${baseIndex}) OR
            LOWER(l.description) LIKE LOWER($${baseIndex + 1}) OR
            LOWER(l.category) LIKE LOWER($${baseIndex + 2}) OR
            LOWER(u.username) LIKE LOWER($${baseIndex + 3})
          )`);
          values.push(pattern, pattern, pattern, pattern);
        }

        query += ` AND (${clauses.join(' OR ')})`;
      }
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await db.query(query, values);
    res.json({ rentals: result.rows.map(normaliseListing) });
  } catch (err) {
    console.error('GET /rental-listings error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

module.exports = router;
