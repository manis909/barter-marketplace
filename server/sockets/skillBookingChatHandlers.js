const db = require("../models/db");

module.exports = (io, socket) => {
  // ── Join a skill-booking chat room (with participant check) ──────────────
  socket.on("joinSkillBooking", async (bookingId) => {
    try {
      const result = await db.query(
        "SELECT requester_id, teacher_id FROM skill_bookings WHERE id = $1",
        [bookingId]
      );
      const booking = result.rows[0];
      if (!booking) return;

      const isParticipant =
        booking.requester_id === socket.user.userId ||
        booking.teacher_id   === socket.user.userId;

      if (!isParticipant) {
        console.log(
          `Blocked unauthorized joinSkillBooking: user ${socket.user.userId} on booking ${bookingId}`
        );
        return;
      }

      socket.join(String(bookingId));
    } catch (err) {
      console.error("joinSkillBooking error:", err);
    }
  });

  // ── Read receipts ────────────────────────────────────────────────────────
  // Client emits { bookingId } when it opens a skill-booking chat.
  // We relay a "skillMessagesRead" event to the other participant so their
  // sent messages can show a blue tick.  Mirrors the Barter markRead/messagesRead pair.
  socket.on("markSkillRead", ({ bookingId }) => {
    if (!bookingId) return;
    socket.to(String(bookingId)).emit("skillMessagesRead", {
      bookingId,
      readBy: socket.user.userId,
    });
  });
};
