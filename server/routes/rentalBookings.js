const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();

const db = require('../models/db');
const requireAuth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');
const requireAdmin = require('../middleware/admin');
const { createNotification } = require('./notifications');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEPOSIT_RATE = 0.15;

function isValidUUID(val) {
  return val && UUID_RE.test(String(val));
}

function normalizeRateType(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeDisputeType(value) {
  const type = String(value || '').trim().toLowerCase();
  const mapping = {
    return_dispute: 'other',
    general_dispute: 'other',
    damage: 'damage',
    non_return: 'non_return',
    late_return: 'late_return',
    other: 'other',
  };
  return mapping[type] || 'other';
}

function computeBookingTotals(listing, startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid datetime values');
  }
  if (end <= start) {
    throw new Error('end_datetime must be after start_datetime');
  }

  const diffMs = end.getTime() - start.getTime();
  const rateType = normalizeRateType(listing.rate_type);

  let durationUnits = 0;
  if (rateType === 'hourly') {
    durationUnits = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
  } else if (rateType === 'daily') {
    durationUnits = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  } else {
    throw new Error('Unsupported rental listing rate_type');
  }

  const baseRate = Number(listing.rate_amount);
  const total = Number((baseRate * durationUnits).toFixed(2));
  const deposit = Number((total * DEPOSIT_RATE).toFixed(2));

  return { total, deposit, durationUnits, rateType };
}

function formatBookingDetail(row) {
  if (!row) return null;

  return {
    id: row.id,
    rental_listing_id: row.rental_listing_id,
    borrower_id: row.borrower_id,
    owner_id: row.owner_id,
    start_datetime: row.start_datetime,
    end_datetime: row.end_datetime,
    agreed_total_amount: Number(row.agreed_total_amount || 0),
    meeting_location: row.meeting_location,
    deposit_amount: Number(row.deposit_amount || 0),
    payment_status: row.payment_status,
    status: row.status,
    borrower_confirmed_pickup: row.borrower_confirmed_pickup,
    owner_confirmed_pickup: row.owner_confirmed_pickup,
    borrower_confirmed_return: row.borrower_confirmed_return,
    owner_confirmed_return: row.owner_confirmed_return,
    created_at: row.created_at,
    updated_at: row.updated_at,
    listing: row.listing_item_name ? {
      id: row.listing_id,
      item_name: row.listing_item_name,
      rate_type: row.listing_rate_type,
      rate_amount: Number(row.listing_rate_amount || 0),
      status: row.listing_status,
      owner_id: row.listing_owner_id,
      description: row.listing_description,
      category: row.listing_category,
      image_urls: row.listing_image_urls,
    } : null,
  };
}

const rentalPaymentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/rental-payment-screenshots');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `rental-booking-${req.params.id}-${Date.now()}${ext}`);
  },
});

const rentalPaymentUpload = multer({
  storage: rentalPaymentStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Only JPG and PNG files are allowed'));
    }
    cb(null, true);
  },
});

async function fetchBookingWithListing(bookingId) {
  const result = await db.query(
    `SELECT b.*,
            l.id AS listing_id,
            l.item_name AS listing_item_name,
            l.description AS listing_description,
            l.category AS listing_category,
            l.image_urls AS listing_image_urls,
            l.rate_type AS listing_rate_type,
            l.rate_amount AS listing_rate_amount,
            l.status AS listing_status,
            l.owner_id AS listing_owner_id
     FROM rental_bookings b
     JOIN rental_listings l ON l.id = b.rental_listing_id
     WHERE b.id = $1`,
    [bookingId]
  );

  return result.rows[0] || null;
}

async function createDisputeForBooking({ bookingId, raisedBy, disputeType, description }) {
  const existing = await db.query(
    `SELECT id FROM rental_disputes
     WHERE booking_id = $1 AND status = 'open'
     ORDER BY created_at DESC LIMIT 1`,
    [bookingId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const insert = await db.query(
    `INSERT INTO rental_disputes (booking_id, raised_by, dispute_type, description, status)
     VALUES ($1, $2, $3, $4, 'open')
     RETURNING *`,
    [bookingId, raisedBy, normalizeDisputeType(disputeType), description]
  );

  return insert.rows[0];
}

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rb.*,
              rl.item_name,
              rl.description AS item_description,
              rl.category AS item_category,
              rl.image_urls AS item_image_urls,
              rl.rate_amount AS rate_amount,
              rl.rate_type AS rate_type,
              u_borrower.username AS borrower_username,
              u_borrower.full_name AS borrower_name,
              u_borrower.profile_image AS borrower_profile_image,
              u_owner.username AS owner_username,
              u_owner.full_name AS owner_name,
              u_owner.profile_image AS owner_profile_image
       FROM rental_bookings rb
       LEFT JOIN rental_listings rl ON rl.id = rb.rental_listing_id
       JOIN users u_borrower ON u_borrower.id = rb.borrower_id
       JOIN users u_owner ON u_owner.id = rb.owner_id
       WHERE rb.borrower_id = $1 OR rb.owner_id = $1
       ORDER BY rb.created_at DESC`,
      [req.userId]
    );

    res.json({ success: true, bookings: result.rows });
  } catch (error) {
    console.error('GET /rental-bookings/mine error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.get('/hidden/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT booking_id FROM rental_booking_deletions WHERE user_id = $1`,
      [req.userId]
    );

    res.json(result.rows.map((row) => row.booking_id));
  } catch (error) {
    console.error('GET /rental-bookings/hidden/mine error:', error);
    res.status(500).json({ error: 'Failed to fetch hidden chats' });
  }
});

router.delete('/:bookingId/for-me', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.userId;

    const bookingResult = await db.query(
      `SELECT id
       FROM rental_bookings
       WHERE id = $1 AND (borrower_id = $2 OR owner_id = $2)`,
      [bookingId, userId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        error: "Booking not found or you're not part of this chat",
      });
    }

    await db.query(
      `INSERT INTO rental_booking_deletions (booking_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (booking_id, user_id) DO NOTHING`,
      [bookingId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /rental-bookings/:bookingId/for-me error:', error);
    res.status(500).json({ error: 'Failed to hide chat' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }

    const booking = await fetchBookingWithListing(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.borrower_id !== req.userId && booking.owner_id !== req.userId) {
      return res.status(403).json({ error: 'You are not part of this booking' });
    }

    return res.json({ success: true, booking: formatBookingDetail(booking) });
  } catch (err) {
    console.error('GET /rental-bookings/:id error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAuth, requireVerified, async (req, res) => {
  try {
    const { rental_listing_id, start_datetime, end_datetime, meeting_location } = req.body;

    if (!rental_listing_id || !isValidUUID(rental_listing_id)) {
      return res.status(400).json({ error: 'Valid rental_listing_id is required' });
    }

    if (!start_datetime || !end_datetime) {
      return res.status(400).json({ error: 'start_datetime and end_datetime are required' });
    }

    const start = new Date(start_datetime);
    const end = new Date(end_datetime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid datetime format' });
    }

    if (start <= new Date()) {
      return res.status(400).json({ error: 'start_datetime cannot be in the past' });
    }

    const listingResult = await db.query(
      `SELECT * FROM rental_listings WHERE id = $1`,
      [rental_listing_id]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rental listing not found' });
    }

    const listing = listingResult.rows[0];
    if (listing.owner_id === req.userId) {
      return res.status(400).json({ error: "You can't rent your own listing" });
    }

    if (listing.status !== 'available') {
      return res.status(400).json({ error: 'This listing is not available for booking' });
    }

    const duplicateResult = await db.query(
      `SELECT id FROM rental_bookings
       WHERE rental_listing_id = $1 AND borrower_id = $2 AND status IN ('pending', 'accepted', 'active', 'return_pending', 'disputed')
       LIMIT 1`,
      [rental_listing_id, req.userId]
    );
    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({ error: 'You already have an active booking request for this listing' });
    }

    const totals = computeBookingTotals(listing, start_datetime, end_datetime);

    const insert = await db.query(
      `INSERT INTO rental_bookings (
        rental_listing_id,
        borrower_id,
        owner_id,
        start_datetime,
        end_datetime,
        agreed_total_amount,
        status,
        meeting_location,
        deposit_amount,
        payment_status,
        borrower_confirmed_pickup,
        owner_confirmed_pickup,
        borrower_confirmed_return,
        owner_confirmed_return
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, 'unpaid', false, false, false, false)
       RETURNING *`,
      [
        rental_listing_id,
        req.userId,
        listing.owner_id,
        start,
        end,
        totals.total,
        meeting_location || null,
        totals.deposit,
      ]
    );

    const row = insert.rows[0];

    createNotification(
      listing.owner_id,
      'rental_booking_requested',
      'New Rental Request',
      `A borrower requested to rent "${listing.item_name}" for ${totals.durationUnits} ${totals.rateType === 'hourly' ? 'hours' : 'days'}.`
    ).catch((err) => console.error('Notification error (rental_booking_requested):', err));

    return res.status(201).json({ success: true, booking: formatBookingDetail(row) });
  } catch (err) {
    console.error('POST /rental-bookings error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.patch('/:id/status', requireAuth, requireVerified, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'status must be either accepted or declined' });
    }

    const booking = await fetchBookingWithListing(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only the owner can accept or decline this booking' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ error: `Only pending bookings can be accepted or declined. Current status: ${booking.status}` });
    }

    const update = await db.query(
      `UPDATE rental_bookings
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    const updatedBooking = update.rows[0];

    createNotification(
      booking.borrower_id,
      status === 'accepted' ? 'rental_booking_accepted' : 'rental_booking_declined',
      status === 'accepted' ? 'Booking Accepted' : 'Booking Declined',
      status === 'accepted'
        ? `Your booking for "${booking.listing_item_name}" was accepted. Please pay the booking amount to continue.`
        : `Your booking request for "${booking.listing_item_name}" was declined.`
    ).catch((err) => console.error('Notification error (rental booking status):', err));

    return res.json({ success: true, booking: formatBookingDetail(updatedBooking), details: {
      dates: {
        start_datetime: booking.start_datetime,
        end_datetime: booking.end_datetime,
      },
      meeting_location: booking.meeting_location,
      agreed_total_amount: Number(booking.agreed_total_amount || 0),
      deposit_amount: Number(booking.deposit_amount || 0),
      item_name: booking.listing_item_name,
      rate_type: booking.listing_rate_type,
      rate_amount: Number(booking.listing_rate_amount || 0),
    }});
  } catch (err) {
    console.error('PATCH /rental-bookings/:id/status error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/:id/payment-qr', requireAuth, requireVerified, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }

    const booking = await fetchBookingWithListing(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.borrower_id !== req.userId) {
      return res.status(403).json({ error: 'Only the borrower can view payment details' });
    }

    if (booking.status !== 'accepted') {
      return res.status(400).json({ error: 'Payment QR is only available for accepted bookings' });
    }

    const totalDue = Number((Number(booking.agreed_total_amount || 0) + Number(booking.deposit_amount || 0)).toFixed(2));

    return res.json({
      success: true,
      amount: totalDue,
      fee: Number(booking.agreed_total_amount || 0),
      deposit: Number(booking.deposit_amount || 0),
      booking_id: booking.id,
      upiInfo: {
        total: totalDue,
        note: `Rental-${String(booking.id).slice(0, 8)}`,
      },
      qrText: `upi://pay?pa=demo@upi&pn=BarterMarketplace&am=${totalDue}&cu=INR&tn=Rental-${String(booking.id).slice(0, 8)}`,
    });
  } catch (err) {
    console.error('GET /rental-bookings/:id/payment-qr error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.post(
  '/:id/upload-payment',
  requireAuth,
  requireVerified,
  rentalPaymentUpload.single('screenshot'),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Invalid booking id' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'A payment screenshot is required' });
      }

      const { utr } = req.body;
      if (!utr || String(utr).trim().length < 6) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'UTR / transaction reference must be at least 6 characters' });
      }

      const booking = await fetchBookingWithListing(id);
      if (!booking) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ error: 'Booking not found' });
      }

      if (booking.borrower_id !== req.userId) {
        fs.unlink(req.file.path, () => {});
        return res.status(403).json({ error: 'Only the borrower can submit payment for this booking' });
      }

      if (booking.status !== 'accepted') {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'Only accepted bookings can submit payment' });
      }

      if (booking.payment_status === 'paid') {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'This booking is already paid' });
      }

      if (booking.payment_status === 'pending_verification') {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'A payment is already pending verification' });
      }

      const cleanUtr = String(utr).trim().toUpperCase();
      const dup = await db.query(
        `SELECT id FROM rental_bookings WHERE payment_utr = $1 AND id != $2`,
        [cleanUtr, id]
      );
      if (dup.rows.length > 0) {
        fs.unlink(req.file.path, () => {});
        return res.status(409).json({ error: 'This UTR has already been used on another booking' });
      }

      const relPath = path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/');

      await db.query(
        `UPDATE rental_bookings
         SET payment_status = 'pending_verification',
             payment_screenshot_url = $1,
             payment_utr = $2,
             payment_submitted_at = NOW(),
             payment_rejection_reason = NULL,
             payment_rejected_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [relPath, cleanUtr, id]
      );

      createNotification(
        booking.owner_id,
        'rental_payment_submitted',
        'New Rental Payment Submission',
        `A payment screenshot was submitted for "${booking.listing_item_name}".`
      ).catch((err) => console.error('Notification error (rental payment submitted):', err));

      return res.json({ success: true, message: 'Payment submitted and is pending verification.' });
    } catch (err) {
      if (req.file) fs.unlink(req.file.path, () => {});
      console.error('POST /rental-bookings/:id/upload-payment error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }
);

router.patch('/:id/confirm-payment', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }

    const booking = await fetchBookingWithListing(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.payment_status !== 'pending_verification') {
      return res.status(400).json({ error: `Cannot confirm — booking payment_status is '${booking.payment_status}', expected 'pending_verification'.` });
    }

    const update = await db.query(
      `UPDATE rental_bookings
       SET payment_status = 'paid',
           status = 'accepted',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    const updated = update.rows[0];

    createNotification(
      booking.borrower_id,
      'rental_payment_confirmed',
      'Payment Verified',
      `Your payment for "${booking.listing_item_name}" was verified and the booking is confirmed.`
    ).catch((err) => console.error('Notification error (rental_payment_confirmed):', err));

    createNotification(
      booking.owner_id,
      'rental_payment_confirmed_owner',
      'Payment Verified',
      `Payment for "${booking.listing_item_name}" has been verified.`
    ).catch((err) => console.error('Notification error (rental_payment_confirmed_owner):', err));

    return res.json({ success: true, booking: formatBookingDetail(updated) });
  } catch (err) {
    console.error('PATCH /rental-bookings/:id/confirm-payment error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.patch('/:id/reject-payment', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }

    const booking = await fetchBookingWithListing(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.payment_status !== 'pending_verification') {
      return res.status(400).json({ error: `Cannot reject — booking payment_status is '${booking.payment_status}', expected 'pending_verification'.` });
    }

    const update = await db.query(
      `UPDATE rental_bookings
       SET payment_status = 'unpaid',
           payment_rejection_reason = $1,
           payment_rejected_at = NOW(),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [reason || null, id]
    );

    createNotification(
      booking.borrower_id,
      'rental_payment_rejected',
      'Payment Not Verified',
      `Your payment for "${booking.listing_item_name}" was rejected${reason ? `: ${reason}` : ''}. Please resubmit with a valid screenshot.`
    ).catch((err) => console.error('Notification error (rental_payment_rejected):', err));

    return res.json({ success: true, booking: formatBookingDetail(update.rows[0]) });
  } catch (err) {
    console.error('PATCH /rental-bookings/:id/reject-payment error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.post('/:id/confirm-pickup', requireAuth, requireVerified, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }

    const booking = await fetchBookingWithListing(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (![booking.borrower_id, booking.owner_id].includes(req.userId)) {
      return res.status(403).json({ error: 'You are not part of this booking' });
    }

    if (booking.status !== 'accepted') {
      return res.status(400).json({ error: 'Pickup can only be confirmed while the booking is accepted' });
    }

    const borrowerConfirmed = booking.borrower_id === req.userId ? true : booking.borrower_confirmed_pickup;
    const ownerConfirmed = booking.owner_id === req.userId ? true : booking.owner_confirmed_pickup;
    const nextBorrower = booking.borrower_id === req.userId ? true : booking.borrower_confirmed_pickup;
    const nextOwner = booking.owner_id === req.userId ? true : booking.owner_confirmed_pickup;

    const update = await db.query(
      `UPDATE rental_bookings
       SET borrower_confirmed_pickup = $1,
           owner_confirmed_pickup = $2,
           status = CASE WHEN $1 AND $2 THEN 'active' ELSE 'accepted' END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [nextBorrower, nextOwner, id]
    );

    const updated = update.rows[0];
    const bothConfirmed = nextBorrower && nextOwner;

    if (bothConfirmed) {
      createNotification(
        booking.borrower_id === req.userId ? booking.owner_id : booking.borrower_id,
        'rental_booking_active',
        'Pickup Confirmed',
        `Pickup was confirmed for "${booking.listing_item_name}". The booking is now active.`
      ).catch((err) => console.error('Notification error (rental_booking_active):', err));
    } else {
      const otherUserId = req.userId === booking.borrower_id ? booking.owner_id : booking.borrower_id;
      createNotification(
        otherUserId,
        'rental_booking_pickup_pending',
        'Pickup Confirmation Pending',
        `The other party confirmed pickup for "${booking.listing_item_name}". Waiting for your confirmation.`
      ).catch((err) => console.error('Notification error (rental_booking_pickup_pending):', err));
    }

    return res.json({ success: true, booking: formatBookingDetail(updated) });
  } catch (err) {
    console.error('POST /rental-bookings/:id/confirm-pickup error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.post('/:id/confirm-return', requireAuth, requireVerified, async (req, res) => {
  try {
    const { id } = req.params;
    const { problem } = req.body || {};

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }

    const booking = await fetchBookingWithListing(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (![booking.borrower_id, booking.owner_id].includes(req.userId)) {
      return res.status(403).json({ error: 'You are not part of this booking' });
    }

    if (!['active', 'return_pending'].includes(booking.status)) {
      return res.status(400).json({ error: 'Return confirmation is only valid for active bookings' });
    }

    const borrowerConfirmed = booking.borrower_id === req.userId ? true : booking.borrower_confirmed_return;
    const ownerConfirmed = booking.owner_id === req.userId ? true : booking.owner_confirmed_return;
    const nextBorrower = booking.borrower_id === req.userId ? true : booking.borrower_confirmed_return;
    const nextOwner = booking.owner_id === req.userId ? true : booking.owner_confirmed_return;

    const bothConfirmed = nextBorrower && nextOwner;
    const disputeRequired = !bothConfirmed || Boolean(problem);

    let updated;
    if (bothConfirmed && !problem) {
      updated = (await db.query(
        `UPDATE rental_bookings
         SET borrower_confirmed_return = $1,
             owner_confirmed_return = $2,
             status = 'completed',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [nextBorrower, nextOwner, id]
      )).rows[0];
    } else {
      updated = (await db.query(
        `UPDATE rental_bookings
         SET borrower_confirmed_return = $1,
             owner_confirmed_return = $2,
             status = 'disputed',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [nextBorrower, nextOwner, id]
      )).rows[0];

      const disputeDesc = problem || `Return confirmation was incomplete: borrower_confirmed_return=${nextBorrower}, owner_confirmed_return=${nextOwner}.`;
      await createDisputeForBooking({
        bookingId: id,
        raisedBy: req.userId,
        disputeType: problem ? 'damage' : 'other',
        description: disputeDesc,
      });
    }

    if (disputeRequired) {
      const otherUserId = req.userId === booking.borrower_id ? booking.owner_id : booking.borrower_id;
      createNotification(
        otherUserId,
        'rental_booking_disputed',
        'Return Dispute Opened',
        `A return dispute was raised for "${booking.listing_item_name}" and the booking was marked disputed.`
      ).catch((err) => console.error('Notification error (rental_booking_disputed):', err));
    }

    return res.json({ success: true, booking: formatBookingDetail(updated), disputeCreated: disputeRequired });
  } catch (err) {
    console.error('POST /rental-bookings/:id/confirm-return error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.post('/:id/dispute', requireAuth, requireVerified, async (req, res) => {
  try {
    const { id } = req.params;
    const { dispute_type, description } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }

    const booking = await fetchBookingWithListing(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (![booking.borrower_id, booking.owner_id].includes(req.userId)) {
      return res.status(403).json({ error: 'You are not part of this booking' });
    }

    const dispute = await createDisputeForBooking({
      bookingId: id,
      raisedBy: req.userId,
      disputeType: dispute_type || 'other',
      description: description || 'A dispute was raised for this booking.',
    });

    await db.query(
      `UPDATE rental_bookings
       SET status = 'disputed', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    return res.status(201).json({ success: true, dispute });
  } catch (err) {
    console.error('POST /rental-bookings/:id/dispute error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  console.error('DELETE /rental-bookings/:bookingId/for-me error:', error);
  res.status(500).json({ error: 'Failed to hide chat' });
  }
});

module.exports = router;
