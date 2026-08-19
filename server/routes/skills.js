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

const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced', 'all levels'];
const SESSION_DURATIONS = ['30 minutes', '45 minutes', '1 hour', '1.5 hours', '2 hours', 'flexible'];
const TEACHING_MODES = ['online', 'in-person', 'online & in-person'];
const TEACHING_LANGUAGES = ['english', 'telugu', 'hindi', 'tamil', 'kannada', 'malayalam', 'other'];
const AVAILABILITY_OPTIONS = ['weekdays', 'weekends', 'morning', 'afternoon', 'evening', 'flexible'];

function normalizePriceType(value) {
  if (!value) return 'free';
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'paid' || normalized === 'coins') return 'coins';
  if (normalized === 'negotiable') return 'negotiable';
  return 'free';
}

function normalizeSessionType(value) {
  if (!value) return 'one_on_one';
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'group') return 'group';
  if (normalized === 'one-on-one' || normalized === 'one_on_one') return 'one_on_one';
  return 'one_on_one';
}

function normalizeExperienceLevel(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  const match = EXPERIENCE_LEVELS.find(level => level === normalized.toLowerCase());
  return match ? match.charAt(0).toUpperCase() + match.slice(1) : normalized;
}

function normalizeSessionDuration(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  const match = SESSION_DURATIONS.find(duration => duration === normalized.toLowerCase());
  return match ? match.charAt(0).toUpperCase() + match.slice(1) : normalized;
}

function normalizeTeachingMode(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  const lower = normalized.toLowerCase();

  if (lower === 'online') return 'Online';
  if (lower === 'in-person') return 'In-Person';
  if (lower === 'online & in-person') return 'Online & In-Person';

  return normalized;
}

function normalizeTeachingLanguage(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  const match = TEACHING_LANGUAGES.find(language => language === normalized.toLowerCase());
  return match ? match.charAt(0).toUpperCase() + match.slice(1) : normalized;
}

function normalizeAvailability(value) {
  if (!value) return null;

  const values = Array.isArray(value)
    ? value
    : String(value).split(',');

  const normalizedValues = values
    .map(item => String(item).trim())
    .filter(Boolean)
    .map(item => {
      const match = AVAILABILITY_OPTIONS.find(option => option === item.toLowerCase());
      return match ? match.charAt(0).toUpperCase() + match.slice(1) : item;
    })
    .filter((item, index, arr) => arr.indexOf(item) === index);

  return normalizedValues.length > 0 ? normalizedValues.join(', ') : null;
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
      experience_level,
      session_duration,
      teaching_mode,
      teaching_language,
      availability,
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
    const normalizedExperienceLevel = normalizeExperienceLevel(experience_level);
    const normalizedSessionDuration = normalizeSessionDuration(session_duration);
    const normalizedTeachingMode = normalizeTeachingMode(teaching_mode);
    const normalizedTeachingLanguage = normalizeTeachingLanguage(teaching_language);
    const normalizedAvailability = normalizeAvailability(availability);
    const normalizedImageUrls = Array.isArray(image_urls) ? image_urls.filter(Boolean) : [];

    if (normalizedPriceType === 'coins') {
      if (!price || isNaN(price) || Number(price) <= 0) {
        return res.status(400).json({ error: 'Price is required for paid skills' });
      }
      if (!price_unit || !price_unit.trim()) {
        return res.status(400).json({ error: 'Pricing basis is required for paid skills' });
      }
    }

    if (normalizedPriceType === 'negotiable' && price !== undefined && price !== null && price !== '') {
      if (isNaN(price) || Number(price) <= 0) {
        return res.status(400).json({ error: 'Negotiable price must be a positive number when provided' });
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
        experience_level,
        session_duration,
        teaching_mode,
        teaching_language,
        availability,
        max_participants,
        image_urls,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        req.userId,
        skill_name.trim(),
        description.trim(),
        normalizedCategory,
        normalizedPriceType,
        normalizedPriceType === 'coins' ? Number(price) : (normalizedPriceType === 'negotiable' && price !== undefined && price !== null && price !== '' ? Number(price) : null),
        normalizedPriceType === 'coins' ? price_unit?.trim() : null,
        normalizedSessionType,
        normalizedExperienceLevel,
        normalizedSessionDuration,
        normalizedTeachingMode,
        normalizedTeachingLanguage,
        normalizedAvailability,
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
// Includes both:
//   1. Active skills from skill_listings table
//   2. Approved skill provider applications (new)
// Supports ?category=Dance and ?search=keyword
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const normalizedSearch = String(search || '').trim();

    // ── PART 1: Active skills from skill_listings ──────────────────────────
    let query1 = `
      SELECT
        s.id,
        s.teacher_id,
        s.skill_name,
        s.description,
        s.category,
        s.image_urls,
        s.price_type,
        s.price,
        s.price_unit,
        s.session_type,
        s.experience_level,
        s.session_duration,
        s.teaching_mode,
        s.teaching_language,
        s.availability,
        s.max_participants,
        s.status,
        s.created_at,
        s.created_at AS updated_at,
        u.username AS teacher_name,
        'listing' AS source
      FROM skill_listings s
      JOIN users u ON u.id = s.teacher_id
      WHERE s.status = $1
    `;
    const values = ['active']; // Only show active skills (not paused)

    // Category filter for skill_listings
    if (category) {
      const normalizedCategory = normalizeCategory(category);
      query1 += ` AND s.category = $${values.length + 1}`;
      values.push(normalizedCategory);
    }

    // Search filter for skill_listings (searches skill_name, description, category)
    const searchClauses1 = [];
    if (normalizedSearch) {
      const searchTerms = normalizedSearch
        .split(/\s+/)
        .filter(Boolean)
        .map((term) => term.replace(/[%_]/g, '\\$&'));

      if (searchTerms.length > 0) {
        for (const term of searchTerms) {
          const baseIndex = values.length + 1;
          const pattern = `%${term}%`;
          searchClauses1.push(`(
            LOWER(s.skill_name) LIKE LOWER($${baseIndex}) OR
            LOWER(s.description) LIKE LOWER($${baseIndex + 1}) OR
            LOWER(s.category) LIKE LOWER($${baseIndex + 2})
          )`);
          values.push(pattern, pattern, pattern);
        }

        query1 += ` AND (${searchClauses1.join(' OR ')})`;
      }
    }

    // ── PART 2: Approved applications (new) ──────────────────────────────
    // Transform approved applications into skill_listings-like format
    let query2 = `
      SELECT
        spa.id,
        spa.user_id AS teacher_id,
        spa.skill_name,
        spa.skill_description AS description,
        spa.category,
        CAST(NULL AS text[]) AS image_urls,
        CAST(NULL AS text) AS price_type,
        CAST(NULL AS numeric) AS price,
        CAST(NULL AS text) AS price_unit,
        CAST(NULL AS text) AS session_type,
        spa.experience_level,
        spa.session_duration,
        spa.teaching_mode,
        spa.teaching_language,
        spa.availability,
        CAST(NULL AS integer) AS max_participants,
        spa.status,
        spa.created_at,
        spa.updated_at,
        u.username AS teacher_name,
        'application' AS source
      FROM skill_provider_applications spa
      JOIN users u ON u.id = spa.user_id
      WHERE spa.status = 'approved'
    `;

    // Category filter for applications
    if (category) {
      const normalizedCategory = normalizeCategory(category);
      query2 += ` AND spa.category = $${values.length + 1}`;
      values.push(normalizedCategory);
    }

    // Search filter for applications (searches skill_name, skill_description, category)
    const searchClauses2 = [];
    if (normalizedSearch) {
      const searchTerms = normalizedSearch
        .split(/\s+/)
        .filter(Boolean)
        .map((term) => term.replace(/[%_]/g, '\\$&'));

      if (searchTerms.length > 0) {
        for (const term of searchTerms) {
          const baseIndex = values.length + 1;
          const pattern = `%${term}%`;
          searchClauses2.push(`(
            LOWER(spa.skill_name) LIKE LOWER($${baseIndex}) OR
            LOWER(spa.skill_description) LIKE LOWER($${baseIndex + 1}) OR
            LOWER(spa.category) LIKE LOWER($${baseIndex + 2})
          )`);
          values.push(pattern, pattern, pattern);
        }

        query2 += ` AND (${searchClauses2.join(' OR ')})`;
      }
    }

    // ── Combine both queries and sort ─────────────────────────────────────
    const query = `(${query1}) UNION ALL (${query2}) ORDER BY updated_at DESC`;

    console.log('📊 UNION Query:', query);
    console.log('📊 Values:', values);

    const result = await db.query(query, values);
    res.json({ skills: result.rows });
  } catch (err) {
    console.error('GET /skills error:', err?.message || err);
    console.error('Error code:', err?.code);
    console.error('Error detail:', err?.detail);
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
      experience_level,
      session_duration,
      teaching_mode,
      teaching_language,
      availability,
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
    const normalizedExperienceLevel = normalizeExperienceLevel(experience_level);
    const normalizedSessionDuration = normalizeSessionDuration(session_duration);
    const normalizedTeachingMode = normalizeTeachingMode(teaching_mode);
    const normalizedTeachingLanguage = normalizeTeachingLanguage(teaching_language);
    const normalizedAvailability = normalizeAvailability(availability);
    const normalizedImageUrls = Array.isArray(image_urls) ? image_urls.filter(Boolean) : [];

    if (normalizedPriceType === 'coins') {
      if (!price || isNaN(price) || Number(price) <= 0) {
        return res.status(400).json({ error: 'Price is required for paid skills' });
      }
      if (!price_unit || !price_unit.trim()) {
        return res.status(400).json({ error: 'Pricing basis is required for paid skills' });
      }
    }

    if (normalizedPriceType === 'negotiable' && price !== undefined && price !== null && price !== '') {
      if (isNaN(price) || Number(price) <= 0) {
        return res.status(400).json({ error: 'Negotiable price must be a positive number when provided' });
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
           experience_level = $8,
           session_duration = $9,
           teaching_mode = $10,
           teaching_language = $11,
           availability = $12,
           max_participants = $13,
           image_urls = $14
       WHERE id = $15
       RETURNING *`,
      [
        skill_name.trim(),
        description.trim(),
        normalizedCategory,
        normalizedPriceType,
        normalizedPriceType === 'coins' ? Number(price) : (normalizedPriceType === 'negotiable' && price !== undefined && price !== null && price !== '' ? Number(price) : null),
        normalizedPriceType === 'coins' ? price_unit?.trim() : null,
        normalizedSessionType,
        normalizedExperienceLevel,
        normalizedSessionDuration,
        normalizedTeachingMode,
        normalizedTeachingLanguage,
        normalizedAvailability,
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
