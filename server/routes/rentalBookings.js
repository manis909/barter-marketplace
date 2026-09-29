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
const {
  DEPOSIT_RATE,
  RENTAL_COMMISSION_RATE,
  roundRupees,
} = require('../config/pricing');

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

function normalizeDateOnly(input) {
  if (!input) return null;
  const str = typeof input === 'string' ? input.split('T')[0] : new Date(input).toISOString().split('T')[0];
  const ms = Date.parse(str + 'T00:00:00.000Z');
  return Number.isNaN(ms) ? null : new Date(ms);
}

function calculateRentalDays(startInput, endInput) {
  const startD = normalizeDateOnly(startInput);
  const endD = normalizeDateOnly(endInput);
  if (!startD || !endD) return 1;
  const diffDays = Math.round((endD.getTime() - startD.getTime()) / 86400000);
  return Math.max(1, diffDays);
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

  const rateType = normalizeRateType(listing.rate_type);

  let durationUnits = 0;
  if (rateType === 'hourly') {
    const diffMs = end.getTime() - start.getTime();
    durationUnits = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
  } else if (rateType === 'daily') {
    durationUnits = calculateRentalDays(startIso, endIso);
  } else {
    throw new Error('Unsupported rental listing rate_type');
  }

  const baseRate = Number(listing.rate_amount);
  const total = Number((baseRate * durationUnits).toFixed(2));
  const deposit = Number((total * DEPOSIT_RATE).toFixed(2));

  // Snapshot commission at booking creation time so later config changes
  // never alter existing bookings.
  const commissionAmount = roundRupees(total * RENTAL_COMMISSION_RATE);
  const ownerPayoutAmount = total - commissionAmount; // exact, never double-rounded

  return { total, deposit, durationUnits, rateType, commissionAmount, ownerPayoutAmount };
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
    payment_submitted_at: row.payment_submitted_at || null,
    status: row.status,
    borrower_confirmed_pickup: row.borrower_confirmed_pickup,
    owner_confirmed_pickup: row.owner_confirmed_pickup,
    borrower_confirmed_return: row.borrower_confirmed_return,
    owner_confirmed_return: row.owner_confirmed_return,
    created_at: row.created_at,
    updated_at: row.updated_at,
    // Owner info
    owner_username: row.owner_username || null,
    owner_name: row.owner_name || null,
    owner_profile_image: row.owner_profile_image || null,
    // Borrower info
    borrower_username: row.borrower_username || null,
    borrower_name: row.borrower_name || null,
    borrower_profile_image: row.borrower_profile_image || null,
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

/**
 * Booking response for the OWNER.
 * Includes commission_amount and owner_payout_amount.
 * Does NOT include commission_rate (that comes from the /rental-config endpoint).
 * For legacy bookings (NULL columns) both fields are null — the UI shows "N/A".
 */
function formatOwnerBookingView(row) {
  if (!row) return null;
  const base = formatBookingDetail(row);
  return {
    ...base,
    commission_amount: row.commission_amount != null ? Number(row.commission_amount) : null,
    owner_payout_amount: row.owner_payout_amount != null ? Number(row.owner_payout_amount) : null,
    payout_status: row.payout_status || null,
    payout_sent_at: row.payout_sent_at || null,
  };
}

/**
 * Booking response for the BORROWER.
 * Commission fields are deliberately absent — not just omitted, never added.
 * payout_status is also excluded (borrower has no visibility into owner payouts).
 */
function formatBorrowerBookingView(row) {
  if (!row) return null;
  // Start from the base shared fields — commission_* columns never appear.
  return formatBookingDetail(row);
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

// Multer config for extension payments
const extensionPaymentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/extensions');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const extensionPaymentUpload = multer({
  storage: extensionPaymentStorage,
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
            l.owner_id AS listing_owner_id,
            u_owner.username AS owner_username,
            u_owner.full_name AS owner_name,
            u_owner.profile_image AS owner_profile_image,
            u_borrower.username AS borrower_username,
            u_borrower.full_name AS borrower_name,
            u_borrower.profile_image AS borrower_profile_image
     FROM rental_bookings b
     JOIN rental_listings l ON l.id = b.rental_listing_id
     LEFT JOIN users u_owner ON u_owner.id = b.owner_id
     LEFT JOIN users u_borrower ON u_borrower.id = b.borrower_id
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
              u_owner.profile_image AS owner_profile_image,
              CASE
                WHEN rb.borrower_id = $1 THEN COALESCE(NULLIF(u_owner.full_name, ''), u_owner.username)
                ELSE COALESCE(NULLIF(u_borrower.full_name, ''), u_borrower.username)
              END AS other_party_name,
              CASE
                WHEN rb.borrower_id = $1 THEN u_owner.username
                ELSE u_borrower.username
              END AS other_party_username,
              CASE
                WHEN rb.borrower_id = $1 THEN u_owner.profile_image
                ELSE u_borrower.profile_image
              END AS other_party_avatar
       FROM rental_bookings rb
       LEFT JOIN rental_listings rl ON rl.id = rb.rental_listing_id
       LEFT JOIN users u_borrower ON u_borrower.id = rb.borrower_id
       LEFT JOIN users u_owner ON u_owner.id = COALESCE(rb.owner_id, rl.owner_id)
       WHERE rb.borrower_id = $1 OR rb.owner_id = $1 OR rl.owner_id = $1
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

    const view = booking.owner_id === req.userId
      ? formatOwnerBookingView(booking)
      : formatBorrowerBookingView(booking);

    return res.json({ success: true, booking: view });
  } catch (err) {
    console.error('GET /rental-bookings/:id error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAuth, requireVerified, async (req, res) => {
  try {
    const { rental_listing_id, start_datetime, end_datetime, meeting_location, proposed_amount } = req.body;

    if (!rental_listing_id || !isValidUUID(rental_listing_id)) {
      return res.status(400).json({ error: 'Valid rental_listing_id is required' });
    }

    if (!start_datetime || !end_datetime) {
      return res.status(400).json({ error: 'start_datetime and end_datetime are required' });
    }

    const listingResult = await db.query(
      `SELECT * FROM rental_listings WHERE id = $1`,
      [rental_listing_id]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rental listing not found' });
    }

    const listing = listingResult.rows[0];

    const rateType = normalizeRateType(listing.rate_type);
    let start, end;
    if (rateType === 'daily') {
      start = normalizeDateOnly(start_datetime);
      end = normalizeDateOnly(end_datetime);
      if (!start || !end) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      const todayDate = normalizeDateOnly(new Date());
      if (start < todayDate) {
        return res.status(400).json({ error: 'start_datetime cannot be in the past' });
      }
      if (end <= start) {
        return res.status(400).json({ error: 'end_datetime must be after start_datetime' });
      }
    } else {
      start = new Date(start_datetime);
      end = new Date(end_datetime);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid datetime format' });
      }
      if (start <= new Date()) {
        return res.status(400).json({ error: 'start_datetime cannot be in the past' });
      }
      if (end <= start) {
        return res.status(400).json({ error: 'end_datetime must be after start_datetime' });
      }
    }

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
    
    // Handle price negotiation
    const hasProposedAmount = proposed_amount !== undefined && proposed_amount !== null;
    const proposedAmountNum = hasProposedAmount ? Number(proposed_amount) : null;
    
    // Validate proposed amount if provided
    if (hasProposedAmount) {
      if (isNaN(proposedAmountNum) || proposedAmountNum <= 0) {
        return res.status(400).json({ error: 'Invalid proposed amount' });
      }
      if (proposedAmountNum > totals.total * 2) {
        return res.status(400).json({ error: 'Proposed amount cannot be more than double the calculated price' });
      }
    }

    const insert = await db.query(
      `INSERT INTO rental_bookings (
        rental_listing_id,
        borrower_id,
        owner_id,
        start_datetime,
        end_datetime,
        agreed_total_amount,
        proposed_amount,
        negotiation_status,
        status,
        meeting_location,
        deposit_amount,
        payment_status,
        borrower_confirmed_pickup,
        owner_confirmed_pickup,
        borrower_confirmed_return,
        owner_confirmed_return,
        commission_rate,
        commission_amount,
        owner_payout_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, 'unpaid', false, false, false, false, $11, $12, $13)
       RETURNING *`,
      [
        rental_listing_id,
        req.userId,
        listing.owner_id,
        start,
        end,
        totals.total,
        hasProposedAmount ? proposedAmountNum : null,
        hasProposedAmount ? 'pending' : 'none',
        meeting_location || null,
        totals.deposit,
        RENTAL_COMMISSION_RATE,
        totals.commissionAmount,
        totals.ownerPayoutAmount,
      ]
    );

    const row = insert.rows[0];

    // Create notification message
    let notificationMessage = `A borrower requested to rent "${listing.item_name}" for ${totals.durationUnits} ${totals.rateType === 'hourly' ? 'hours' : 'days'}.`;
    
    if (hasProposedAmount) {
      notificationMessage += ` Proposed price: ₹${proposedAmountNum.toLocaleString('en-IN')} (listed: ₹${totals.total.toLocaleString('en-IN')}).`;
    }

    createNotification(
      listing.owner_id,
      'rental_booking_requested',
      hasProposedAmount ? 'New Rental Request (Price Negotiation)' : 'New Rental Request',
      notificationMessage
    ).catch((err) => console.error('Notification error (rental_booking_requested):', err));

    return res.status(201).json({ success: true, booking: formatBorrowerBookingView(row) });
  } catch (err) {
    console.error('POST /rental-bookings error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.patch('/:id/status', requireAuth, requireVerified, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, upi_id, account_holder_name } = req.body;

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

    if (status === 'accepted') {
      if (!upi_id || typeof upi_id !== 'string' || !upi_id.includes('@') || upi_id.trim().length < 3) {
        return res.status(400).json({ error: 'A valid payout UPI ID (e.g. username@bank) is required to accept this rental request' });
      }

      const cleanUpi = upi_id.trim();
      const cleanName = (account_holder_name || '').trim();

      await db.query(
        `INSERT INTO seller_payout_details (user_id, entity_type, entity_id, upi_id, account_holder_name, updated_at)
         VALUES ($1, 'rental_booking', $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (entity_type, entity_id)
         DO UPDATE SET upi_id = EXCLUDED.upi_id, account_holder_name = EXCLUDED.account_holder_name, updated_at = CURRENT_TIMESTAMP`,
        [req.userId, id, cleanUpi, cleanName || null]
      );
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

    return res.json({ success: true, booking: formatOwnerBookingView(updatedBooking), details: {
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
           payout_status = 'pending_payout',
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

    return res.json({ success: true, booking: formatOwnerBookingView(updated) });
  } catch (err) {
    console.error('PATCH /rental-bookings/:id/confirm-payment error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.patch('/:id/confirm-payout', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { payout_utr, payout_notes } = req.body || {};

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }

    // Fetch to validate payment_status and read the snapshotted payout amount.
    // We do NOT recompute the payout from the current config rate — we use
    // owner_payout_amount as stored at booking creation time.
    const booking = await fetchBookingWithListing(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.payment_status !== 'paid') {
      return res.status(400).json({
        error: `Cannot send payout — payment_status is '${booking.payment_status}', expected 'paid'.`,
      });
    }

    // For legacy bookings (commission columns NULL), pay out the full fee.
    // For new bookings, pay out the snapshotted owner_payout_amount.
    const ownerPayout = booking.owner_payout_amount != null
      ? Number(booking.owner_payout_amount)
      : Number(booking.agreed_total_amount);

    // Atomic guarded UPDATE: only succeeds when payout_status is still
    // 'pending_payout'. Returns zero rows if already paid_out or wrong state,
    // which guards against double-clicks and race conditions.
    const update = await db.query(
      `UPDATE rental_bookings
       SET payout_status  = 'paid_out',
           payout_sent_at = NOW(),
           payout_utr     = $1,
           payout_notes   = $2,
           updated_at     = CURRENT_TIMESTAMP
       WHERE id           = $3
         AND payout_status = 'pending_payout'
       RETURNING *`,
      [
        payout_utr ? String(payout_utr).trim() : null,
        payout_notes ? String(payout_notes).trim() : null,
        id,
      ]
    );

    if (update.rows.length === 0) {
      return res.status(409).json({
        error: `Payout not applied — booking payout_status is '${booking.payout_status}', expected 'pending_payout'. It may have already been paid out.`,
      });
    }

    const updated = update.rows[0];

    const payoutDetailsRes = await db.query(
      `SELECT upi_id, account_holder_name
       FROM seller_payout_details
       WHERE entity_type = 'rental_booking' AND entity_id = $1`,
      [id]
    );

    createNotification(
      booking.owner_id,
      'rental_payout_sent',
      'Payout Sent',
      `Your payout of ₹${ownerPayout.toLocaleString('en-IN')} for "${booking.listing_item_name}" has been processed.`
    ).catch((err) => console.error('Notification error (rental_payout_sent):', err));

    return res.json({
      success: true,
      booking: {
        ...formatOwnerBookingView(updated),
        payout_utr: updated.payout_utr,
        payout_sent_at: updated.payout_sent_at,
        // Admin-facing summary: how much to send and where
        owner_payout_amount: ownerPayout,
        commission_amount: booking.commission_amount != null ? Number(booking.commission_amount) : null,
        seller_payout_upi: payoutDetailsRes.rows[0]?.upi_id || null,
        seller_payout_name: payoutDetailsRes.rows[0]?.account_holder_name || null,
      },
    });
  } catch (err) {
    console.error('PATCH /rental-bookings/:id/confirm-payout error:', err);
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

    const todayOnly = normalizeDateOnly(new Date());
    const startOnly = normalizeDateOnly(booking.start_datetime);
    if (startOnly && todayOnly && todayOnly.getTime() < startOnly.getTime()) {
      const diffDays = Math.round((startOnly.getTime() - todayOnly.getTime()) / 86400000);
      return res.status(400).json({
        error: `Pickup can only be confirmed on or after the start date (${booking.start_datetime ? new Date(booking.start_datetime).toISOString().split('T')[0] : ''}). Starts in ${diffDays} day${diffDays === 1 ? '' : 's'}.`,
      });
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

    const todayOnly = normalizeDateOnly(new Date());
    const endOnly = normalizeDateOnly(booking.end_datetime);
    if (endOnly && todayOnly && todayOnly.getTime() < endOnly.getTime()) {
      const diffDays = Math.round((endOnly.getTime() - todayOnly.getTime()) / 86400000);
      return res.status(400).json({
        error: `Return can only be confirmed on or after the end date (${booking.end_datetime ? new Date(booking.end_datetime).toISOString().split('T')[0] : ''}). ${diffDays} day${diffDays === 1 ? '' : 's'} left until return.`,
      });
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

    const otherUserId = req.userId === booking.borrower_id ? booking.owner_id : booking.borrower_id;
    createNotification(
      otherUserId,
      'rental_booking_disputed',
      'Dispute Raised',
      `A dispute was raised for "${booking.listing_item_name || 'rental item'}": ${description || 'Issue reported.'}`
    ).catch((err) => console.error('Notification error (rental_booking_disputed):', err));

    return res.status(201).json({ success: true, dispute });
  } catch (err) {
    console.error('POST /rental-bookings/:id/dispute error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ── GET /api/rental-bookings/admin/pending-payments ─────────────────────────
// Admin-only: list all rental bookings with payment and seller payout details.
router.get('/admin/pending-payments', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rb.id,
              rb.payment_status,
              rb.payment_utr,
              rb.payment_submitted_at,
              rb.payment_screenshot_url,
              rb.payment_rejection_reason,
              rb.payment_rejected_at,
              rb.payout_status,
              rb.payout_sent_at,
              rb.payout_utr,
              rb.payout_notes,
              spd.upi_id         AS seller_payout_upi,
              spd.account_holder_name AS seller_payout_name,
              rb.agreed_total_amount,
              rb.deposit_amount,
              rb.start_datetime,
              rb.end_datetime,
              rb.created_at,
              rl.item_name,
              u_bor.id         AS borrower_id,
              u_bor.username   AS borrower_username,
              u_bor.full_name  AS borrower_name,
              u_bor.email      AS borrower_email,
              u_own.username   AS owner_username,
              u_own.full_name  AS owner_name
       FROM rental_bookings rb
       JOIN rental_listings rl ON rl.id = rb.rental_listing_id
       JOIN users u_bor ON u_bor.id = rb.borrower_id
       JOIN users u_own ON u_own.id = rb.owner_id
       LEFT JOIN seller_payout_details spd ON spd.entity_type = 'rental_booking' AND spd.entity_id = rb.id
       WHERE rb.payment_status IN ('pending_verification', 'paid')
       ORDER BY CASE WHEN rb.payment_status = 'pending_verification' THEN 0 WHEN rb.payout_status = 'pending_payout' THEN 1 ELSE 2 END,
                rb.payment_submitted_at DESC NULLS LAST, rb.updated_at DESC`
    );

    res.json({ success: true, bookings: result.rows });
  } catch (err) {
    console.error('GET /rental-bookings/admin/pending-payments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/rental-bookings/:id/payment-screenshot ─────────────────────────
// Auth-gated file stream. Allowed: admin OR the borrower who owns this booking.
// Helper to check if user can manage extension for a booking
async function canManageExtension(bookingId, userId) {
  const result = await db.query(
    `SELECT borrower_id, owner_id, status FROM rental_bookings WHERE id = $1`,
    [bookingId]
  );
  if (result.rows.length === 0) return null;
  
  const booking = result.rows[0];
  const isRenter = booking.borrower_id === userId;
  const isOwner = booking.owner_id === userId;
  
  return { booking, isRenter, isOwner };
}

// Calculate extension fee based on listing rate
function calculateExtensionFee(listing, extraDays) {
  const rateType = normalizeRateType(listing.rate_type);
  let durationUnits = extraDays;
  
  if (rateType === 'hourly') {
    durationUnits = extraDays * 24; // Convert days to hours for hourly rate
  }
  
  const baseRate = Number(listing.rate_amount);
  const additionalFee = Number((baseRate * durationUnits).toFixed(2));
  
  return additionalFee;
}

// POST /api/rental-bookings/:id/request-extension - renter requests extension
router.post('/:id/request-extension', requireAuth, requireVerified, async (req, res) => {
  try {
    const { id } = req.params;
    const { extra_days } = req.body;
    
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }
    
    if (!extra_days || extra_days < 1 || extra_days > 30) {
      return res.status(400).json({ error: 'Extra days must be between 1 and 30' });
    }
    
    const permission = await canManageExtension(id, req.userId);
    if (!permission) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const { booking, isRenter } = permission;
    
    if (!isRenter) {
      return res.status(403).json({ error: 'Only the renter can request an extension' });
    }
    
    if (!['active', 'return_pending'].includes(booking.status)) {
      return res.status(400).json({ error: 'Extension can only be requested for active bookings' });
    }
    
    // Get listing details for rate calculation
    const listingRes = await db.query(
      `SELECT rl.* FROM rental_listings rl
       JOIN rental_bookings rb ON rb.rental_listing_id = rl.id
       WHERE rb.id = $1`,
      [id]
    );
    
    if (listingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    const listing = listingRes.rows[0];
    
    // Calculate new end date
    const currentEnd = new Date(booking.end_datetime);
    const newEndDate = new Date(currentEnd);
    newEndDate.setDate(currentEnd.getDate() + parseInt(extra_days));
    
    // Calculate additional fee
    const additionalFee = calculateExtensionFee(listing, parseInt(extra_days));
    
    // Check for existing pending extension request
    const existingRes = await db.query(
      `SELECT id FROM rental_extension_requests 
       WHERE booking_id = $1 AND status = 'pending'`,
      [id]
    );
    
    if (existingRes.rows.length > 0) {
      return res.status(409).json({ error: 'A pending extension request already exists for this booking' });
    }
    
    // Create extension request
    const insertRes = await db.query(
      `INSERT INTO rental_extension_requests (
        booking_id, requested_extra_days, new_end_date, additional_fee
      ) VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, extra_days, newEndDate.toISOString().split('T')[0], additionalFee]
    );
    
    const extensionRequest = insertRes.rows[0];
    
    // Notify owner
    createNotification(
      booking.owner_id,
      'rental_extension_requested',
      'Extension Requested',
      `Renter has requested a ${extra_days}-day extension for rental booking.`
    ).catch(err => console.error('Notification error (extension requested):', err));
    
    res.json({ success: true, extension: extensionRequest });
  } catch (err) {
    console.error('POST /rental-bookings/:id/request-extension error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /api/rental-bookings/:id/extensions - get extension requests for booking
router.get('/:id/extensions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }
    
    const permission = await canManageExtension(id, req.userId);
    if (!permission) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const extensionsRes = await db.query(
      `SELECT * FROM rental_extension_requests 
       WHERE booking_id = $1 
       ORDER BY requested_at DESC`,
      [id]
    );
    
    res.json({ success: true, extensions: extensionsRes.rows });
  } catch (err) {
    console.error('GET /rental-bookings/:id/extensions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/rental-bookings/extensions/:extensionId/respond - owner responds to extension request
router.post('/extensions/:extensionId/respond', requireAuth, requireVerified, async (req, res) => {
  try {
    const { extensionId } = req.params;
    const { action, reason } = req.body; // action: 'approve' or 'decline'
    
    if (!isValidUUID(extensionId)) {
      return res.status(400).json({ error: 'Invalid extension id' });
    }
    
    if (!action || !['approve', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approve" or "decline"' });
    }
    
    // Get extension with booking details
    const extensionRes = await db.query(
      `SELECT er.*, rb.borrower_id, rb.owner_id, rb.status as booking_status,
              rb.end_datetime, rb.agreed_total_amount
       FROM rental_extension_requests er
       JOIN rental_bookings rb ON rb.id = er.booking_id
       WHERE er.id = $1`,
      [extensionId]
    );
    
    if (extensionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Extension request not found' });
    }
    
    const extension = extensionRes.rows[0];
    
    if (extension.owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only the owner can respond to extension requests' });
    }
    
    if (extension.status !== 'pending') {
      return res.status(400).json({ error: 'Extension request already processed' });
    }
    
    if (action === 'approve') {
      // Update extension status to approved
      const updateRes = await db.query(
        `UPDATE rental_extension_requests 
         SET status = 'approved', responded_at = NOW()
         WHERE id = $1 RETURNING *`,
        [extensionId]
      );
      
      const updatedExtension = updateRes.rows[0];
      
      // Notify renter
      createNotification(
        extension.borrower_id,
        'rental_extension_approved',
        'Extension Approved',
        `Owner approved your ${extension.requested_extra_days}-day extension request. Please submit payment for additional fee.`
      ).catch(err => console.error('Notification error (extension approved):', err));
      
      res.json({ success: true, extension: updatedExtension, requiresPayment: true });
    } else {
      // Decline extension
      const updateRes = await db.query(
        `UPDATE rental_extension_requests 
         SET status = 'declined', responded_at = NOW(), response_reason = $1
         WHERE id = $2 RETURNING *`,
        [reason || 'Extension declined by owner', extensionId]
      );
      
      const updatedExtension = updateRes.rows[0];
      
      // Notify renter
      createNotification(
        extension.borrower_id,
        'rental_extension_declined',
        'Extension Declined',
        `Owner declined your extension request.${reason ? ' Reason: ' + reason : ''}`
      ).catch(err => console.error('Notification error (extension declined):', err));
      
      res.json({ success: true, extension: updatedExtension });
    }
  } catch (err) {
    console.error('POST /rental-bookings/extensions/:extensionId/respond error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// POST /api/rental-bookings/extensions/:extensionId/pay - renter pays for approved extension
router.post('/extensions/:extensionId/pay', requireAuth, requireVerified, async (req, res) => {
  try {
    const { extensionId } = req.params;
    
    if (!isValidUUID(extensionId)) {
      return res.status(400).json({ error: 'Invalid extension id' });
    }
    
    // Get extension with booking details
    const extensionRes = await db.query(
      `SELECT er.*, rb.borrower_id, rb.owner_id, rb.agreed_total_amount
       FROM rental_extension_requests er
       JOIN rental_bookings rb ON rb.id = er.booking_id
       WHERE er.id = $1`,
      [extensionId]
    );
    
    if (extensionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Extension request not found' });
    }
    
    const extension = extensionRes.rows[0];
    
    if (extension.borrower_id !== req.userId) {
      return res.status(403).json({ error: 'Only the renter can pay for extension' });
    }
    
    if (extension.status !== 'approved') {
      return res.status(400).json({ error: 'Extension must be approved before payment' });
    }
    
    if (extension.payment_status === 'paid') {
      return res.status(400).json({ error: 'Extension already paid' });
    }
    
    // Return extension payment details (similar to regular booking payment)
    res.json({
      success: true,
      extension,
      paymentDetails: {
        amount: extension.additional_fee,
        description: `Extension fee for ${extension.requested_extra_days} extra day(s)`
      }
    });
  } catch (err) {
    console.error('POST /rental-bookings/extensions/:extensionId/pay error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/rental-bookings/extensions/:extensionId/upload-payment - upload UTR/screenshot for extension
router.post(
  '/extensions/:extensionId/upload-payment',
  requireAuth,
  requireVerified,
  extensionPaymentUpload.single('screenshot'),
  async (req, res) => {
    try {
      const { extensionId } = req.params;
      const { utr } = req.body;
      
      if (!isValidUUID(extensionId)) {
        return res.status(400).json({ error: 'Invalid extension id' });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'Payment screenshot is required' });
      }
      
      if (!utr || utr.trim().length === 0) {
        return res.status(400).json({ error: 'UTR/Transaction ID is required' });
      }
      
      // Get extension with booking details
      const extensionRes = await db.query(
        `SELECT er.*, rb.borrower_id, rb.status as booking_status
         FROM rental_extension_requests er
         JOIN rental_bookings rb ON rb.id = er.booking_id
         WHERE er.id = $1`,
        [extensionId]
      );
      
      if (extensionRes.rows.length === 0) {
        return res.status(404).json({ error: 'Extension request not found' });
      }
      
      const extension = extensionRes.rows[0];
      
      if (extension.borrower_id !== req.userId) {
        return res.status(403).json({ error: 'Only the renter can submit payment' });
      }
      
      if (extension.status !== 'approved') {
        return res.status(400).json({ error: 'Extension must be approved before payment' });
      }
      
      if (extension.payment_status === 'paid') {
        return res.status(400).json({ error: 'Extension already paid' });
      }
      
      // Check for duplicate UTR
      const cleanUtr = String(utr).trim().toUpperCase();
      const dupRes = await db.query(
        `SELECT id FROM rental_extension_requests WHERE payment_utr = $1 AND id != $2`,
        [cleanUtr, extensionId]
      );
      
      if (dupRes.rows.length > 0) {
        return res.status(400).json({ error: 'This UTR has already been used for another payment' });
      }
      
      // Save screenshot path
      const relativePath = path.join('uploads', 'extensions', req.file.filename);
      
      // Update extension with payment info
      const updateRes = await db.query(
        `UPDATE rental_extension_requests 
         SET payment_status = 'pending_verification',
             payment_screenshot_url = $1,
             payment_utr = $2,
             payment_submitted_at = NOW()
         WHERE id = $3 RETURNING *`,
        [relativePath, cleanUtr, extensionId]
      );
      
      const updatedExtension = updateRes.rows[0];
      
      // Notify owner
      createNotification(
        extension.owner_id,
        'rental_extension_payment_submitted',
        'Extension Payment Submitted',
        `Renter submitted payment for ${extension.requested_extra_days}-day extension. Awaiting admin verification.`
      ).catch(err => console.error('Notification error (extension payment):', err));
      
      res.json({ success: true, extension: updatedExtension });
    } catch (err) {
      if (req.file) fs.unlink(req.file.path, () => {});
      console.error('POST /rental-bookings/extensions/:extensionId/upload-payment error:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  }
);

// POST /api/rental-bookings/extensions/:extensionId/confirm-payment - admin verifies extension payment
router.post('/extensions/:extensionId/confirm-payment', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { extensionId } = req.params;
    
    if (!isValidUUID(extensionId)) {
      return res.status(400).json({ error: 'Invalid extension id' });
    }
    
    const client = await db.getClient();
    let updatedExtension;
    
    try {
      await client.query('BEGIN');
      
      // Get extension with booking details
      const extensionRes = await client.query(
        `SELECT er.*, rb.id as booking_id, rb.end_datetime, rb.agreed_total_amount
         FROM rental_extension_requests er
         JOIN rental_bookings rb ON rb.id = er.booking_id
         WHERE er.id = $1 FOR UPDATE`,
        [extensionId]
      );
      
      if (extensionRes.rows.length === 0) {
        throw new Error('Extension request not found');
      }
      
      const extension = extensionRes.rows[0];
      
      if (extension.payment_status !== 'pending_verification') {
        throw new Error('Extension payment is not pending verification');
      }
      
      // Update extension payment status
      const updateExtRes = await client.query(
        `UPDATE rental_extension_requests 
         SET payment_status = 'paid'
         WHERE id = $1 RETURNING *`,
        [extensionId]
      );
      
      updatedExtension = updateExtRes.rows[0];
      
      // Update booking end date and total amount
      const newTotal = Number(extension.agreed_total_amount) + Number(extension.additional_fee);
      
      const updateBookingRes = await client.query(
        `UPDATE rental_bookings 
         SET end_datetime = $1, agreed_total_amount = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [extension.new_end_date, newTotal, extension.booking_id]
      );
      
      // Notify both parties
      const booking = updateBookingRes.rows[0];
      
      createNotification(
        booking.borrower_id,
        'rental_extension_confirmed',
        'Extension Confirmed',
        `Your ${extension.requested_extra_days}-day extension has been confirmed. New end date: ${extension.new_end_date}.`
      ).catch(err => console.error('Notification error (extension confirmed to renter):', err));
      
      createNotification(
        booking.owner_id,
        'rental_extension_confirmed',
        'Extension Confirmed',
        `Rental extension confirmed. Booking now ends on ${extension.new_end_date}.`
      ).catch(err => console.error('Notification error (extension confirmed to owner):', err));
      
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
    
    res.json({ success: true, extension: updatedExtension });
  } catch (err) {
    console.error('POST /rental-bookings/extensions/:extensionId/confirm-payment error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// POST /api/rental-bookings/extensions/:extensionId/reject-payment - admin rejects extension payment
router.post('/extensions/:extensionId/reject-payment', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { extensionId } = req.params;
    const { reason } = req.body;
    
    if (!isValidUUID(extensionId)) {
      return res.status(400).json({ error: 'Invalid extension id' });
    }
    
    const updateRes = await db.query(
      `UPDATE rental_extension_requests 
       SET payment_status = 'rejected',
           payment_rejection_reason = $1,
           payment_rejected_at = NOW()
       WHERE id = $2 RETURNING *`,
      [reason || 'Payment verification failed', extensionId]
    );
    
    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Extension request not found' });
    }
    
    const updatedExtension = updateRes.rows[0];
    
    // Notify renter
    createNotification(
      updatedExtension.borrower_id,
      'rental_extension_payment_rejected',
      'Extension Payment Rejected',
      `Your extension payment was rejected.${reason ? ' Reason: ' + reason : ' Please try again.'}`
    ).catch(err => console.error('Notification error (extension payment rejected):', err));
    
    res.json({ success: true, extension: updatedExtension });
  } catch (err) {
    console.error('POST /rental-bookings/extensions/:extensionId/reject-payment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/payment-screenshot', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid booking id' });
  }

  try {
    const bookingRes = await db.query(
      'SELECT borrower_id, payment_screenshot_url FROM rental_bookings WHERE id = $1',
      [id]
    );
    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingRes.rows[0];

    const adminCheck = await db.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.userId]
    );
    const isAdmin = adminCheck.rows[0]?.is_admin === true;
    const isOwner = booking.borrower_id === req.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Not authorised to view this screenshot' });
    }

    if (!booking.payment_screenshot_url) {
      return res.status(404).json({ error: 'No screenshot on file for this booking' });
    }

    const filePath = path.join(__dirname, '..', booking.payment_screenshot_url);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Screenshot file not found on disk' });
    }

    res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error('GET /rental-bookings/:id/payment-screenshot error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
