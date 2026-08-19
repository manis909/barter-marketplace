const express  = require("express");
const router   = express.Router();
const db       = require("../models/db");
const path     = require("path");
const fs       = require("fs");
const multer   = require("multer");
const requireAuth  = require("../middleware/auth");
const requireVerified = require("../middleware/verified");
const requireAdmin = require("../middleware/admin");
const { createNotification } = require("./notifications");

// UUID validator
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(val) { return UUID_RE.test(val); }

// ── Multer config for payment screenshots ────────────────────────────────────
// Files land in uploads/payment-screenshots/ on disk.
// The folder is NOT in the Express static mount — served only through the
// auth-gated GET /:id/payment-screenshot endpoint below.
const screenshotStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/payment-screenshots");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `booking-${req.params.id}-${Date.now()}${ext}`);
  },
});

const screenshotUpload = multer({
  storage: screenshotStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png"];
    const ext     = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error("Only JPG and PNG files are allowed"));
    }
    cb(null, true);
  },
});

// ── POST /api/skill-bookings ─────────────────────────────────────────────────
// Capacity rule: any number of unpaid reservations allowed.
// Capacity is enforced only at admin-confirm time.
router.post("/", requireAuth, requireVerified, async (req, res) => {
  try {
    const { skill_listing_id, scheduled_time, message } = req.body;
    const requester_id = req.userId;

    if (!skill_listing_id || !isValidUUID(skill_listing_id)) {
      return res.status(400).json({ error: "Valid skill_listing_id is required" });
    }

    const listingRes = await db.query(
      "SELECT teacher_id, skill_name, status, max_participants FROM skill_listings WHERE id = $1",
      [skill_listing_id]
    );

    if (listingRes.rows.length === 0) {
      return res.status(404).json({ error: "Skill listing not found" });
    }

    const listing = listingRes.rows[0];
    if (listing.status !== "active") {
      return res.status(400).json({ error: "This skill listing is currently not active" });
    }

    const teacher_id = listing.teacher_id;
    if (teacher_id === requester_id) {
      return res.status(400).json({ error: "You cannot book your own skill listing" });
    }

    // Duplicate check
    const dupCheck = await db.query(
      `SELECT id FROM skill_bookings
       WHERE skill_listing_id = $1 AND requester_id = $2 AND status IN ('pending', 'accepted')`,
      [skill_listing_id, requester_id]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ error: "You already have an active request for this session" });
    }

    const result = await db.query(
      `INSERT INTO skill_bookings (skill_listing_id, requester_id, teacher_id, scheduled_time, status, payment_status)
       VALUES ($1, $2, $3, $4, 'pending', 'unpaid')
       RETURNING *`,
      [skill_listing_id, requester_id, teacher_id, scheduled_time || null]
    );

    const booking = result.rows[0];

    createNotification(
      teacher_id,
      "skill_booking",
      "New Skill Reservation",
      `Someone reserved a spot for "${listing.skill_name}". Once they pay, the booking will be confirmed.`
    ).catch(err => console.error("Notification error (skill_booking):", err));

    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error("POST /skill-bookings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/skill-bookings/mine ─────────────────────────────────────────────
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*,
              sl.skill_name,
              sl.description  AS skill_description,
              sl.category     AS skill_category,
              sl.price_type   AS skill_price_type,
              sl.session_type,
              sl.max_participants,
              sl.image_urls   AS skill_image_urls,
              COALESCE(sl.max_participants, 0) - COALESCE(paid_counts.paid_count, 0) AS spots_left,
              u_req.username   AS requester_username,
              u_req.full_name  AS requester_name,
              u_req.profile_image AS requester_profile_image,
              u_teach.username AS teacher_username,
              u_teach.full_name AS teacher_name,
              u_teach.profile_image AS teacher_profile_image
       FROM skill_bookings b
       JOIN skill_listings sl ON sl.id = b.skill_listing_id
       LEFT JOIN (
         SELECT skill_listing_id, COUNT(*) AS paid_count
         FROM skill_bookings
         WHERE payment_status = 'paid'
         GROUP BY skill_listing_id
       ) paid_counts ON paid_counts.skill_listing_id = b.skill_listing_id
       JOIN users u_req   ON u_req.id  = b.requester_id
       JOIN users u_teach ON u_teach.id = b.teacher_id
       WHERE b.requester_id = $1
       ORDER BY b.created_at DESC`,
      [req.userId]
    );

    res.json({ success: true, bookings: result.rows });
  } catch (err) {
    console.error("GET /skill-bookings/mine error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/skill-bookings/teaching ─────────────────────────────────────────
router.get("/teaching", requireAuth, async (req, res) => {
  try {
    const listingsRes = await db.query(
      `SELECT s.*,
              COALESCE(s.max_participants, 0) - COALESCE(paid_counts.paid_count, 0) AS spots_left,
              COALESCE(paid_counts.paid_count, 0) AS accepted_count,
              COALESCE(pending_counts.pending_count, 0) AS pending_count
       FROM skill_listings s
       LEFT JOIN (
         SELECT skill_listing_id, COUNT(*) AS paid_count
         FROM skill_bookings
         WHERE payment_status = 'paid'
         GROUP BY skill_listing_id
       ) paid_counts ON paid_counts.skill_listing_id = s.id
       LEFT JOIN (
         SELECT skill_listing_id, COUNT(*) AS pending_count
         FROM skill_bookings
         WHERE payment_status = 'unpaid' AND status != 'cancelled' AND status != 'declined'
         GROUP BY skill_listing_id
       ) pending_counts ON pending_counts.skill_listing_id = s.id
       WHERE s.teacher_id = $1
       GROUP BY s.id, paid_counts.paid_count, pending_counts.pending_count
       ORDER BY s.created_at DESC`,
      [req.userId]
    );

    const bookingsRes = await db.query(
      `SELECT b.*,
              u.username      AS learner_username,
              u.full_name     AS learner_name,
              u.profile_image AS learner_profile_image
       FROM skill_bookings b
       JOIN users u ON u.id = b.requester_id
       WHERE b.teacher_id = $1
       ORDER BY b.created_at DESC`,
      [req.userId]
    );

    res.json({
      success: true,
      listings: listingsRes.rows,
      bookings: bookingsRes.rows,
    });
  } catch (err) {
    console.error("GET /skill-bookings/teaching error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/skill-bookings/admin/pending-payments ───────────────────────────
// Admin-only: list all bookings awaiting payment verification.
router.get("/admin/pending-payments", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.id,
              b.payment_status,
              b.payment_utr,
              b.payment_submitted_at,
              b.payment_screenshot_url,
              b.payment_rejection_reason,
              b.payment_rejected_at,
              b.created_at,
              sl.skill_name,
              sl.price_type,
              u_req.id         AS learner_id,
              u_req.username   AS learner_username,
              u_req.full_name  AS learner_name,
              u_req.email      AS learner_email,
              u_teach.username AS teacher_username,
              u_teach.full_name AS teacher_name
       FROM skill_bookings b
       JOIN skill_listings sl ON sl.id = b.skill_listing_id
       JOIN users u_req   ON u_req.id  = b.requester_id
       JOIN users u_teach ON u_teach.id = b.teacher_id
       WHERE b.payment_status = 'pending_verification'
       ORDER BY b.payment_submitted_at ASC`,
    );

    res.json({ success: true, bookings: result.rows });
  } catch (err) {
    console.error("GET /skill-bookings/admin/pending-payments error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/skill-bookings/:id ───────────────────────────────────────────────
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const bookingId = req.params.id;
    if (!isValidUUID(bookingId)) {
      return res.status(400).json({ error: "Invalid booking id" });
    }

    const result = await db.query(
      `SELECT b.*,
              sl.skill_name,
              sl.description  AS skill_description,
              sl.category     AS skill_category,
              sl.price_type   AS skill_price_type,
              sl.session_type,
              sl.max_participants,
              COALESCE(sl.max_participants, 0) - COALESCE(paid_counts.paid_count, 0) AS spots_left,
              u_req.username  AS requester_username,
              u_req.full_name AS requester_name,
              u_teach.username AS teacher_username,
              u_teach.full_name AS teacher_name
       FROM skill_bookings b
       JOIN skill_listings sl ON sl.id = b.skill_listing_id
       LEFT JOIN (
         SELECT skill_listing_id, COUNT(*) AS paid_count
         FROM skill_bookings
         WHERE payment_status = 'paid'
         GROUP BY skill_listing_id
       ) paid_counts ON paid_counts.skill_listing_id = b.skill_listing_id
       JOIN users u_req   ON u_req.id  = b.requester_id
       JOIN users u_teach ON u_teach.id = b.teacher_id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = result.rows[0];
    if (booking.requester_id !== req.userId && booking.teacher_id !== req.userId) {
      return res.status(403).json({ error: "You are not part of this booking" });
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error("GET /skill-bookings/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/skill-bookings/:id/payment-screenshot ───────────────────────────
// Auth-gated file stream.
// Allowed: (a) admin, OR (b) the learner who owns this specific booking.
// Any other authenticated user → 403 before the file path is read.
router.get("/:id/payment-screenshot", requireAuth, async (req, res) => {
  const bookingId = req.params.id;
  if (!isValidUUID(bookingId)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  try {
    const bookingRes = await db.query(
      "SELECT requester_id, payment_screenshot_url FROM skill_bookings WHERE id = $1",
      [bookingId]
    );
    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = bookingRes.rows[0];

    // Ownership check: admin OR exact requester_id match on this booking row
    const adminCheck = await db.query(
      "SELECT is_admin FROM users WHERE id = $1",
      [req.userId]
    );
    const isAdmin = adminCheck.rows[0]?.is_admin === true;
    const isOwner = booking.requester_id === req.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Not authorised to view this screenshot" });
    }

    if (!booking.payment_screenshot_url) {
      return res.status(404).json({ error: "No screenshot on file for this booking" });
    }

    const filePath = path.join(__dirname, "..", booking.payment_screenshot_url);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Screenshot file not found on disk" });
    }

    res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error("GET /skill-bookings/:id/payment-screenshot error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── PATCH /api/skill-bookings/:id/status ──────────────────────────────────────
router.patch("/:id/status", requireAuth, requireVerified, async (req, res) => {
  const bookingId = req.params.id;
  const { status } = req.body;

  if (!isValidUUID(bookingId)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const ALLOWED_STATUSES = ["accepted", "declined", "completed", "cancelled"];
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(", ")}`,
    });
  }

  const pgClient = await db.getClient();
  try {
    await pgClient.query("BEGIN");

    const bookingRes = await pgClient.query(
      `SELECT b.*, sl.skill_name, sl.max_participants
       FROM skill_bookings b
       JOIN skill_listings sl ON sl.id = b.skill_listing_id
       WHERE b.id = $1
       FOR UPDATE`,
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      await pgClient.query("ROLLBACK");
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking     = bookingRes.rows[0];
    const isTeacher   = booking.teacher_id   === req.userId;
    const isRequester = booking.requester_id === req.userId;

    if (!isTeacher && !isRequester) {
      await pgClient.query("ROLLBACK");
      return res.status(403).json({ error: "You are not authorized to update this booking" });
    }

    if ((status === "accepted" || status === "declined") && !isTeacher) {
      await pgClient.query("ROLLBACK");
      return res.status(403).json({ error: "Only the teacher can accept or decline a booking request" });
    }

    if (status === "accepted") {
      const countRes = await pgClient.query(
        "SELECT COUNT(*) FROM skill_bookings WHERE skill_listing_id = $1 AND status = 'accepted'",
        [booking.skill_listing_id]
      );
      const currentAccepted = parseInt(countRes.rows[0].count, 10);
      if (currentAccepted >= booking.max_participants) {
        await pgClient.query("ROLLBACK");
        return res.status(400).json({ error: "Session is already full — cannot accept more learners" });
      }
    }

    const updatedRes = await pgClient.query(
      `UPDATE skill_bookings
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, bookingId]
    );

    await pgClient.query("COMMIT");

    const updatedBooking = updatedRes.rows[0];
    const recipientId    = isTeacher ? booking.requester_id : booking.teacher_id;
    const statusTitles   = {
      accepted:  "Booking Accepted!",
      declined:  "Booking Declined",
      completed: "Booking Completed",
      cancelled: "Booking Cancelled",
    };

    createNotification(
      recipientId,
      `skill_booking_${status}`,
      statusTitles[status] || "Booking Update",
      `The booking status for "${booking.skill_name}" is now: ${status}.`
    ).catch(err => console.error("Notification error (booking status):", err));

    res.json({ success: true, booking: updatedBooking });
  } catch (err) {
    await pgClient.query("ROLLBACK").catch(() => {});
    console.error("PATCH /skill-bookings/:id/status error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    pgClient.release();
  }
});

// ── POST /api/skill-bookings/:id/upload-payment ──────────────────────────────
// Learner uploads a UPI payment screenshot + UTR reference.
// Sets payment_status = 'pending_verification'. Does NOT set 'paid'.
router.post(
  "/:id/upload-payment",
  requireAuth,
  requireVerified,
  screenshotUpload.single("screenshot"),
  async (req, res) => {
    const bookingId = req.params.id;
    if (!isValidUUID(bookingId)) {
      return res.status(400).json({ error: "Invalid booking id" });
    }

    // Multer file-type error surfaces here
    if (!req.file) {
      return res.status(400).json({ error: "A payment screenshot (jpg/png, max 5 MB) is required" });
    }

    const { utr } = req.body;
    if (!utr || utr.trim().length < 6) {
      // Clean up the uploaded file since we're rejecting the request
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: "UTR / transaction reference must be at least 6 characters" });
    }
    const cleanUtr = utr.trim().toUpperCase();

    try {
      const bookingRes = await db.query(
        `SELECT b.*, sl.skill_name FROM skill_bookings b
         JOIN skill_listings sl ON sl.id = b.skill_listing_id
         WHERE b.id = $1`,
        [bookingId]
      );
      if (bookingRes.rows.length === 0) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ error: "Booking not found" });
      }

      const booking = bookingRes.rows[0];

      if (booking.requester_id !== req.userId) {
        fs.unlink(req.file.path, () => {});
        return res.status(403).json({ error: "Only the reservation owner can submit payment" });
      }

      if (booking.payment_status === "paid") {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: "This booking is already confirmed" });
      }

      if (booking.payment_status === "pending_verification") {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: "A payment is already pending verification for this booking. Wait for admin review before re-submitting." });
      }

      // Check for duplicate UTR across all bookings (partial unique index covers this)
      const dupUtr = await db.query(
        "SELECT id FROM skill_bookings WHERE payment_utr = $1 AND id != $2",
        [cleanUtr, bookingId]
      );
      if (dupUtr.rows.length > 0) {
        fs.unlink(req.file.path, () => {});
        return res.status(409).json({
          error: "This transaction reference (UTR) has already been used on another booking. Each payment must have a unique UTR.",
        });
      }

      // Relative path stored in DB (relative to server root) so it's portable
      const relPath = path.relative(
        path.join(__dirname, ".."),
        req.file.path
      ).replace(/\\/g, "/");

      await db.query(
        `UPDATE skill_bookings
         SET payment_status          = 'pending_verification',
             payment_screenshot_url  = $1,
             payment_utr             = $2,
             payment_submitted_at    = NOW(),
             payment_rejection_reason = NULL,
             payment_rejected_at     = NULL,
             updated_at              = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [relPath, cleanUtr, bookingId]
      );

      // Notify admin (teacher here acts as the review point; a dedicated admin
      // notification can be wired to a specific admin user id if needed)
      createNotification(
        booking.teacher_id,
        "payment_submitted",
        "New Payment Submission",
        `A learner submitted a payment screenshot for "${booking.skill_name}" — review it in the admin dashboard.`
      ).catch(err => console.error("Notification error (payment_submitted):", err));

      res.json({
        success: true,
        message: "Payment submitted — your reservation is pending verification.",
      });
    } catch (err) {
      // Clean up file on unexpected DB error
      if (req.file) fs.unlink(req.file.path, () => {});
      console.error("POST /skill-bookings/:id/upload-payment error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ── PATCH /api/skill-bookings/:id/confirm-payment ────────────────────────────
// Admin-only: verify screenshot, confirm payment, lock capacity.
// Moves the row-lock capacity guard here (was in old /pay endpoint).
router.patch("/:id/confirm-payment", requireAuth, requireAdmin, async (req, res) => {
  const bookingId = req.params.id;
  if (!isValidUUID(bookingId)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const pgClient = await db.getClient();
  try {
    await pgClient.query("BEGIN");

    // Lock the booking row
    const bookingRes = await pgClient.query(
      `SELECT b.*, sl.skill_name, sl.max_participants
       FROM skill_bookings b
       JOIN skill_listings sl ON sl.id = b.skill_listing_id
       WHERE b.id = $1
       FOR UPDATE`,
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      await pgClient.query("ROLLBACK");
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = bookingRes.rows[0];

    if (booking.payment_status !== "pending_verification") {
      await pgClient.query("ROLLBACK");
      return res.status(400).json({
        error: `Cannot confirm — booking payment_status is '${booking.payment_status}', expected 'pending_verification'.`,
      });
    }

    // Capacity check under lock
    const countRes = await pgClient.query(
      `SELECT COUNT(*) FROM skill_bookings
       WHERE skill_listing_id = $1 AND payment_status = 'paid'`,
      [booking.skill_listing_id]
    );
    const paidCount = parseInt(countRes.rows[0].count, 10);

    if (paidCount >= booking.max_participants) {
      await pgClient.query("ROLLBACK");
      return res.status(409).json({
        error: "Session is full. Cannot confirm — refund the learner manually outside the app.",
      });
    }

    // Confirm: set paid + accepted
    const updatedRes = await pgClient.query(
      `UPDATE skill_bookings
       SET payment_status = 'paid',
           status         = 'accepted',
           updated_at     = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [bookingId]
    );

    await pgClient.query("COMMIT");
    const updatedBooking = updatedRes.rows[0];

    // Dual notification: teacher + learner
    createNotification(
      booking.teacher_id,
      "skill_booking_paid_teacher",
      "Booking Confirmed!",
      `Someone's payment for "${booking.skill_name}" has been verified. The booking is now confirmed.`
    ).catch(err => console.error("Notification error (confirm teacher):", err));

    createNotification(
      booking.requester_id,
      "skill_booking_paid_learner",
      "Booking Confirmed!",
      `Your payment for "${booking.skill_name}" has been verified. Your booking is now confirmed.`
    ).catch(err => console.error("Notification error (confirm learner):", err));

    res.json({ success: true, booking: updatedBooking });
  } catch (err) {
    await pgClient.query("ROLLBACK").catch(() => {});
    console.error("PATCH /skill-bookings/:id/confirm-payment error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    pgClient.release();
  }
});

// ── PATCH /api/skill-bookings/:id/reject-payment ─────────────────────────────
// Admin-only: reject a payment submission.
// Does NOT clear payment_screenshot_url or payment_utr — evidence is preserved.
// Writes rejection reason + timestamp, resets payment_status to 'unpaid'.
router.patch("/:id/reject-payment", requireAuth, requireAdmin, async (req, res) => {
  const bookingId = req.params.id;
  if (!isValidUUID(bookingId)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  const reason = (req.body.reason || "").trim() || null;

  try {
    const bookingRes = await db.query(
      `SELECT b.*, sl.skill_name
       FROM skill_bookings b
       JOIN skill_listings sl ON sl.id = b.skill_listing_id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = bookingRes.rows[0];

    if (booking.payment_status !== "pending_verification") {
      return res.status(400).json({
        error: `Cannot reject — booking payment_status is '${booking.payment_status}', expected 'pending_verification'.`,
      });
    }

    // Preserve screenshot_url + utr; only write rejection metadata + reset status
    const updatedRes = await db.query(
      `UPDATE skill_bookings
       SET payment_status          = 'unpaid',
           payment_rejection_reason = $1,
           payment_rejected_at     = NOW(),
           updated_at              = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [reason, bookingId]
    );

    // Notify learner to re-submit
    const reasonSuffix = reason ? ` (${reason})` : "";
    createNotification(
      booking.requester_id,
      "payment_rejected",
      "Payment Not Verified",
      `Your payment for "${booking.skill_name}" could not be verified${reasonSuffix}. Please re-submit your screenshot.`
    ).catch(err => console.error("Notification error (payment rejected):", err));

    res.json({ success: true, booking: updatedRes.rows[0] });
  } catch (err) {
    console.error("PATCH /skill-bookings/:id/reject-payment error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
