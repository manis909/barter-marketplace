const express = require('express');
const router = express.Router();

const db = require('../models/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const requireAuth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');
const requireAdmin = require('../middleware/admin');
const { createNotification } = require('./notifications');

// ── Constants ────────────────────────────────────────────────────────
const DEPOSIT_RATE = 0.15; // fixed platform policy: 15% of rental fee
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(val) { return UUID_RE.test(val); }

// ── Multer config for payment screenshots (matching Skills exactly) ──────────
// Files land in uploads/rental-payment-screenshots/ on disk.
// The folder is NOT in the Express static mount — served only through the
// auth-gated GET endpoints if needed.
const rentalPaymentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/rental-payment-screenshots");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `rental-${req.params.id}-${Date.now()}${ext}`);
  },
});

const rentalPaymentUpload = multer({
  storage: rentalPaymentStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error("Only JPG and PNG files are allowed"));
    }
    cb(null, true);
  },
});

// Server-side pricing — NEVER trust client-sent amounts.
function computePricing(dailyRate, days) {
  const rate = Number(dailyRate);
  const fee = Math.round(rate * days * 100) / 100;
  const deposit = Math.round(DEPOSIT_RATE * fee);
  return { fee, deposit };
}

// Computed overdue flag: past due date and not yet fully returned.
function isOverdue(row) {
  if (!row.end_date) return false;
  if (!['accepted'].includes(row.status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(row.end_date);
  due.setHours(0, 0, 0, 0);
  return today > due;
}

// Transform database row to client-expected format
function transformRental(row) {
  if (!row) return null;
  
  // Map database fields to client-expected fields
  return {
    id: row.id,
    owner_id: row.owner_id,
    // Client expects item_name, database has title
    item_name: row.title || row.item_name,
    // Client expects rate_amount/rate_type, database has daily_rate (always daily)
    rate_amount: Number(row.daily_rate),
    rate_type: 'daily', // rentals table only supports daily rate
    // Client expects image_urls array, database has single image_url
    image_urls: row.image_url ? [row.image_url] : [],
    description: row.description,
    category: row.category || 'Other',
    status: row.status,
    created_at: row.created_at,
    // Include owner_name if available from join
    owner_name: row.owner_name || row.owner_username,
    // Include original fields for backward compatibility
    title: row.title,
    daily_rate: Number(row.daily_rate),
    image_url: row.image_url
  };
}

function decorateRequest(row) {
  return {
    ...row,
    is_overdue: isOverdue(row),
    days_remaining: row.end_date
      ? Math.ceil((new Date(row.end_date) - new Date()) / 86400000)
      : null,
  };
}

// ── LISTINGS ─────────────────────────────────────────────────────────

// POST /api/rentals — create a rental listing
router.post('/', requireAuth, requireVerified, async (req, res) => {
  try {
    console.log('POST /rentals request body:', req.body);

    // Client sends: item_name, description, category, image_urls, rate_type, rate_amount
    // Database expects: title, description, daily_rate, image_url, item_id (optional)
    const { item_name, description, category, image_urls, rate_type, rate_amount } = req.body;

    if (!item_name || !String(item_name).trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    // Validate rate_type - only 'daily' is supported in rentals table
    if (rate_type !== 'daily') {
      return res.status(400).json({ error: 'Only daily rental rate is supported' });
    }

    if (rate_amount === undefined || rate_amount === null || rate_amount === '' || isNaN(rate_amount) || Number(rate_amount) <= 0) {
      return res.status(400).json({ error: 'rate_amount is required and must be a positive number' });
    }

    // Convert image_urls array to single image_url (take first image)
    const image_url = Array.isArray(image_urls) && image_urls.length > 0 ? image_urls[0] : null;

    const result = await db.query(
      `INSERT INTO rentals (owner_id, title, description, daily_rate, image_url, category, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'available')
       RETURNING *`,
      [
        req.userId,
        String(item_name).trim(),
        description || null,
        Number(rate_amount),
        image_url,
        category ? String(category).trim() : null
      ]
    );

    console.log('Database insert result:', result.rows[0]);
    res.status(201).json({ rental: transformRental(result.rows[0]) });
  } catch (err) {
    console.error('POST /rentals error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// GET /api/rentals/mine — my rental listings
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, u.username AS owner_name
       FROM rentals r
       JOIN users u ON u.id = r.owner_id
       WHERE r.owner_id = $1
       ORDER BY r.created_at DESC`,
      [req.userId]
    );

    res.json({ rentals: result.rows.map(transformRental) });
  } catch (err) {
    console.error('GET /rentals/mine error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/rentals — all publicly available rentals
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const normalizedSearch = String(search || '').trim();
    let query = `
      SELECT r.*, u.username AS owner_name
      FROM rentals r
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
            LOWER(r.title) LIKE LOWER($${baseIndex}) OR
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
    res.json({ rentals: result.rows.map(transformRental) });
  } catch (err) {
    console.error('GET /rentals error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/rentals/by-item/:itemId — rental attached to an item
router.get('/by-item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!isValidUUID(itemId)) return res.status(400).json({ error: 'Invalid item id' });

    const result = await db.query(
      `SELECT r.*, u.username AS owner_name
       FROM rentals r JOIN users u ON u.id = r.owner_id
       WHERE r.item_id = $1 AND r.status = 'available' LIMIT 1`,
      [itemId]
    );
    res.json({ success: true, rental: transformRental(result.rows[0] || null) });
  } catch (err) {
    console.error('GET /rentals/by-item error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── MY RENTALS (both roles in one call) ──────────────────────────────

// GET /api/rentals/my-rentals — both renting and owned rentals
router.get('/my-rentals', requireAuth, async (req, res) => {
  try {
    const baseSelect = `
      SELECT rr.id, rr.rental_id, rr.requester_id, rr.start_date, rr.end_date,
             rr.status, rr.total_amount, rr.deposit_amount, rr.created_at,
             rr.renter_confirmed_return, rr.owner_confirmed_return,
             r.title, r.description, r.daily_rate, r.image_url, r.owner_id,
             CASE WHEN rr.requester_id = $1 THEN ou.username ELSE ru.username END AS other_party_username,
             CASE WHEN rr.requester_id = $1 THEN ou.full_name ELSE ru.full_name END AS other_party_name,
             CASE WHEN rr.requester_id = $1 THEN ou.profile_image ELSE ru.profile_image END AS other_party_profile_image
      FROM rental_requests rr
      JOIN rentals r ON r.id = rr.rental_id
      JOIN users ou ON ou.id = r.owner_id
      JOIN users ru ON ru.id = rr.requester_id
    `;
    const renting = await db.query(
      baseSelect + ` WHERE rr.requester_id = $1 AND rr.status IN ('accepted','rented','returned')
                     ORDER BY rr.created_at DESC`,
      [req.userId]
    );
    const owned = await db.query(
      baseSelect + ` WHERE r.owner_id = $1 AND rr.status IN ('accepted','rented','returned')
                     ORDER BY rr.created_at DESC`,
      [req.userId]
    );
    res.json({
      success: true,
      renting: renting.rows.map(decorateRequest),
      owned: owned.rows.map(decorateRequest),
    });
  } catch (err) {
    console.error('GET /rentals/my-rentals error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── REQUESTS ─────────────────────────────────────────────────────────

// POST /api/rentals/:id/requests — renter requests to rent
router.post('/:id/requests', requireAuth, requireVerified, async (req, res) => {
  try {
    const rentalId = req.params.id;
    if (!isValidUUID(rentalId)) return res.status(400).json({ error: 'Invalid rental id' });

    const { days_requested, start_date, meeting_location } = req.body;
    
    const days = parseInt(days_requested, 10);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      return res.status(400).json({ error: 'days_requested must be an integer between 1 and 365' });
    }

    if (!start_date) {
      return res.status(400).json({ error: 'start_date is required' });
    }

    // Validate start_date format and that it's not in the past
    const startDate = new Date(start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start_date format' });
    }
    
    if (startDate < today) {
      return res.status(400).json({ error: 'start_date cannot be in the past' });
    }

    const rentalRes = await db.query('SELECT * FROM rentals WHERE id = $1', [rentalId]);
    if (rentalRes.rows.length === 0) return res.status(404).json({ error: 'Rental not found' });
    const rental = rentalRes.rows[0];

    if (rental.owner_id === req.userId) {
      return res.status(400).json({ error: "You can't rent your own listing" });
    }
    if (rental.status !== 'available') {
      return res.status(400).json({ error: 'This item is not available to rent right now' });
    }

    const dup = await db.query(
      `SELECT id FROM rental_requests
       WHERE rental_id = $1 AND requester_id = $2 AND status = 'pending'`,
      [rentalId, req.userId]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'You already have a pending request for this item' });
    }

    const { fee, deposit } = computePricing(rental.daily_rate, days);

    const client = await db.getClient();
    let request;
    try {
      await client.query('BEGIN');

      const insertRes = await client.query(
        `INSERT INTO rental_requests
           (rental_id, requester_id, start_date, end_date, status, total_amount, deposit_amount, meeting_location)
         VALUES ($1, $2, $3::date, ($3::date + ($4 || ' days')::interval)::date, 'pending', $5, $6, $7)
         RETURNING *`,
        [rentalId, req.userId, start_date, days, fee, deposit, (meeting_location || '').trim() || null]
      );
      request = insertRes.rows[0];

      await client.query(`UPDATE rentals SET status = 'requested' WHERE id = $1`, [rentalId]);

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    createNotification(
      rental.owner_id, 'rental_request',
      'New Rental Request',
      `${req.body.requester_name || 'Someone'} wants to rent "${rental.title}" for ${days} day(s) starting ${start_date}.`
    ).catch(err => console.error('Notification error (rental request):', err));

    try {
      req.app.get('io')?.to(`user:${rental.owner_id}`).emit('rentalUpdated', request);
    } catch {}

    res.status(201).json({
      success: true,
      request: decorateRequest(request),
      breakdown: {
        days_requested: days,
        daily_rate: Number(rental.daily_rate),
        rental_fee: fee,
        deposit_amount: deposit,
        total_commitment: Math.round((fee + deposit) * 100) / 100,
      },
    });
  } catch (err) {
    console.error('POST /rentals/:id/requests error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/rentals/requests/mine — requests I sent (as renter)
router.get('/requests/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rr.*, r.title AS rental_title, r.daily_rate, r.image_url, r.owner_id,
              u.username AS owner_username, u.full_name AS owner_name,
              u.profile_image AS owner_profile_image
       FROM rental_requests rr
       JOIN rentals r ON r.id = rr.rental_id
       JOIN users u ON u.id = r.owner_id
       WHERE rr.requester_id = $1
       ORDER BY rr.created_at DESC`,
      [req.userId]
    );
    res.json({ success: true, requests: result.rows.map(decorateRequest) });
  } catch (err) {
    console.error('GET /rentals/requests/mine error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/rentals/requests/incoming — requests on my rentals (owner)
router.get('/requests/incoming', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rr.*, r.title AS rental_title, r.daily_rate, r.image_url,
              u.username AS requester_username, u.full_name AS requester_name,
              u.profile_image AS requester_profile_image
       FROM rental_requests rr
       JOIN rentals r ON r.id = rr.rental_id
       JOIN users u ON u.id = rr.requester_id
       WHERE r.owner_id = $1
       ORDER BY rr.created_at DESC`,
      [req.userId]
    );
    res.json({ success: true, requests: result.rows.map(decorateRequest) });
  } catch (err) {
    console.error('GET /rentals/requests/incoming error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/rentals/:id — update rental listing
router.put('/:id', requireAuth, requireVerified, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership before allowing update
    const existing = await db.query(
      'SELECT owner_id FROM rentals WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Rental listing not found' });
    }

    if (existing.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'You do not have permission to edit this listing' });
    }

    // Client sends: item_name, description, category, image_urls, rate_type, rate_amount, status
    const { item_name, description, category, image_urls, rate_type, rate_amount, status } = req.body;

    if (item_name !== undefined && !String(item_name).trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    if (rate_type !== undefined && rate_type !== 'daily') {
      return res.status(400).json({ error: 'Only daily rental rate is supported' });
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
      if (!['available', 'paused', 'requested'].includes(status)) {
        return res.status(400).json({ error: 'status must be "available", "paused", or "requested"' });
      }
    }

    // Convert image_urls array to single image_url
    const image_url = image_urls !== undefined
      ? (Array.isArray(image_urls) && image_urls.length > 0 ? image_urls[0] : null)
      : null;

    const result = await db.query(
      `UPDATE rentals
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           image_url = COALESCE($4, image_url),
           daily_rate = COALESCE($5, daily_rate),
           status = COALESCE($6, status)
       WHERE id = $7
       RETURNING *`,
      [
        item_name !== undefined ? String(item_name).trim() : null,
        description !== undefined ? description : null,
        category !== undefined && category !== null ? String(category).trim() : null,
        image_url,
        rate_amount !== undefined && rate_amount !== null && rate_amount !== '' ? Number(rate_amount) : null,
        status !== undefined ? status : null,
        id
      ]
    );

    res.json({ rental: transformRental(result.rows[0]) });
  } catch (err) {
    console.error('PUT /rentals/:id error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// DELETE /api/rentals/:id — delete rental listing
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Verify ownership
    const existing = await db.query(
      'SELECT owner_id FROM rentals WHERE id = $1',
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

    await db.query('DELETE FROM rentals WHERE id = $1', [id]);

    res.json({ message: 'Listing deleted successfully' });
  } catch (err) {
    console.error('DELETE /rentals/:id error:', err);
    res.status(500).json({
      error: err.message || 'Server error'
    });
  }
});

// PATCH /api/rentals/requests/:id — owner accepts or declines
router.patch('/requests/:id', requireAuth, requireVerified, async (req, res) => {
  try {
    const requestId = req.params.id;
    if (!isValidUUID(requestId)) return res.status(400).json({ error: 'Invalid request id' });

    const { status } = req.body;
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Use 'accepted' or 'declined'" });
    }

    const reqRes = await db.query(
      `SELECT rr.*, r.owner_id, r.title, r.status AS rental_status
       FROM rental_requests rr JOIN rentals r ON r.id = rr.rental_id
       WHERE rr.id = $1`,
      [requestId]
    );
    if (reqRes.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const rr = reqRes.rows[0];

    if (rr.owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only the owner can respond to this request' });
    }
    if (rr.status !== 'pending') {
      return res.status(400).json({ error: 'This request has already been responded to' });
    }

    const client = await db.getClient();
    let updated;
    try {
      await client.query('BEGIN');

      const updRes = await client.query(
        `UPDATE rental_requests SET status = $1 WHERE id = $2 RETURNING *`,
        [status, requestId]
      );
      updated = updRes.rows[0];

      if (status === 'accepted') {
        // Accept now only flips status - payment happens in separate Pay step
        // Keep rental status as 'available' until payment is complete
        await client.query(`UPDATE rentals SET status = 'available' WHERE id = $1`, [rr.rental_id]);
      } else {
        await client.query(`UPDATE rentals SET status = 'available' WHERE id = $1`, [rr.rental_id]);
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    if (status === 'accepted') {
      createNotification(rr.requester_id, 'rental_accepted', 'Rental Request Accepted',
        `Your request to rent "${rr.title}" was accepted. Payment is now required to proceed.`)
        .catch(err => console.error('Notification error (rental accepted):', err));
    } else {
      createNotification(rr.requester_id, 'rental_declined', 'Rental Request Declined',
        `Your request to rent "${rr.title}" was declined.`)
        .catch(err => console.error('Notification error (rental declined):', err));
    }

    try {
      req.app.get('io')?.to(`user:${rr.requester_id}`).emit('rentalUpdated', updated);
      req.app.get('io')?.to(`user:${rr.owner_id}`).emit('rentalUpdated', updated);
    } catch {}

    res.json({ success: true, request: decorateRequest(updated) });
  } catch (err) {
    console.error('PATCH /rentals/requests/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/rentals/requests/:id/pay — renter pays for accepted rental (STEP 3)
router.post('/requests/:id/pay', requireAuth, requireVerified, async (req, res) => {
  try {
    const requestId = req.params.id;
    if (!isValidUUID(requestId)) return res.status(400).json({ error: 'Invalid request id' });

    const reqRes = await db.query(
      `SELECT rr.*, r.owner_id, r.title, r.daily_rate FROM rental_requests rr
       JOIN rentals r ON r.id = rr.rental_id WHERE rr.id = $1`,
      [requestId]
    );
    if (reqRes.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const rr = reqRes.rows[0];

    if (rr.requester_id !== req.userId) {
      return res.status(403).json({ error: 'Only the requester can pay for this rental' });
    }
    if (rr.status !== 'accepted') {
      return res.status(400).json({ error: 'Only accepted requests can be paid for' });
    }

    // Calculate total amount (fee + deposit) using existing computePricing function
    const days = Math.ceil((new Date(rr.end_date) - new Date(rr.start_date)) / (1000 * 60 * 60 * 24));
    const { fee, deposit } = computePricing(rr.daily_rate, days);
    const total = fee + deposit;

    // NEW: Skills-style payment flow - just return payment info for QR generation
    // No coins_balance checks, no transactions, no ledger writes
    res.json({ 
      success: true, 
      amount: total,
      fee: fee,
      deposit: deposit,
      title: rr.title,
      requestId: requestId,
      // Return UPI info for QR generation (same as Skills)
      upiInfo: {
        total: total,
        note: `Rental-${requestId.slice(0, 8)}`
      }
    });
  } catch (err) {
    console.error('POST /rentals/requests/:id/pay error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/rentals/requests/:id/upload-payment — renter uploads UPI payment proof (Skills-style)
// Requires multipart form with: screenshot (file), utr (text)
router.post(
  '/requests/:id/upload-payment',
  requireAuth,
  requireVerified,
  rentalPaymentUpload.single('screenshot'),
  async (req, res) => {
    const requestId = req.params.id;
    if (!isValidUUID(requestId)) {
      return res.status(400).json({ error: 'Invalid request id' });
    }

    // Multer file-type error surfaces here
    if (!req.file) {
      return res.status(400).json({ error: 'A payment screenshot (jpg/png, max 5 MB) is required' });
    }

    const { utr } = req.body;
    if (!utr || utr.trim().length < 6) {
      // Clean up the uploaded file since we're rejecting the request
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'UTR / transaction reference must be at least 6 characters' });
    }
    const cleanUtr = utr.trim().toUpperCase();

    try {
      const reqRes = await db.query(
        `SELECT rr.*, r.title, r.owner_id FROM rental_requests rr
         JOIN rentals r ON r.id = rr.rental_id WHERE rr.id = $1`,
        [requestId]
      );
      if (reqRes.rows.length === 0) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ error: 'Request not found' });
      }

      const rr = reqRes.rows[0];

      if (rr.requester_id !== req.userId) {
        fs.unlink(req.file.path, () => {});
        return res.status(403).json({ error: 'Only the requester can submit payment' });
      }

      if (rr.payment_status === 'paid') {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'This rental is already confirmed' });
      }

      if (rr.payment_status === 'pending_verification') {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'A payment is already pending verification for this rental. Wait for admin review before re-submitting.' });
      }

      // Check for duplicate UTR across all rental requests
      const dupUtr = await db.query(
        'SELECT id FROM rental_requests WHERE payment_utr = $1 AND id != $2',
        [cleanUtr, requestId]
      );
      if (dupUtr.rows.length > 0) {
        fs.unlink(req.file.path, () => {});
        return res.status(409).json({
          error: 'This transaction reference (UTR) has already been used on another rental. Each payment must have a unique UTR.',
        });
      }

      // Relative path stored in DB (relative to server root) so it's portable
      const relPath = path.relative(
        path.join(__dirname, '..'),
        req.file.path
      ).replace(/\\/g, '/');

      await db.query(
        `UPDATE rental_requests
         SET payment_status = 'pending_verification',
             payment_screenshot_url = $1,
             payment_utr = $2,
             payment_submitted_at = NOW(),
             payment_rejection_reason = NULL,
             payment_rejected_at = NULL
         WHERE id = $3`,
        [relPath, cleanUtr, requestId]
      );

      // Notify owner (acting as the admin review point)
      createNotification(
        rr.owner_id,
        'rental_payment_submitted',
        'New Rental Payment Submission',
        `A renter submitted a payment screenshot for "${rr.title}" — review it to confirm the rental.`
      ).catch(err => console.error('Notification error (rental_payment_submitted):', err));

      res.json({
        success: true,
        message: 'Payment submitted — your rental is pending verification.',
      });
    } catch (err) {
      // Clean up file on unexpected DB error
      if (req.file) fs.unlink(req.file.path, () => {});
      console.error('POST /rentals/requests/:id/upload-payment error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PATCH /api/rentals/requests/:id/confirm-payment — admin verifies payment (Skills-style)
router.patch('/requests/:id/confirm-payment', requireAuth, requireAdmin, async (req, res) => {
  try {
    const requestId = req.params.id;
    if (!isValidUUID(requestId)) return res.status(400).json({ error: 'Invalid request id' });

    const reqRes = await db.query(
      `SELECT rr.*, r.title FROM rental_requests rr
       JOIN rentals r ON r.id = rr.rental_id WHERE rr.id = $1`,
      [requestId]
    );
    if (reqRes.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const rr = reqRes.rows[0];

    if (rr.payment_status !== 'pending_verification') {
      return res.status(400).json({ 
        error: `Cannot confirm — rental payment_status is '${rr.payment_status}', expected 'pending_verification'.` 
      });
    }

    // Update to paid status (NO coins_balance updates, NO transactions)
    const updatedRes = await db.query(
      `UPDATE rental_requests
       SET payment_status = 'paid',
           status = 'paid'
       WHERE id = $1 RETURNING *`,
      [requestId]
    );

    const updated = updatedRes.rows[0];

    // Notify renter
    createNotification(rr.requester_id, 'rental_payment_confirmed', 'Payment Verified',
      `Your payment for rental "${rr.title}" has been verified. The rental can now proceed.`)
      .catch(err => console.error('Notification error (rental payment confirmed):', err));

    // Notify owner
    createNotification(rr.owner_id, 'rental_payment_confirmed_owner', 'Payment Verified',
      `Payment for your rental "${rr.title}" has been verified by admin.`)
      .catch(err => console.error('Notification error (rental payment confirmed owner):', err));

    res.json({ 
      success: true, 
      request: decorateRequest(updated),
      message: 'Payment confirmed successfully. Rental can now proceed to pickup.'
    });
  } catch (err) {
    console.error('PATCH /rentals/requests/:id/confirm-payment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/rentals/requests/:id/cancel — renter withdraws pending
router.patch('/requests/:id/cancel', requireAuth, requireVerified, async (req, res) => {
  try {
    const requestId = req.params.id;
    if (!isValidUUID(requestId)) return res.status(400).json({ error: 'Invalid request id' });

    const reqRes = await db.query(
      `SELECT rr.*, r.owner_id, r.title FROM rental_requests rr
       JOIN rentals r ON r.id = rr.rental_id WHERE rr.id = $1`,
      [requestId]
    );
    if (reqRes.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const rr = reqRes.rows[0];

    if (rr.requester_id !== req.userId) {
      return res.status(403).json({ error: 'Only the requester can withdraw this request' });
    }
    if (rr.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be cancelled' });
    }

    const client = await db.getClient();
    let updated;
    try {
      await client.query('BEGIN');
      const updRes = await client.query(
        `UPDATE rental_requests SET status = 'cancelled' WHERE id = $1 RETURNING *`,
        [requestId]
      );
      updated = updRes.rows[0];
      await client.query(`UPDATE rentals SET status = 'available' WHERE id = $1`, [rr.rental_id]);
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    createNotification(rr.owner_id, 'rental_cancelled', 'Rental Request Withdrawn',
      `A request to rent "${rr.title}" was withdrawn.`)
      .catch(err => console.error('Notification error (rental cancelled):', err));

    try {
      req.app.get('io')?.to(`user:${rr.owner_id}`).emit('rentalUpdated', updated);
    } catch {}

    res.json({ success: true, request: decorateRequest(updated) });
  } catch (err) {
    console.error('PATCH /rentals/requests/:id/cancel error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/rentals/requests/:id/confirm-pickup — confirm pickup (STEP 4)
router.post('/requests/:id/confirm-pickup', requireAuth, requireVerified, async (req, res) => {
  try {
    const requestId = req.params.id;
    if (!isValidUUID(requestId)) return res.status(400).json({ error: 'Invalid request id' });

    const reqRes = await db.query(
      `SELECT rr.*, r.owner_id, r.title FROM rental_requests rr
       JOIN rentals r ON r.id = rr.rental_id WHERE rr.id = $1`,
      [requestId]
    );
    if (reqRes.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const rr = reqRes.rows[0];

    const isRenter = rr.requester_id === req.userId;
    const isOwner = rr.owner_id === req.userId;
    if (!isRenter && !isOwner) {
      return res.status(403).json({ error: 'You are not part of this rental' });
    }
    if (rr.status !== 'accepted') {
      return res.status(400).json({
        error: 'Pickup can only be confirmed after the request is accepted.',
        current_status: rr.status,
      });
    }

    let renterConfirmedPickup = rr.renter_confirmed_pickup || false;
    let ownerConfirmedPickup = rr.owner_confirmed_pickup || false;
    if (isRenter) renterConfirmedPickup = true;
    if (isOwner) ownerConfirmedPickup = true;

    const bothConfirmed = renterConfirmedPickup && ownerConfirmedPickup;
    const newStatus = bothConfirmed ? 'rented' : 'accepted';

    const client = await db.getClient();
    let updated;
    try {
      await client.query('BEGIN');

      const updRes = await client.query(
        `UPDATE rental_requests
         SET renter_confirmed_pickup = $1, owner_confirmed_pickup = $2, status = $3
         WHERE id = $4 RETURNING *`,
        [renterConfirmedPickup, ownerConfirmedPickup, newStatus, requestId]
      );
      updated = updRes.rows[0];

      if (bothConfirmed) {
        // Once both confirm pickup, rental becomes active ('rented' status)
        await client.query(`UPDATE rentals SET status = 'rented' WHERE id = $1`, [rr.rental_id]);
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    const otherUserId = isRenter ? rr.owner_id : rr.requester_id;
    if (bothConfirmed) {
      createNotification(otherUserId, 'rental_active', 'Rental Active', 
        `"${rr.title}" pickup confirmed by both parties. Rental is now active.`)
        .catch(err => console.error('Notification error (rental active):', err));
    } else {
      const roleName = isRenter ? 'Renter' : 'Owner';
      createNotification(otherUserId, 'rental_pickup_half', 'Pickup Confirmation Pending',
        `${roleName} confirmed pickup of "${rr.title}". Waiting for your confirmation.`)
        .catch(err => console.error('Notification error (rental pickup-half):', err));
    }

    try {
      req.app.get('io')?.to(`user:${rr.requester_id}`).emit('rentalUpdated', updated);
      req.app.get('io')?.to(`user:${rr.owner_id}`).emit('rentalUpdated', updated);
    } catch {}

    res.json({ success: true, request: decorateRequest(updated) });
  } catch (err) {
    console.error('POST /rentals/requests/:id/confirm-pickup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/rentals/requests/:id/confirm-return — confirm return
router.post('/requests/:id/confirm-return', requireAuth, requireVerified, async (req, res) => {
  try {
    const requestId = req.params.id;
    if (!isValidUUID(requestId)) return res.status(400).json({ error: 'Invalid request id' });

    const reqRes = await db.query(
      `SELECT rr.*, r.owner_id, r.title FROM rental_requests rr
       JOIN rentals r ON r.id = rr.rental_id WHERE rr.id = $1`,
      [requestId]
    );
    if (reqRes.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const rr = reqRes.rows[0];

    const isRenter = rr.requester_id === req.userId;
    const isOwner = rr.owner_id === req.userId;
    if (!isRenter && !isOwner) {
      return res.status(403).json({ error: 'You are not part of this rental' });
    }
    if (rr.status !== 'rented') {
      return res.status(400).json({
        error: 'Return can only be confirmed while the rental is active.',
        current_status: rr.status,
      });
    }

    let renterConfirmed = rr.renter_confirmed_return;
    let ownerConfirmed = rr.owner_confirmed_return;
    if (isRenter) renterConfirmed = true;
    if (isOwner) ownerConfirmed = true;

    const bothConfirmed = renterConfirmed && ownerConfirmed;
    const newStatus = bothConfirmed ? 'returned' : 'rented';

    const client = await db.getClient();
    let updated;
    try {
      await client.query('BEGIN');

      const updRes = await client.query(
        `UPDATE rental_requests
         SET renter_confirmed_return = $1, owner_confirmed_return = $2, status = $3
         WHERE id = $4 RETURNING *`,
        [renterConfirmed, ownerConfirmed, newStatus, requestId]
      );
      updated = updRes.rows[0];

      if (bothConfirmed) {
        await client.query(`UPDATE rentals SET status = 'available' WHERE id = $1`, [rr.rental_id]);
        // Release deposit
        const dep = Number(rr.deposit_amount);
        if (dep > 0) {
          // Deposit is now real money - no internal ledger refund
          // Just record that deposit should be refunded externally
          // No coins_balance updates, no transactions
          console.log(`Deposit of ${dep} should be refunded externally for rental ${rr.title}`);
          // In a real implementation, you might want to:
          // 1. Store deposit_refund_pending = true
          // 2. Send notification to owner to refund deposit
          // 3. Or integrate with external payment system for refunds
        }
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    const otherUserId = isRenter ? rr.owner_id : rr.requester_id;
    if (bothConfirmed) {
      const dep = Number(rr.deposit_amount);
      const depositMessage = dep > 0 
        ? `"${rr.title}" has been returned. Contact the owner to arrange deposit refund of ₹${dep}.`
        : `"${rr.title}" has been returned and confirmed by both parties.`;
      
      createNotification(otherUserId, 'rental_completed', 'Rental Completed', depositMessage)
        .catch(err => console.error('Notification error (rental completed):', err));
    } else {
      const roleName = isRenter ? 'Renter' : 'Owner';
      createNotification(otherUserId, 'rental_confirm_half', 'Return Confirmation Pending',
        `${roleName} confirmed the return of "${rr.title}". Waiting for your confirmation.`)
        .catch(err => console.error('Notification error (rental confirm-half):', err));
    }

    try {
      req.app.get('io')?.to(`user:${rr.requester_id}`).emit('rentalUpdated', updated);
      req.app.get('io')?.to(`user:${rr.owner_id}`).emit('rentalUpdated', updated);
    } catch {}

    res.json({ success: true, request: decorateRequest(updated) });
  } catch (err) {
    console.error('POST /rentals/requests/:id/confirm-return error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/rentals/:id — single rental detail (MUST BE LAST - after all other GET routes)
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, u.username AS owner_name
       FROM rentals r
       JOIN users u ON u.id = r.owner_id
       WHERE r.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rental listing not found' });
    }

    res.json({ rental: transformRental(result.rows[0]) });
  } catch (err) {
    console.error('GET /rentals/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;