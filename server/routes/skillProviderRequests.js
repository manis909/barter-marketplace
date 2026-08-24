const express = require('express');
const router = express.Router();
const db = require('../models/db');
const requireAuth = require('../middleware/auth');

/**
 * Skill Provider Booking Requests
 *
 * Schema:
 * - id (UUID PK)
 * - learner_id (FK to users)
 * - provider_id (FK to users)
 * - skill_application_id (FK to skill_provider_applications)
 * - preferred_date (DATE)
 * - preferred_time (TIME)
 * - teaching_mode (online|in-person|online & in-person)
 * - message (TEXT, optional)
 * - status (pending|accepted|rejected)
 * - decided_at (TIMESTAMPTZ, when provider accepts/rejects)
 * - created_at (TIMESTAMPTZ)
 * - updated_at (TIMESTAMPTZ)
 */

async function ensureRequestsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS skill_provider_booking_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      learner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      skill_application_id UUID NOT NULL REFERENCES skill_provider_applications(id) ON DELETE CASCADE,
      preferred_date DATE NOT NULL,
      preferred_time TIME,
      teaching_mode VARCHAR(50),
      message TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected')),
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_skill_provider_booking_requests_learner
    ON skill_provider_booking_requests (learner_id, created_at DESC)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_skill_provider_booking_requests_provider
    ON skill_provider_booking_requests (provider_id, skill_application_id, status)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_skill_provider_booking_requests_application
    ON skill_provider_booking_requests (skill_application_id, status)
  `);
}

// Initialize table on module load
ensureRequestsTable().catch(err => console.error('Error ensuring requests table:', err));

// ── POST /api/skill-provider-requests ─────────────────────────────────────
// Learner creates a booking request for an approved skill
router.post('/', requireAuth, async (req, res) => {
  try {
    const { skill_application_id, preferred_date, preferred_time, teaching_mode, message } = req.body;
    const learner_id = req.userId;

    // Validate inputs
    if (!skill_application_id || !preferred_date) {
      return res.status(400).json({ error: 'skill_application_id and preferred_date are required' });
    }

    // Fetch the application to get provider_id and verify it's approved
    const appResult = await db.query(
      `SELECT id, user_id, status FROM skill_provider_applications WHERE id = $1`,
      [skill_application_id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Skill application not found' });
    }

    const app = appResult.rows[0];
    if (app.status !== 'approved') {
      return res.status(403).json({ error: 'Skill application is not approved' });
    }

    const provider_id = app.user_id;

    // Prevent self-booking
    if (learner_id === provider_id) {
      return res.status(403).json({ error: 'You cannot book your own skill' });
    }

    // Check for existing pending request (same learner, same skill, same date/time)
    const existingResult = await db.query(
      `SELECT id FROM skill_provider_booking_requests
       WHERE learner_id = $1 AND skill_application_id = $2 AND preferred_date = $3
       AND preferred_time IS NOT DISTINCT FROM $4 AND status = 'pending'`,
      [learner_id, skill_application_id, preferred_date, preferred_time || null]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'A pending request for this skill at this time already exists' });
    }

    // Create the request
    const result = await db.query(
      `INSERT INTO skill_provider_booking_requests
       (learner_id, provider_id, skill_application_id, preferred_date, preferred_time, teaching_mode, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [learner_id, provider_id, skill_application_id, preferred_date, preferred_time || null, teaching_mode || null, message || '']
    );

    res.status(201).json({ success: true, request: result.rows[0] });
  } catch (err) {
    console.error('POST /skill-provider-requests error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/skill-provider-requests/mine ──────────────────────────────────
// Learner views their own booking requests
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, spa.skill_name, spa.user_id AS provider_id, u.username AS provider_name
       FROM skill_provider_booking_requests r
       JOIN skill_provider_applications spa ON r.skill_application_id = spa.id
       JOIN users u ON spa.user_id = u.id
       WHERE r.learner_id = $1
       ORDER BY r.created_at DESC`,
      [req.userId]
    );

    res.json({ success: true, requests: result.rows });
  } catch (err) {
    console.error('GET /skill-provider-requests/mine error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/skill-provider-requests/teaching ──────────────────────────────
// Provider views booking requests for their approved skills
router.get('/teaching', requireAuth, async (req, res) => {
  try {
    const provider_id = req.userId;

    const result = await db.query(
      `SELECT r.*, spa.skill_name, u.username AS learner_name, u.full_name AS learner_full_name
       FROM skill_provider_booking_requests r
       JOIN skill_provider_applications spa ON r.skill_application_id = spa.id
       JOIN users u ON r.learner_id = u.id
       WHERE spa.user_id = $1
       ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.created_at DESC`,
      [provider_id]
    );

    res.json({ success: true, requests: result.rows });
  } catch (err) {
    console.error('GET /skill-provider-requests/teaching error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/skill-provider-requests/:applicationId ───────────────────────
// Provider views requests for a specific skill application
router.get('/:applicationId', requireAuth, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const provider_id = req.userId;

    // Verify the application belongs to the provider
    const appCheck = await db.query(
      'SELECT user_id FROM skill_provider_applications WHERE id = $1',
      [applicationId]
    );

    if (appCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (appCheck.rows[0].user_id !== provider_id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await db.query(
      `SELECT r.*, u.username AS learner_name, u.full_name AS learner_full_name
       FROM skill_provider_booking_requests r
       JOIN users u ON r.learner_id = u.id
       WHERE r.skill_application_id = $1
       ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.created_at DESC`,
      [applicationId]
    );

    res.json({ success: true, requests: result.rows });
  } catch (err) {
    console.error('GET /skill-provider-requests/:applicationId error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/skill-provider-requests/:requestId/accept ────────────────────
// Provider accepts a booking request
router.put('/:requestId/accept', requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const provider_id = req.userId;

    // Verify request belongs to provider
    const requestCheck = await db.query(
      `SELECT r.provider_id, r.status, r.skill_application_id
       FROM skill_provider_booking_requests r
       WHERE r.id = $1`,
      [requestId]
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const req_row = requestCheck.rows[0];
    if (req_row.provider_id !== provider_id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (req_row.status !== 'pending') {
      return res.status(409).json({ error: `Request is already ${req_row.status}` });
    }

    // Update status to accepted
    const result = await db.query(
      `UPDATE skill_provider_booking_requests
       SET status = 'accepted', decided_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [requestId]
    );

    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    console.error('PUT /skill-provider-requests/:requestId/accept error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/skill-provider-requests/:requestId/reject ────────────────────
// Provider rejects a booking request
router.put('/:requestId/reject', requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const provider_id = req.userId;

    // Verify request belongs to provider
    const requestCheck = await db.query(
      `SELECT r.provider_id, r.status
       FROM skill_provider_booking_requests r
       WHERE r.id = $1`,
      [requestId]
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const req_row = requestCheck.rows[0];
    if (req_row.provider_id !== provider_id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (req_row.status !== 'pending') {
      return res.status(409).json({ error: `Request is already ${req_row.status}` });
    }

    // Update status to rejected
    const result = await db.query(
      `UPDATE skill_provider_booking_requests
       SET status = 'rejected', decided_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [requestId]
    );

    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    console.error('PUT /skill-provider-requests/:requestId/reject error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
