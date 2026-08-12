const db = require("../models/db");

module.exports = (io, socket) => {
  socket.on("joinSkillBooking", async (bookingId) => {
    try {
      const result = await db.query(
        'SELECT requester_id, teacher_id FROM skill_bookings WHERE id = $1',
        [bookingId]
      );
      const booking = result.rows[0];
      if (!booking) return;

      const isParticipant =
        booking.requester_id === socket.user.userId || booking.teacher_id === socket.user.userId;
      if (!isParticipant) {
        console.log(`Blocked unauthorized joinSkillBooking attempt: user ${socket.user.userId} on booking ${bookingId}`);
        return;
      }

      socket.join(String(bookingId));
    } catch (err) {
      console.error('joinSkillBooking error:', err);
    }
  });
};