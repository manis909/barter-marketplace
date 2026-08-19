const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const db = require('../models/db');
const requireAuth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');

const conditionMap = {
  excellent: 'like_new',
  'very good': 'good',
  good: 'good',
  fair: 'fair',
  poor: 'poor',
  new: 'new',
  'like new': 'like_new'
};

const categoryNormalizationMap = {
  'fashion & accessories': 'Fashion',
  'home & living': 'Home',
  'musical instruments': 'Music',
  'sports & fitness': 'Sports',
};

function normalizeCondition(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return conditionMap[normalized] || null;
}

function normalizeCategory(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  const lower = trimmed.toLowerCase();
  return categoryNormalizationMap[lower] || trimmed;
}

router.post('/', requireAuth, requireVerified, async (req, res) => {
  try {
    console.log('POST /items request body:', req.body);

    const { title, description, category, image_urls, condition, item_condition } = req.body;
    const rawEstimatedValue = req.body.estimated_value ?? req.body.coinValue;
    const desiredItem = req.body.desired_item ?? req.body.desiredItem ?? null;
    const normalizedCondition = normalizeCondition(item_condition || condition);
    const normalizedCategory = normalizeCategory(category);
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
      `INSERT INTO items (owner_id, title, description, category, item_condition, estimated_value, image_urls, desired_item)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.userId,
        title,
        description || null,
        normalizedCategory || null,
        normalizedCondition,
        rawEstimatedValue || null,
        normalizedImageUrls,
        desiredItem || null
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
      const normalizedCategory = normalizeCategory(category);
      const categoryFilters = [normalizedCategory.toLowerCase()];
      const rawCategory = String(category).trim().toLowerCase();
      if (rawCategory !== normalizedCategory.toLowerCase()) {
        categoryFilters.push(rawCategory);
      }
      query += ` AND LOWER(i.category) = ANY($${values.length + 1})`;
      values.push(categoryFilters);
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
         AND (i.view_count + COALESCE(w.wishlist_count, 0)) > 0
       ORDER BY trending_score DESC
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
      // No wishlist history — fall back to genuinely trending items
      // (same logic as GET /trending: score > 0 only, no recency tiebreaker).
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
           AND (i.view_count + COALESCE(w.wishlist_count, 0)) > 0
         ORDER BY trending_score DESC
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

// ── GET /api/items/matches ────────────────────────────────────────────────
// Items whose desired_item field contains keywords from the current user's
// wishlisted/owned item titles, AND items whose title matches the
// desired_item fields of the current user's own listings.
// Auth-gated. Falls back to empty array — frontend hides the section.
router.get('/matches', requireAuth, async (req, res) => {
  try {
    // 1. Collect signal terms: titles of items the user has wishlisted
    const wishlistTitles = await db.query(
      `SELECT DISTINCT i.title, i.category
       FROM wishlists w
       JOIN items i ON i.id = w.item_id
       WHERE w.user_id = $1`,
      [req.userId]
    );

    // 2. Collect desired_item values from the user's own listings
    const ownDesired = await db.query(
      `SELECT DISTINCT desired_item
       FROM items
       WHERE owner_id = $1
         AND desired_item IS NOT NULL
         AND desired_item != ''`,
      [req.userId]
    );

    // Build a flat list of keyword tokens from both sources
    const rawTerms = [
      ...wishlistTitles.rows.map(r => r.title),
      ...ownDesired.rows.map(r => r.desired_item),
    ];

    if (rawTerms.length === 0) {
      return res.json({ items: [] });
    }

    // Tokenise: split on spaces/commas, keep tokens ≥ 3 chars, deduplicate
    const tokens = [...new Set(
      rawTerms
        .join(' ')
        .split(/[\s,]+/)
        .map(t => t.toLowerCase().trim())
        .filter(t => t.length >= 3)
    )];

    if (tokens.length === 0) {
      return res.json({ items: [] });
    }

    // Build ILIKE OR clauses — one per token, applied to items.desired_item
    // (what other listings are looking for that the current user could offer)
    const conditions = tokens.map((_, i) => `LOWER(i.desired_item) LIKE $${i + 2}`);
    const values = ['available', ...tokens.map(t => `%${t}%`)];

    const result = await db.query(
      `SELECT DISTINCT i.*, u.username AS owner_name, u.id AS owner_id
       FROM items i
       JOIN users u ON u.id = i.owner_id
       WHERE i.status = $1
         AND i.owner_id != $${values.length + 1}
         AND i.desired_item IS NOT NULL
         AND i.desired_item != ''
         AND (${conditions.join(' OR ')})
       ORDER BY i.created_at DESC
       LIMIT 8`,
      [...values, req.userId]
    );

    res.json({ items: result.rows });
  } catch (err) {
    console.error('GET /items/matches error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/items/similar ────────────────────────────────────────────────
// "You May Also Like" — items in the same categories as the caller's
// wishlisted items, PLUS items whose title keywords overlap with those
// wishlisted items (cross-category similarity).
// Accepts optional ?exclude=id1,id2,... from the frontend dedup set.
// Auth-gated. Falls back to latest items for logged-out users.
router.get('/similar', requireAuth, async (req, res) => {
  try {
    // IDs already shown on the page — sent by the frontend dedup set
    const excludeParam = req.query.exclude || '';
    const excludeIds = excludeParam
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    // 1. User's wishlist: titles + categories
    const wishlistData = await db.query(
      `SELECT i.title, i.category
       FROM wishlists w
       JOIN items i ON i.id = w.item_id
       WHERE w.user_id = $1`,
      [req.userId]
    );

    if (wishlistData.rows.length === 0) {
      // No wishlist signal — fall back to latest non-excluded items
      const fallbackValues = ['available', req.userId];
      let fallbackQuery = `
        SELECT i.*, u.username AS owner_name, u.id AS owner_id
        FROM items i
        JOIN users u ON u.id = i.owner_id
        WHERE i.status = $1
          AND i.owner_id != $2
      `;
      if (excludeIds.length > 0) {
        fallbackQuery += ` AND i.id != ALL($3::uuid[])`;
        fallbackValues.push(excludeIds);
      }
      fallbackQuery += ` ORDER BY i.created_at DESC LIMIT 8`;
      const fallback = await db.query(fallbackQuery, fallbackValues);
      return res.json({ items: fallback.rows });
    }

    const categories = [...new Set(wishlistData.rows.map(r => r.category).filter(Boolean))];
    const titleTokens = [...new Set(
      wishlistData.rows
        .map(r => r.title)
        .join(' ')
        .split(/[\s,]+/)
        .map(t => t.toLowerCase().trim())
        .filter(t => t.length >= 4)
    )];

    // 2. Build query: category match OR title keyword match in i.title/description
    //    Exclude: items already wishlisted by user, user's own items, and page-dedup ids
    const values = ['available', req.userId];

    // category placeholders
    const catPlaceholders = categories.map((_, i) => `$${values.length + i + 1}`);
    values.push(...categories);

    // title token ILIKE placeholders (search in other items' titles)
    const tokenConditions = titleTokens.slice(0, 10).map((_, i) => {
      const idx = values.length + i + 1;
      return `(LOWER(i.title) LIKE $${idx} OR LOWER(i.description) LIKE $${idx})`;
    });
    values.push(...titleTokens.slice(0, 10).map(t => `%${t}%`));

    // exclude dedup ids
    let excludeClause = '';
    if (excludeIds.length > 0) {
      excludeClause = `AND i.id != ALL($${values.length + 1}::uuid[])`;
      values.push(excludeIds);
    }

    const categoryClause = catPlaceholders.length > 0
      ? `i.category IN (${catPlaceholders.join(', ')})`
      : 'FALSE';
    const tokenClause = tokenConditions.length > 0
      ? tokenConditions.join(' OR ')
      : 'FALSE';

    const result = await db.query(
      `SELECT DISTINCT i.*, u.username AS owner_name, u.id AS owner_id
       FROM items i
       JOIN users u ON u.id = i.owner_id
       WHERE i.status = $1
         AND i.owner_id != $2
         AND i.id NOT IN (SELECT item_id FROM wishlists WHERE user_id = $2)
         ${excludeClause}
         AND (${categoryClause} OR ${tokenClause})
       ORDER BY i.created_at DESC
       LIMIT 8`,
      values
    );

    res.json({ items: result.rows });
  } catch (err) {
    console.error('GET /items/similar error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', requireAuth, requireVerified, async (req, res) => {
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
    const desiredItem = req.body.desired_item ?? req.body.desiredItem ?? null;
    const normalizedCondition = normalizeCondition(item_condition || condition);
    const normalizedCategory = normalizeCategory(category);
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
           desired_item = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        title,
        description || null,
        normalizedCategory || null,
        normalizedCondition,
        normalizedImageUrls,
        desiredItem || null,
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