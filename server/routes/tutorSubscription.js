// server/routes/tutorSubscription.js
//
// Unlimited plan purchase flow — reuses the same UPI screenshot pattern
// as skill_bookings. No new payment system.
//
// Routes:
//   POST   /api/tutor-subscription           — create pending subscription
//   POST   /api/tutor-subscription/:id/upload-payment
//   PATCH  /api/tutor-subscription/:id/confirm-payment   (admin)
//   PATCH  /api/tutor-subscription/:id/reject-payment    (admin)
//   GET    /api/tutor-subscription/mine                  — current status

'use strict';
const express      = require('express');
const router       = express.Router();
const path         = require('path');
const fs           = require('fs');
const multer       = require('multer');
const db           = require('../models/db');
const requireAuth  = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const { createNotification } = require('./notifications');
const { SKILTER_UNLIMITED_PLAN_PRICE_INR } = require('../config/pricing');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = v => UUID_RE.test(v);

// Multer for payment screenshots
const screenshotStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/subscription-screenshots');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `sub-${req.params.id}-${Date.now()}${ext}`);
  },
});
const screenshotUpload = multer({
  storage: screenshotStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('Only JPG and PNG files are allowed'));
    }
    cb(null, true);
  },
});

// ── GET /api/tutor-subscription/mine ────────────────────────────────────────
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, plan, status, started_at, expires_at,
              payment_status, payment_submitted_at,
              payment_rejection_reason, amount_paid,
              created_at, updated_at
       FROM tutor_subscriptions
       WHERE tutor_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.userId]
    );
    const sub = result.rows[0] || null;

    // Compute whether the plan is currently active (with 3-day grace)
    let isActive = false;
    if (sub && sub.status === 'active' && sub.expires_at) {
      const grace = new Date(sub.expires_at);
      grace.setDate(grace.getDate() + 3);
      isActive = grace > new Date();
    }

    return res.json({
      success: true,
      subscription: sub,
      is_active: isActive,
      plan_price: SKILTER_UNLIMITED_PLAN_PRICE_INR,
    });
  } catch (err) {
    console.error('GET /tutor-subscription/mine error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/tutor-subscription ────────────────────────────────────────────
// Create a pending subscription. One active/pending sub per tutor allowed.
router.post('/', requireAuth, async (req, res) => {
  try {
    // Check no active or pending sub exists
    const existing = await db.query(
      `SELECT id, status FROM tutor_subscriptions
       WHERE tutor_id = $1 AND status IN ('active', 'pending_payment')
       LIMIT 1`,
      [req.userId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: `You already have a ${existing.rows[0].status} subscription.`,
        existing_id: existing.rows[0].id,
      });
    }

    const result = await db.query(
      `INSERT INTO tutor_subscriptions (tutor_id, plan, status, amount_paid)
       VALUES ($1, 'unlimited', 'pending_payment', $2)
       RETURNING id, plan, status, amount_paid, payment_status, created_at`,
      [req.userId, SKILTER_UNLIMITED_PLAN_PRICE_INR]
    );

    return res.status(201).json({ success: true, subscription: result.rows[0] });
  } catch (err) {
    console.error('POST /tutor-subscription error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/tutor-subscription/:id/upload-payment ─────────────────────────
router.post(
  '/:id/upload-payment',
  requireAuth,
  screenshotUpload.single('screenshot'),
  async (req, res) => {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid id' });

    if (!req.file) return res.status(400).json({ error: 'Screenshot required' });

    const { utr } = req.body;
    if (!utr || String(utr).trim().length < 6) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'UTR must be at least 6 characters' });
    }
    const cleanUtr = String(utr).trim().toUpperCase();

    try {
      const subRes = await db.query(
        `SELECT * FROM tutor_subscriptions WHERE id = $1 AND tutor_id = $2`,
        [id, req.userId]
      );
      if (subRes.rows.length === 0) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ error: 'Subscription not found' });
      }
      const sub = subRes.rows[0];

      if (sub.payment_status === 'paid') {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'Payment already confirmed' });
      }
      if (sub.payment_status === 'pending_verification') {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'Payment already submitted — awaiting admin review' });
      }

      // UTR uniqueness
      const dup = await db.query(
        `SELECT id FROM tutor_subscriptions WHERE payment_utr = $1 AND id != $2`,
        [cleanUtr, id]
      );
      if (dup.rows.length > 0) {
        fs.unlink(req.file.path, () => {});
        return res.status(409).json({ error: 'This UTR has already been used' });
      }

      const relPath = path.relative(
        path.join(__dirname, '..'), req.file.path
      ).replace(/\\/g, '/');

      await db.query(
        `UPDATE tutor_subscriptions
         SET payment_status         = 'pending_verification',
             payment_screenshot_url = $1,
             payment_utr            = $2,
             payment_submitted_at   = NOW(),
             payment_rejection_reason = NULL,
             payment_rejected_at    = NULL,
             updated_at             = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [relPath, cleanUtr, id]
      );

      return res.json({ success: true, message: 'Payment submitted — awaiting admin verification.' });
    } catch (err) {
      if (req.file) fs.unlink(req.file.path, () => {});
      console.error('POST /tutor-subscription/:id/upload-payment error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── PATCH /api/tutor-subscription/:id/confirm-payment (admin) ───────────────
router.patch('/:id/confirm-payment', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    const subRes = await db.query(
      `SELECT * FROM tutor_subscriptions WHERE id = $1`,
      [id]
    );
    if (subRes.rows.length === 0) return res.status(404).json({ error: 'Subscription not found' });
    const sub = subRes.rows[0];

    if (sub.payment_status !== 'pending_verification') {
      return res.status(400).json({
        error: `Cannot confirm — payment_status is '${sub.payment_status}', expected 'pending_verification'.`,
      });
    }

    // started_at = now, expires_at = now + 30 days
    const updateRes = await db.query(
      `UPDATE tutor_subscriptions
       SET status          = 'active',
           payment_status  = 'paid',
           started_at      = NOW(),
           expires_at      = NOW() + INTERVAL '30 days',
           confirmed_by    = $1,
           confirmed_at    = NOW(),
           updated_at      = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [req.userId, id]
    );

    createNotification(
      sub.tutor_id,
      'subscription_activated',
      'Unlimited Plan Activated!',
      `Your Skilter unlimited plan is now active. Enjoy the 5% platform fee and unlimited listings for 30 days.`
    ).catch(err => console.error('Notification error (subscription_activated):', err));

    return res.json({ success: true, subscription: updateRes.rows[0] });
  } catch (err) {
    console.error('PATCH /tutor-subscription/:id/confirm-payment error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/tutor-subscription/:id/reject-payment (admin) ────────────────
router.patch('/:id/reject-payment', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid id' });

  const reason = (req.body?.reason || '').trim() || null;

  try {
    const subRes = await db.query(
      `SELECT * FROM tutor_subscriptions WHERE id = $1`,
      [id]
    );
    if (subRes.rows.length === 0) return res.status(404).json({ error: 'Subscription not found' });
    const sub = subRes.rows[0];

    if (sub.payment_status !== 'pending_verification') {
      return res.status(400).json({
        error: `Cannot reject — payment_status is '${sub.payment_status}', expected 'pending_verification'.`,
      });
    }

    await db.query(
      `UPDATE tutor_subscriptions
       SET payment_status          = 'unpaid',
           payment_rejection_reason = $1,
           payment_rejected_at     = NOW(),
           updated_at              = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [reason, id]
    );

    createNotification(
      sub.tutor_id,
      'subscription_payment_rejected',
      'Plan Payment Not Verified',
      `Your Unlimited plan payment could not be verified${reason ? ` (${reason})` : ''}. Please re-submit your screenshot.`
    ).catch(err => console.error('Notification error (subscription_payment_rejected):', err));

    return res.json({ success: true, message: 'Payment rejected.' });
  } catch (err) {
    console.error('PATCH /tutor-subscription/:id/reject-payment error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
