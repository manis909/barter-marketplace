import api from './api';

/**
 * Fetch all rental bookings for the current user (as borrower or owner).
 */
export async function getMyRentalBookings() {
  const res = await api.get('/rental-bookings/mine');
  return res.data;
}

/**
 * Fetch hidden rental booking chat IDs for the current user.
 * Returns an array of booking IDs that have been hidden.
 */
export async function getHiddenRentalBookingIds() {
  const res = await api.get('/rental-bookings/hidden/mine');
  return res.data;
}

/**
 * Hide a rental booking chat from the current user's chat list.
 * The booking is not deleted; it's just hidden from view.
 * @param {string} bookingId
 */
export async function hideRentalBookingChat(bookingId) {
  const res = await api.delete(`/rental-bookings/${bookingId}/for-me`);
  return res.data;
}
