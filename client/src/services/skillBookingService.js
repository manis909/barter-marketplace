import api from './api';

/**
 * Request a skill booking for a skill listing.
 * @param {string} skillListingId - UUID of the skill listing
 * @param {string} [scheduledTime] - ISO string or date representation
 * @param {string} [message] - Optional note for teacher
 */
export async function createSkillBooking(skillListingId, scheduledTime, message) {
  const res = await api.post('/skill-bookings', {
    skill_listing_id: skillListingId,
    scheduled_time: scheduledTime || null,
    message: message || ''
  });
  return res.data;
}

/**
 * Fetch all skill bookings for the current user (as requester or teacher).
 */
export async function getMySkillBookings() {
  const res = await api.get('/skill-bookings/mine');
  return res.data;
}

/**
 * Fetch all skill bookings and listings for the current user as a teacher.
 */
export async function getMyTeachingBookings() {
  const res = await api.get('/skill-bookings/teaching');
  return res.data;
}

/**
 * Update status of a skill booking ('accepted', 'declined', 'completed', 'cancelled').
 * @param {string} bookingId - UUID of the booking
 * @param {string} status - New status
 */
export async function updateSkillBookingStatus(bookingId, status) {
  const res = await api.patch(`/skill-bookings/${bookingId}/status`, { status });
  return res.data;
}

/**
 * Pay for a reserved skill booking.
 * @param {string} bookingId - UUID of the booking
 */
export async function paySkillBooking(bookingId) {
  const res = await api.patch(`/skill-bookings/${bookingId}/pay`);
  return res.data;
}

