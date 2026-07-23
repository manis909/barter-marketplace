const express = require('express');
const router = express.Router();

const db = require('../models/db');
const requireAuth = require('../middleware/auth');

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, category, image_urls } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await db.query(
      `INSERT INTO items (owner_id, title, description, category, image_urls)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.userId, title, description || null, category || null, Array.isArray(image_urls) ? image_urls : []]
    );

    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    console.error('POST /items error:', err);
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
      query += `AND i.category ILIKE $${values.length + 1} `;
      values.push(category);
    }

    if (search) {
      query += `AND (i.title ILIKE $${values.length + 1} OR i.description ILIKE $${values.length + 1}) `;
      values.push(`%${search}%`);
    }

    query += 'ORDER BY i.created_at DESC';

    const result = await db.query(query, values);
    res.json({ items: result.rows });
  } catch (err) {
    console.error('GET /items error:', err);
    res.status(500).json({ error: 'Server error' });
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
