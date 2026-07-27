const express = require('express');
const router = express.Router();

const db = require('../models/db');
const requireAuth = require('../middleware/auth');

const conditionMap = {
  excellent: 'like_new',
  'very good': 'good',
  good: 'good',
  fair: 'fair',
  poor: 'poor',
  new: 'new',
  'like new': 'like_new'
};

function normalizeCondition(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return conditionMap[normalized] || null;
}

router.post('/', requireAuth, async (req, res) => {
  try {
    console.log('POST /items request body:', req.body);

    const { title, description, category, image_urls, condition, item_condition } = req.body;
    const rawEstimatedValue = req.body.estimated_value ?? req.body.coinValue;
    const normalizedCondition = normalizeCondition(item_condition || condition);
    const normalizedImageUrls = Array.isArray(image_urls) ? image_urls.filter(Boolean) : [];

    console.log('Normalized image_urls:', normalizedImageUrls);

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (condition || item_condition) {
      if (!normalizedCondition) {
        return res.status(400).json({ error: 'Invalid item condition' });
      }
    }

    const result = await db.query(
      `INSERT INTO items (owner_id, title, description, category, item_condition, estimated_value, image_urls)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.userId,
        title,
        description || null,
        category || null,
        normalizedCondition,
        rawEstimatedValue || null,
        normalizedImageUrls
      ]
    );

    console.log('Database insert result:', result.rows[0]);
    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    console.error('POST /items error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Server error' });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT i.*, u.username AS owner_name, u.id AS owner_id
       FROM items i
       JOIN users u ON u.id = i.owner_id
       WHERE i.owner_id = $1
       ORDER BY i.created_at DESC`,
      [req.userId]
    );

    res.json({ items: result.rows });
  } catch (err) {
    console.error('GET /items/mine error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = `
      SELECT i.*, u.username AS owner_name, u.id AS owner_id
      FROM items i
      JOIN users u ON u.id = i.owner_id
      WHERE i.status = $1
    `;
    const values = ['available'];

    if (category) {
      query += ` AND i.category ILIKE $${values.length + 1}`;
      values.push(category);
    }

    if (search) {
      query += ` AND (i.title ILIKE $${values.length + 1} OR i.description ILIKE $${values.length + 1})`;
      values.push(`%${search}%`);
    }

    query += ' ORDER BY i.created_at DESC';

    const result = await db.query(query, values);
    res.json({ items: result.rows });
  } catch (err) {
    console.error('GET /items error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership before allowing update
    const existing = await db.query(
      'SELECT owner_id FROM items WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (existing.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'You do not have permission to edit this listing' });
    }

    const { title, description, category, image_urls, condition, item_condition } = req.body;
    const normalizedCondition = normalizeCondition(item_condition || condition);
    const normalizedImageUrls = Array.isArray(image_urls) ? image_urls.filter(Boolean) : [];

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if ((condition || item_condition) && !normalizedCondition) {
      return res.status(400).json({ error: 'Invalid item condition' });
    }

    const result = await db.query(
      `UPDATE items
       SET title = $1,
           description = $2,
           category = $3,
           item_condition = $4,
           image_urls = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        title,
        description || null,
        category || null,
        normalizedCondition,
        normalizedImageUrls,
        id
      ]
    );

    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('PUT /items/:id error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Server error' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership before allowing delete
    const existing = await db.query(
      'SELECT owner_id FROM items WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (existing.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this listing' });
    }

    await db.query('DELETE FROM items WHERE id = $1', [id]);

    res.json({ message: 'Listing deleted successfully' });
  } catch (err) {
    console.error('DELETE /items/:id error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT i.*, u.username AS owner_name, u.id AS owner_id
       FROM items i
       JOIN users u ON u.id = i.owner_id
       WHERE i.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('GET /items/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
