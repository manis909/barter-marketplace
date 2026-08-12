const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const db = require("../models/db");
const { createNotification } = require("./notifications");

// GET all messages for a skill booking
router.get("/:bookingId", requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await db.query(`SELECT * FROM skill_bookings WHERE id = $1`, [bookingId]);
    const b = booking.rows[0];

    if (!b) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (req.userId !== b.requester_id && req.userId !== b.teacher_id) {
      return res.status(403).json({ message: "Not part of this booking" });
    }

    const result = await db.query(
      `SELECT * FROM skill_messages WHERE booking_id = $1 ORDER BY created_at ASC`,
      [bookingId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch messages", error: error.message });
  }
});

// Send a new message
router.post("/", requireAuth, async (req, res) => {
  try {
    const { booking_id, message } = req.body;
    const sender_id = req.userId;

    if (!message?.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const booking = await db.query(`SELECT * FROM skill_bookings WHERE id = $1`, [booking_id]);
    const b = booking.rows[0];

    if (!b) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (sender_id !== b.requester_id && sender_id !== b.teacher_id) {
      return res.status(403).json({ message: "Not part of this booking" });
    }

    const result = await db.query(
      `INSERT INTO skill_messages (booking_id, sender_id, message) VALUES ($1,$2,$3) RETURNING *`,
      [booking_id, sender_id, message.trim()]
    );

    const newMessage = result.rows[0];

    const io = req.app.get("io");
    if (io) {
      io.to(String(booking_id)).emit("newSkillMessage", newMessage);
    }

    const recipientId = sender_id === b.requester_id ? b.teacher_id : b.requester_id;
    await createNotification(
      recipientId,
      "new_message",
      "New Message",
      "You have a new message in your skill booking chat.",
      booking_id
    );

    res.status(201).json(newMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send message", error: error.message });
  }
});

module.exports = router;