const db = require("../models/db");

module.exports = (io, socket) => {
  // ── Join a rental-booking chat room (with participant check) ──────────────
  socket.on("joinRentalBooking", async (bookingId) => {
    try {
      const result = await db.query(
        "SELECT borrower_id, owner_id FROM rental_bookings WHERE id = $1",
        [bookingId]
      );
      const booking = result.rows[0];
      if (!booking) return;

      const isParticipant =
        booking.borrower_id === socket.user.userId ||
        booking.owner_id    === socket.user.userId;

      if (!isParticipant) {
        console.log(
          `Blocked unauthorized joinRentalBooking: user ${socket.user.userId} on booking ${bookingId}`
        );
        return;
      }

      socket.join(String(bookingId));
    } catch (err) {
      console.error("joinRentalBooking error:", err);
    }
  });

  // ── Read receipts ────────────────────────────────────────────────────────
  // Client emits { bookingId } when it opens a rental-booking chat.
  // We relay a "rentalMessagesRead" event to the other participant so their
  // sent messages can show a blue tick. Mirrors the Skill Chat markSkillRead/skillMessagesRead pair.
  socket.on("markRentalRead", ({ bookingId }) => {
    if (!bookingId) return;
    socket.to(String(bookingId)).emit("rentalMessagesRead", {
      bookingId,
      readBy: socket.user.userId,
    });
  });
};
