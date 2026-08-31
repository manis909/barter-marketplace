const express = require('express');
const router = express.Router();

const db = require('../models/db');
const requireAuth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');
const { createNotification } = require('./notifications');

// ── Constants ─────────────────────────────────────────────────────────────
const DEPOSIT_RATE = 0.15; // fixed platform policy: 15% of rental fee
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(val) { return UUID_RE.test(val); }

// Server-side pricing — NEVER trust client-sent amounts.
// total_amount  = daily_rate x days          (rental fee ONLY, no deposit)
// deposit_amount = round(DEPOSIT_RATE x fee) (nearest whole rupee)
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

function decorate(row) {
  return {
    ...row,
    is_overdue: isOverdue(row),
    days_remaining: row.end_date
      ? Math.ceil((new Date(row.end_date) - new Date()) / 86400000)
      : null,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// LISTINGS
// ══════════════════════════════════════════════════════════════════════════

// ── GET /api/rentals — publicly available rental listings ────────────────
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, u.username AS owner_username, u.profile_image AS owner_profile_image
       FROM rental_listings r
       JOIN users u ON u.id = r.owner_id
       WHERE r.status = 'available'
       ORDER BY r.created_at DESC`
    );
    res.json({ success: true, rentals: result.rows });
  } catch (err) {
    console.error('GET /rentals error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/rentals — create a rental listing ───────────────────────────
router.post('/', requireAuth, requireVerified, async (req, res) => {
  try {
    const { title: requestTitle, item_name, description, category, daily_rate: requestDailyRate, rate_amount, rate_type, image_url, image_urls, item_id } = req.body;
    const title = requestTitle ?? item_name;
    const daily_rate = requestDailyRate ?? rate_amount;

    if (!title || !daily_rate) {
      return res.status(400).json({ error: 'title and daily_rate are required' });
    }
    const rate = Number(daily_rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return res.status(400).json({ error: 'daily_rate must be a positive number' });
    }

    // ── Legacy branch: item-linked rentals (ItemDetail "Request to Rent") ──
    // Preserved verbatim on the legacy `rentals` table. Barter module file
    // ItemDetail.jsx is NOT part of this migration and keeps using this path.
    if (item_id) {
      if (!isValidUUID(item_id)) return res.status(400).json({ error: 'Invalid item id' });
      const itemCheck = await db.query('SELECT owner_id FROM items WHERE id = $1', [item_id]);
      if (itemCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Linked item not found' });
      }
      if (itemCheck.rows[0].owner_id !== req.userId) {
        return res.status(403).json({ error: 'You can only attach rentals to your own items' });
      }
      const result = await db.query(
        `INSERT INTO rentals (owner_id, title, description, category, daily_rate, image_url, item_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.userId, title, description || null, category ? String(category).trim() : null, rate, image_url || null, item_id]
      );
      return res.status(201).json({ success: true, rental: result.rows[0] });
    }

    // ── Official branch: standalone listing on `rental_listings` ───────────
    // Field mapping (legacy -> official):
    //   title        -> item_name
    //   daily_rate   -> rate_type + rate_amount
    //   image_url(s) -> image_urls (multi-image ARRAY, preserved whole)
    const normalisedRateType = rate_type === 'hourly' ? 'hourly' : 'daily';
    const normalisedImageUrls = Array.isArray(image_urls)
      ? image_urls.filter(Boolean)
      : (image_url ? [image_url] : []);

    const result = await db.query(
      `INSERT INTO rental_listings (owner_id, item_name, description, category, rate_type, rate_amount, image_urls)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.userId, String(title).trim(), description || null, category ? String(category).trim() : null, normalisedRateType, rate, normalisedImageUrls.length ? normalisedImageUrls : null]
    );
    res.status(201).json({ success: true, rental: result.rows[0] });
  } catch (err) {
    console.error('POST /rentals error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/rentals/mine — my rental listings ────────────────────────────
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.* FROM rental_listings r WHERE r.owner_id = $1 ORDER BY r.created_at DESC`,
      [req.userId]
    );
    res.json({ success: true, rentals: result.rows });
  } catch (err) {
    console.error('GET /rentals/mine error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/rentals/:id — delete an owned rental listing ──────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid rental id' });

    const existing = await db.query(
      'SELECT owner_id FROM rental_listings WHERE id = $1',
      [req.params.id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Rental not found' });
    if (existing.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'You can only delete your own rental listings' });
    }

    await db.query('DELETE FROM rental_listings WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Rental listing deleted successfully' });
  } catch (err) {
    console.error('DELETE /rentals/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
// ── PUT /api/rentals/:id — edit an owned rental listing ──────────────────
// Supports the two call shapes RentalListings.jsx sends:
//   full edit  -> { item_name, description, category, rate_type, rate_amount, image_urls, status? }
//   pause      -> { status: 'available' | 'paused' }
// Legacy names (title / daily_rate / image_url) are accepted as fallbacks.
// Only the columns the client actually sends are updated (partial update).
router.put('/:id', requireAuth, requireVerified, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid rental id' });

    const existing = await db.query(
      'SELECT owner_id, status FROM rental_listings WHERE id = $1',
      [req.params.id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Rental not found' });
    if (existing.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'You can only edit your own rental listings' });
    }

    const body = req.body || {};

    // Official field names first, legacy names as fallback (title -> item_name,
    // daily_rate -> rate_amount) so older clients still operate correctly.
    const hasName = body.item_name !== undefined || body.title !== undefined;
    const itemName = body.item_name !== undefined
      ? String(body.item_name).trim()
      : (body.title !== undefined ? String(body.title).trim() : null);
    const category = body.category !== undefined ? String(body.category).trim() : null;
    const description = body.description !== undefined ? body.description : null;
    const status = body.status !== undefined ? body.status : undefined;

    const rateType = body.rate_type !== undefined ? body.rate_type : undefined;
    if (rateType !== undefined && !['hourly', 'daily'].includes(rateType)) {
      return res.status(400).json({ error: "rate_type must be 'hourly' or 'daily'" });
    }

    let rateAmount = undefined;
    const rawRate = body.rate_amount !== undefined ? body.rate_amount : body.daily_rate;
    if (rawRate !== undefined && rawRate !== null && rawRate !== '') {
      const n = Number(rawRate);
      if (!Number.isFinite(n) || n <= 0) {
        return res.status(400).json({ error: 'rate_amount must be a positive number' });
      }
      rateAmount = n;
    }

    // Multi-image array preserved whole: never collapse to a single URL.
    let imageUrls = undefined;
    if (body.image_urls !== undefined) {
      imageUrls = Array.isArray(body.image_urls) ? body.image_urls.filter(Boolean) : null;
    } else if (body.image_url !== undefined) {
      imageUrls = body.image_url ? [body.image_url] : null;
    }

    // item_name is required for full edits; optional on status-only calls.
    if (hasName && !itemName) {
      return res.status(400).json({ error: 'item_name is required' });
    }

    // A rented listing's availability is managed by the booking flow — never
    // allow this route to change its status while it is rented out.
    if (existing.rows[0].status === 'rented' && status !== undefined && status !== 'rented') {
      return res.status(400).json({ error: 'A rented listing cannot be edited until the booking is returned' });
    }

    // Build the UPDATE dynamically, touching only the columns the client sent.
    const sets = [];
    const params = [];
    const hold = {};
    if (hasName) { params.push(itemName); sets.push('item_name'); hold.item_name = params.length; }
    if (body.description !== undefined) { params.push(description || null); sets.push('description'); hold.description = params.length; }
    if (body.category !== undefined) { params.push(category || null); sets.push('category'); hold.category = params.length; }
    if (rateType !== undefined) { params.push(rateType); sets.push('rate_type'); hold.rate_type = params.length; }
    if (rateAmount !== undefined) { params.push(rateAmount); sets.push('rate_amount'); hold.rate_amount = params.length; }
    if (imageUrls !== undefined) { params.push(imageUrls && imageUrls.length ? imageUrls : null); sets.push('image_urls'); hold.image_urls = params.length; }
    if (status !== undefined) { params.push(status); sets.push('status'); hold.status = params.length; }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const idParam = params.length;

    const result = await db.query(
      `UPDATE rental_listings
       SET ${sets.map((col) => `${col} = $${hold[col]}`).join(', ')}, updated_at = NOW()
       WHERE id = $${idParam}
       RETURNING *`,
      params
    );

    res.json({ success: true, rental: result.rows[0] });
  } catch (err) {
    console.error('PUT /rentals/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/rentals/by-item/:itemId — rental attached to an item ─────────
// Used by ItemDetail (/item/:id) to decide whether to show "Request to Rent".
router.get('/by-item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!isValidUUID(itemId)) return res.status(400).json({ error: 'Invalid item id' });

    const result = await db.query(
      `SELECT r.*, u.username AS owner_username, u.profile_image AS owner_profile_image
       FROM rentals r JOIN users u ON u.id = r.owner_id
       WHERE r.item_id = $1 LIMIT 1`,
      [itemId]
    );
    res.json({ success: true, rental: result.rows[0] || null });
  } catch (err) {
    console.error('GET /rentals/by-item error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// MY RENTALS (both roles in one call)
// ══════════════════════════════════════════════════════════════════════════

// ── GET /api/rentals/my-rentals ───────────────────────────────────────────
// renting: requests where I am the renter (accepted/returned)
// owned:   requests on rentals I own   (accepted/returned)
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
      baseSelect + ` WHERE rr.requester_id = $1 AND rr.status IN ('accepted','returned')
                     ORDER BY rr.created_at DESC`,
      [req.userId]
    );
    const owned = await db.query(
      baseSelect + ` WHERE r.owner_id = $1 AND rr.status IN ('accepted','returned')
                     ORDER BY rr.created_at DESC`,
      [req.userId]
    );
    res.json({
      success: true,
      renting: renting.rows.map(decorate),
      owned: owned.rows.map(decorate),
    });
  } catch (err) {
    console.error('GET /rentals/my-rentals error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// REQUESTS
// ══════════════════════════════════════════════════════════════════════════

// ── POST /api/rentals/:id/requests — renter requests to rent ──────────────
// Body: { days_requested } — ALL amounts computed server-side.
router.post('/:id/requests', requireAuth, requireVerified, async (req, res) => {
  try {
    const rentalId = req.params.id;
    if (!isValidUUID(rentalId)) return res.status(400).json({ error: 'Invalid rental id' });

    const days = parseInt(req.body.days_requested, 10);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      return res.status(400).json({ error: 'days_requested must be an integer between 1 and 365' });
    }

    const rentalRes = await db.query('SELECT * FROM rentals WHERE id = $1', [rentalId]);
    if (rentalRes.rows.length === 0) return res.status(404).json({ error: 'Rental not found' });
    const rental = rentalRes.rows[0];

    if (rental.owner_id === req.userId) {
      return res.status(400).json({ error: 'You cannot rent your own item' });
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
           (rental_id, requester_id, start_date, end_date, status, total_amount, deposit_amount)
         VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + ($3 || ' days')::interval, 'pending', $4, $5)
         RETURNING *`,
        [rentalId, req.userId, days, fee, deposit]
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
      `${req.body.requester_name || 'Someone'} wants to rent "${rental.title}" for ${days} day(s).`
    ).catch(err => console.error('Notification error (rental request):', err));

    try {
      req.app.get('io')?.to(`user:${rental.owner_id}`).emit('rentalUpdated', request);
    } catch {}

    res.status(201).json({
      success: true,
      request: decorate(request),
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

// ── GET /api/rentals/requests/mine — requests I sent (as renter) ──────────
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
    res.json({ success: true, requests: result.rows.map(decorate) });
  } catch (err) {
    console.error('GET /rentals/requests/mine error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/rentals/requests/incoming — requests on my rentals (owner) ───
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
    res.json({ success: true, requests: result.rows.map(decorate) });
  } catch (err) {
    console.error('GET /rentals/requests/incoming error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/rentals/requests/:id — owner accepts or declines ───────────
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
        await client.query(`UPDATE rentals SET status = 'rented' WHERE id = $1`, [rr.rental_id]);

        // Ledger entries (internal wallet system — no real money):
        // fee moves renter -> owner; deposit held as a pending outgoing row.
        const fee = Number(rr.total_amount);
        const dep = Number(rr.deposit_amount);
        await client.query(
          `INSERT INTO transactions (user_id, pillar, type, amount, description, related_id, status)
           VALUES ($1,'rental','outgoing',$2,$3,$4,'completed'),
                  ($5,'rental','incoming',$2,$6,$4,'completed')`,
          [rr.requester_id, fee, `Rental fee for "${rr.title}"`, requestId, rr.owner_id, `Rental fee received for "${rr.title}"`]
        );
        if (dep > 0) {
          await client.query(
            `INSERT INTO transactions (user_id, pillar, type, amount, description, related_id, status)
             VALUES ($1,'rental','outgoing',$2,$3,$4,'pending')`,
            [rr.requester_id, dep, `Rental deposit held for "${rr.title}" (refundable on confirmed return)`, requestId]
          );
        }
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
        `Your request to rent "${rr.title}" was accepted.`)
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

    res.json({ success: true, request: decorate(updated) });
  } catch (err) {
    console.error('PATCH /rentals/requests/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/rentals/requests/:id/cancel — renter withdraws pending ─────
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

    res.json({ success: true, request: decorate(updated) });
  } catch (err) {
    console.error('PATCH /rentals/requests/:id/cancel error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/rentals/requests/:id/confirm-return ─────────────────────────
// Double-confirm pattern mirroring handleConfirmTrade in trades.js:
// each party sets their own flag; deposit releases only when BOTH are true.
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
    if (rr.status !== 'accepted') {
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
    const newStatus = bothConfirmed ? 'returned' : 'accepted';

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
        // Release deposit: mark hold completed + refund entry for renter.
        const dep = Number(rr.deposit_amount);
        if (dep > 0) {
          await client.query(
            `UPDATE transactions SET status = 'completed'
             WHERE related_id = $1 AND pillar = 'rental' AND type = 'outgoing'
               AND status = 'pending' AND amount = $2`,
            [requestId, dep]
          );
          await client.query(
            `INSERT INTO transactions (user_id, pillar, type, amount, description, related_id, status)
             VALUES ($1,'rental','incoming',$2,$3,$4,'completed')`,
            [rr.requester_id, dep, `Rental deposit refunded for "${rr.title}"`, requestId]
          );
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
      createNotification(otherUserId, 'rental_completed', 'Rental Completed',
        `"${rr.title}" has been returned and confirmed by both parties. Deposit released.`)
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

    res.json({ success: true, request: decorate(updated) });
  } catch (err) {
    console.error('POST /rentals/requests/:id/confirm-return error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/rentals/:id — single rental detail (must stay LAST) ──────────
router.get('/:id', async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'Invalid rental id' });
    const result = await db.query(
      `SELECT r.*, u.username AS owner_username, u.profile_image AS owner_profile_image
       FROM rental_listings r JOIN users u ON u.id = r.owner_id WHERE r.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rental not found' });
    res.json({ success: true, rental: result.rows[0] });
  } catch (err) {
    console.error('GET /rentals/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
