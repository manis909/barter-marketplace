const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const db = require('../models/db');
const requireAuth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');

// Exact Skilter categories as specified
const SKILL_CATEGORIES = [
  'Music',
  'Dance',
  'Art & Design',
  'Study Help / Tutoring',
  'Coding & Tech',
  'Languages',
  'Fitness & Sports',
  'Photography & Videography',
];

// Normalize category input
function normalizeCategory(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  // Match case-insensitively but return the exact category name
  const lower = trimmed.toLowerCase();
  const found = SKILL_CATEGORIES.find(cat => cat.toLowerCase() === lower);
  return found || trimmed;
}

// Normalize price type
// Normalize price type
function normalizePriceType(value) {
  if (!value) return 'free';
  const normalized = String(value).trim().toLowerCase();
  // Map frontend values to DB constraint values (free, coins, negotiable)
  if (normalized === 'paid') return 'coins';
  if (normalized === 'negotiable') return 'negotiable';
  return 'free';
}

// Normalize session type
function normalizeSessionType(value) {
  if (!value) return 'one_on_one';
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'group') return 'group';
  if (normalized === 'one-on-one' || normalized === 'one_on_one') return 'one_on_one';
  return 'one_on_one';
}

// ── POST /api/skills ──────────────────────────────────────────────
// Create a new skill listing
router.post('/', requireAuth, requireVerified, async (req, res) => {
  try {
    console.log('🔍 BACKEND DEBUG - req.body:', req.body);

    const {
      skill_name,
      description,
      category,
      image_urls,
      price_type,
      price,
      price_unit,
      session_type,
      max_participants
    } = req.body;

    console.log('🔍 BACKEND DEBUG - Destructured values:', {
      session_type,
      max_participants,
      'typeof max_participants': typeof max_participants
    });

    // Validation
    if (!skill_name || !skill_name.trim()) {
      return res.status(400).json({ error: 'Skill name is required' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const normalizedCategory = normalizeCategory(category);
    if (!SKILL_CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({
        error: `Invalid category. Must be one of: ${SKILL_CATEGORIES.join(', ')}`
      });
    }

    const normalizedPriceType = normalizePriceType(price_type);
    const normalizedSessionType = normalizeSessionType(session_type);
    const normalizedImageUrls = Array.isArray(image_urls) ? image_urls.filter(Boolean) : [];

    // Validate paid skills have price
    if (normalizedPriceType === 'coins' || normalizedPriceType === 'negotiable') {
      if (!price || isNaN(price) || Number(price) <= 0) {
        return res.status(400).json({ error: 'Price is required for paid skills' });
      }
      if (!price_unit || !price_unit.trim()) {
        return res.status(400).json({ error: 'Price unit is required for paid skills' });
      }
    }

    // Validate group sessions have maximum participants
    if (normalizedSessionType === 'group') {
      if (!max_participants || isNaN(max_participants) || Number(max_participants) <= 0) {
        return res.status(400).json({
          error: 'Maximum participants is required for group sessions'
        });
      }
    }

    console.log('Normalized image_urls:', normalizedImageUrls);

    const finalMaxParticipants = normalizedSessionType === 'group' 
      ? Number(max_participants) 
      : 1; // one-on-one always has 1 participant
    
    console.log('🔍 BACKEND DEBUG - Before INSERT:', {
      normalizedSessionType,
      max_participants,
      'Number(max_participants)': Number(max_participants),
      finalMaxParticipants,
      'normalizedSessionType === group': normalizedSessionType === 'group'
    });

    const result = await db.query(
      `INSERT INTO skill_listings (
        teacher_id,
        skill_name,
        description,
        category,
        price_type,
        price,
        price_unit,
        session_type,
        max_participants,
        image_urls,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        req.userId,
        skill_name.trim(),
        description.trim(),
        normalizedCategory,
        normalizedPriceType,
        (normalizedPriceType === 'coins' || normalizedPriceType === 'negotiable') ? Number(price) : null,
        (normalizedPriceType === 'coins' || normalizedPriceType === 'negotiable') ? price_unit?.trim() : null,
        normalizedSessionType,
        finalMaxParticipants,
        normalizedImageUrls,
        'active' // default status - matches DB constraint (active, paused)
      ]
    );

    console.log('Database insert result:', result.rows[0]);
    res.status(201).json({ skill: result.rows[0] });
  } catch (err) {
    console.error('POST /skills error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// ── GET /api/skills/mine ──────────────────────────────────────────
// Get all skills owned by the authenticated user
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.username AS teacher_name, u.id AS teacher_id
       FROM skill_listings s
       JOIN users u ON u.id = s.teacher_id
       WHERE s.teacher_id = $1
       ORDER BY s.created_at DESC`,
      [req.userId]
    );

    res.json({ skills: result.rows });
  } catch (err) {
    console.error('GET /skills/mine error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/skills ───────────────────────────────────────────────
// Get all available skills (for Skilter Explore)
// Supports ?category=Dance and ?search=keyword
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const normalizedSearch = String(search || '').trim();

    let query = `
      SELECT s.*, u.username AS teacher_name, u.id AS teacher_id
      FROM skill_listings s
      JOIN users u ON u.id = s.teacher_id
      WHERE s.status = $1
    `;
    const values = ['active']; // Only show active skills (not paused)

    // Category filter
    if (category) {
      const normalizedCategory = normalizeCategory(category);
      query += ` AND s.category = $${values.length + 1}`;
      values.push(normalizedCategory);
    }

    // Search filter (searches skill_name, description, category)
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
            LOWER(s.skill_name) LIKE LOWER($${baseIndex}) OR
            LOWER(s.description) LIKE LOWER($${baseIndex + 1}) OR
            LOWER(s.category) LIKE LOWER($${baseIndex + 2})
          )`);
          values.push(pattern, pattern, pattern);
        }

        query += ` AND (${searchClauses.join(' OR ')})`;
      }
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await db.query(query, values);
    res.json({ skills: result.rows });
  } catch (err) {
    console.error('GET /skills error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/skills/:id ───────────────────────────────────────────
// Get a single skill by ID (public endpoint)
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.username AS teacher_name, u.id AS teacher_id
       FROM skill_listings s
       JOIN users u ON u.id = s.teacher_id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json({ skill: result.rows[0] });
  } catch (err) {
    console.error('GET /skills/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/skills/:id ───────────────────────────────────────────
// Update a skill (owner only)
router.put('/:id', requireAuth, requireVerified, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await db.query(
      'SELECT teacher_id FROM skill_listings WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    if (existing.rows[0].teacher_id !== req.userId) {
      return res.status(403).json({
        error: 'You do not have permission to edit this skill'
      });
    }

    const {
      skill_name,
      description,
      category,
      image_urls,
      price_type,
      price,
      price_unit,
      session_type,
      max_participants
    } = req.body;

    // Validation
    if (!skill_name || !skill_name.trim()) {
      return res.status(400).json({ error: 'Skill name is required' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const normalizedCategory = normalizeCategory(category);
    if (!SKILL_CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({
        error: `Invalid category. Must be one of: ${SKILL_CATEGORIES.join(', ')}`
      });
    }

    const normalizedPriceType = normalizePriceType(price_type);
    const normalizedSessionType = normalizeSessionType(session_type);
    const normalizedImageUrls = Array.isArray(image_urls) ? image_urls.filter(Boolean) : [];

    // Validate paid skills
    if (normalizedPriceType === 'coins' || normalizedPriceType === 'negotiable') {
      if (!price || isNaN(price) || Number(price) <= 0) {
        return res.status(400).json({ error: 'Price is required for paid skills' });
      }
      if (!price_unit || !price_unit.trim()) {
        return res.status(400).json({ error: 'Price unit is required for paid skills' });
      }
    }

    // Validate group sessions
    if (normalizedSessionType === 'group') {
      if (!max_participants || isNaN(max_participants) || Number(max_participants) <= 0) {
        return res.status(400).json({
          error: 'Maximum participants is required for group sessions'
        });
      }
    }

    const result = await db.query(
      `UPDATE skill_listings
       SET skill_name = $1,
           description = $2,
           category = $3,
           price_type = $4,
           price = $5,
           price_unit = $6,
           session_type = $7,
           max_participants = $8,
           image_urls = $9
       WHERE id = $10
       RETURNING *`,
      [
        skill_name.trim(),
        description.trim(),
        normalizedCategory,
        normalizedPriceType,
        (normalizedPriceType === 'coins' || normalizedPriceType === 'negotiable') ? Number(price) : null,
        (normalizedPriceType === 'coins' || normalizedPriceType === 'negotiable') ? price_unit?.trim() : null,
        normalizedSessionType,
        normalizedSessionType === 'group' ? Number(max_participants) : 1,
        normalizedImageUrls,
        id
      ]
    );

    res.json({ skill: result.rows[0] });
  } catch (err) {
    console.error('PUT /skills/:id error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// ── DELETE /api/skills/:id ────────────────────────────────────────
// Delete a skill (owner only)
router.delete('/:id', requireAuth, requireVerified, async (req, res) => {
  const { id } = req.params;

  try {
    // Verify ownership
    const existing = await db.query(
      'SELECT teacher_id FROM skill_listings WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    if (existing.rows[0].teacher_id !== req.userId) {
      return res.status(403).json({
        error: 'You do not have permission to delete this skill'
      });
    }

    // Delete the skill
    await db.query('DELETE FROM skill_listings WHERE id = $1', [id]);

    res.json({ message: 'Skill deleted successfully' });
  } catch (err) {
    console.error('DELETE /skills/:id error:', err);
    res.status(500).json({
      error: err.message || 'Server error'
    });
  }
});

module.exports = router;
