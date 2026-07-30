const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

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
    const normalizedSearch = String(search || '').trim();
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
            LOWER(i.title) LIKE LOWER($${baseIndex}) OR
            LOWER(i.description) LIKE LOWER($${baseIndex + 1}) OR
            LOWER(i.category) LIKE LOWER($${baseIndex + 2})
          )`);
          values.push(pattern, pattern, pattern);
        }

        query += ` AND (${searchClauses.join(' OR ')})`;
      }
    }

    query += ' ORDER BY i.created_at DESC';

    const result = await db.query(query, values);
    res.json({ items: result.rows });
  } catch (err) {
    console.error('GET /items error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT i.*, u.username AS owner_name, u.id AS owner_id,
              COALESCE(w.wishlist_count, 0) AS wishlist_count,
              (i.view_count + COALESCE(w.wishlist_count, 0)) AS trending_score
       FROM items i
       JOIN users u ON u.id = i.owner_id
       LEFT JOIN (
           SELECT item_id, COUNT(*) AS wishlist_count
           FROM wishlists
           GROUP BY item_id
       ) w ON w.item_id = i.id
       WHERE i.status = $1
       ORDER BY trending_score DESC, i.created_at DESC
       LIMIT 8`,
      ['available']
    );

    res.json({ items: result.rows });
  } catch (err) {
    console.error('GET /items/trending error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/recommended', requireAuth, async (req, res) => {
  try {
    // 1. Check if user has any wishlisted items
    const wishlistCheck = await db.query(
      'SELECT 1 FROM wishlists WHERE user_id = $1 LIMIT 1',
      [req.userId]
    );

    if (wishlistCheck.rows.length === 0) {
      // Return the same results as the Trending endpoint
      const result = await db.query(
        `SELECT i.*, u.username AS owner_name, u.id AS owner_id,
                COALESCE(w.wishlist_count, 0) AS wishlist_count,
                (i.view_count + COALESCE(w.wishlist_count, 0)) AS trending_score
         FROM items i
         JOIN users u ON u.id = i.owner_id
         LEFT JOIN (
             SELECT item_id, COUNT(*) AS wishlist_count
             FROM wishlists
             GROUP BY item_id
         ) w ON w.item_id = i.id
         WHERE i.status = $1
         ORDER BY trending_score DESC, i.created_at DESC
         LIMIT 8`,
        ['available']
      );
      return res.json({ items: result.rows });
    }

    // 2. Extract categories of items wishlisted by user, and find other available items from those same categories
    // Excluding items already wishlisted by the user
    const result = await db.query(
      `SELECT i.*, u.username AS owner_name, u.id AS owner_id
       FROM items i
       JOIN users u ON u.id = i.owner_id
       WHERE i.status = $1
         AND i.category IN (
             SELECT DISTINCT category
             FROM items
             WHERE id IN (SELECT item_id FROM wishlists WHERE user_id = $2)
               AND category IS NOT NULL
         )
         AND i.id NOT IN (
             SELECT item_id
             FROM wishlists
             WHERE user_id = $2
         )
       ORDER BY i.created_at DESC
       LIMIT 8`,
      ['available', req.userId]
    );

    res.json({ items: result.rows });
  } catch (err) {
    console.error('GET /items/recommended error:', err);
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

    const item = result.rows[0];

    // Decode token if present
    let reqUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        reqUserId = decoded.userId;
      } catch (err) {
        // Ignore invalid token and treat as unauthenticated
      }
    }

    if (reqUserId !== item.owner_id) {
      await db.query(
        'UPDATE items SET view_count = view_count + 1 WHERE id = $1',
        [item.id]
      );
      item.view_count += 1;
    }

    res.json({ item });
  } catch (err) {
    console.error('GET /items/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Verify ownership
    const existing = await db.query(
      'SELECT owner_id FROM items WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (existing.rows[0].owner_id !== req.userId) {
      return res.status(403).json({
        error: 'You do not have permission to delete this listing'
      });
    }

    await db.query('BEGIN');

    // Delete notifications linked to this item's trade offers
    await db.query(
      `
      DELETE FROM notifications
      WHERE trade_offer_id IN (
        SELECT id
        FROM trade_offers
        WHERE offered_item_id = $1
           OR requested_item_id = $1
      )
      `,
      [id]
    );

 // Delete trade events
await db.query(
  `
  DELETE FROM trade_events
  WHERE trade_id IN (
    SELECT id
    FROM trade_offers
    WHERE offered_item_id = $1
       OR requested_item_id = $1
  )
  `,
  [id]
);

// Delete ratings
await db.query(
  `
  DELETE FROM ratings
  WHERE trade_offer_id IN (
    SELECT id
    FROM trade_offers
    WHERE offered_item_id = $1
       OR requested_item_id = $1
  )
  `,
  [id]
);

// Delete chat deletions
await db.query(
  `
  DELETE FROM chat_deletions
  WHERE trade_offer_id IN (
    SELECT id
    FROM trade_offers
    WHERE offered_item_id = $1
       OR requested_item_id = $1
  )
  `,
  [id]
);

// Delete messages
await db.query(
  `
  DELETE FROM messages
  WHERE trade_offer_id IN (
    SELECT id
    FROM trade_offers
    WHERE offered_item_id = $1
       OR requested_item_id = $1
  )
  `,
  [id]
);

// Delete trade offer items
await db.query(
  `
  DELETE FROM trade_offer_items
  WHERE trade_id IN (
    SELECT id
    FROM trade_offers
    WHERE offered_item_id = $1
       OR requested_item_id = $1
  )
  `,
  [id]
);

// Delete trade offers
await db.query(
  `
  DELETE FROM trade_offers
  WHERE offered_item_id = $1
     OR requested_item_id = $1
  `,
  [id]
);

    // Delete the item
    await db.query(
      'DELETE FROM items WHERE id = $1',
      [id]
    );

    await db.query('COMMIT');

    res.json({ message: 'Listing deleted successfully' });

  } catch (err) {
    await db.query('ROLLBACK');

    console.error('DELETE /items/:id error:', err);

    res.status(500).json({
      error: err.message || 'Server error'
    });
  }
});
module.exports = router;