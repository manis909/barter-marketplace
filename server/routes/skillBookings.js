const express = require("express");
const router = express.Router();
const db = require("../models/db");
const requireAuth = require("../middleware/auth");
const { createNotification } = require("./notifications");

// UUID validator
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(val) { return UUID_RE.test(val); }

// ── POST /api/skill-bookings ─────────────────────────────────────────────
// Requester creates a new booking request for a skill listing
router.post("/", requireAuth, async (req, res) => {
  try {
    const { skill_listing_id, scheduled_time, message } = req.body;
    const requester_id = req.userId;

    if (!skill_listing_id || !isValidUUID(skill_listing_id)) {
      return res.status(400).json({ error: "Valid skill_listing_id is required" });
    }

    // Lookup skill listing to get teacher
    const listingRes = await db.query(
      "SELECT teacher_id, skill_name, status FROM skill_listings WHERE id = $1",
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

    // Check for existing active/pending booking for same skill
    const dupCheck = await db.query(
      `SELECT id FROM skill_bookings
       WHERE skill_listing_id = $1 AND requester_id = $2 AND status = 'pending'`,
      [skill_listing_id, requester_id]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ error: "You already have a pending booking request for this skill" });
    }

    const result = await db.query(
      `INSERT INTO skill_bookings (skill_listing_id, requester_id, teacher_id, scheduled_time, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [skill_listing_id, requester_id, teacher_id, scheduled_time || null]
    );

    const booking = result.rows[0];

    // Notify teacher
    createNotification(
      teacher_id,
      "skill_booking",
      "New Skill Booking Request",
      `Someone requested to book a session for "${listing.skill_name}".`
    ).catch(err => console.error("Notification error (skill_booking):", err));

    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error("POST /skill-bookings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/skill-bookings/mine ──────────────────────────────────────────
// Returns all bookings where current user is requester or teacher
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*,
              sl.skill_name,
              sl.description AS skill_description,
              sl.category AS skill_category,
              sl.price_type AS skill_price_type,
              u_req.username AS requester_username,
              u_req.full_name AS requester_name,
              u_req.profile_image AS requester_profile_image,
              u_teach.username AS teacher_username,
              u_teach.full_name AS teacher_name,
              u_teach.profile_image AS teacher_profile_image
       FROM skill_bookings b
       JOIN skill_listings sl ON sl.id = b.skill_listing_id
       JOIN users u_req ON u_req.id = b.requester_id
       JOIN users u_teach ON u_teach.id = b.teacher_id
       WHERE b.requester_id = $1 OR b.teacher_id = $1
       ORDER BY b.created_at DESC`,
      [req.userId]
    );

    res.json({ success: true, bookings: result.rows });
  } catch (err) {
    console.error("GET /skill-bookings/mine error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/skill-bookings/:id ───────────────────────────────────────────
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const bookingId = req.params.id;
    if (!isValidUUID(bookingId)) {
      return res.status(400).json({ error: "Invalid booking id" });
    }

    const result = await db.query(
      `SELECT b.*,
              sl.skill_name,
              sl.description AS skill_description,
              sl.category AS skill_category,
              sl.price_type AS skill_price_type,
              u_req.username AS requester_username,
              u_req.full_name AS requester_name,
              u_teach.username AS teacher_username,
              u_teach.full_name AS teacher_name
       FROM skill_bookings b
       JOIN skill_listings sl ON sl.id = b.skill_listing_id
       JOIN users u_req ON u_req.id = b.requester_id
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

// ── PATCH /api/skill-bookings/:id/status ──────────────────────────────────
// Update booking status: 'accepted', 'declined', 'completed', 'cancelled'
router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;

    if (!isValidUUID(bookingId)) {
      return res.status(400).json({ error: "Invalid booking id" });
    }

    const ALLOWED_STATUSES = ["accepted", "declined", "completed", "cancelled"];
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(", ")}`
      });
    }

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
    const isTeacher = booking.teacher_id === req.userId;
    const isRequester = booking.requester_id === req.userId;

    if (!isTeacher && !isRequester) {
      return res.status(403).json({ error: "You are not authorized to update this booking" });
    }

    // Role-specific permission checks
    if ((status === "accepted" || status === "declined") && !isTeacher) {
      return res.status(403).json({ error: "Only the teacher can accept or decline a booking request" });
    }

    const updatedRes = await db.query(
      `UPDATE skill_bookings SET status = $1 WHERE id = $2 RETURNING *`,
      [status, bookingId]
    );

    const updatedBooking = updatedRes.rows[0];

    // Notify the other user
    const recipientId = isTeacher ? booking.requester_id : booking.teacher_id;
    const statusTitles = {
      accepted: "Booking Accepted!",
      declined: "Booking Declined",
      completed: "Booking Completed",
      cancelled: "Booking Cancelled"
    };

    createNotification(
      recipientId,
      `skill_booking_${status}`,
      statusTitles[status] || "Booking Update",
      `The booking status for "${booking.skill_name}" is now: ${status}.`
    ).catch(err => console.error("Notification error (booking status):", err));

    res.json({ success: true, booking: updatedBooking });
  } catch (err) {
    console.error("PATCH /skill-bookings/:id/status error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
