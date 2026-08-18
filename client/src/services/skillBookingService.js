import api from './api';

/**
 * Request a skill booking for a skill listing.
 */
export async function createSkillBooking(skillListingId, scheduledTime, message) {
  const res = await api.post('/skill-bookings', {
    skill_listing_id: skillListingId,
    scheduled_time: scheduledTime || null,
    message: message || '',
  });
  return res.data;
}

/**
 * Fetch all skill bookings for the current user (as learner).
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
 */
export async function updateSkillBookingStatus(bookingId, status) {
  const res = await api.patch(`/skill-bookings/${bookingId}/status`, { status });
  return res.data;
}

/**
 * Submit a UPI payment screenshot + UTR reference for a booking.
 * Sets payment_status = 'pending_verification' (NOT 'paid').
 * @param {string} bookingId
 * @param {File}   screenshotFile  - jpg/png, max 5 MB
 * @param {string} utr             - transaction reference, min 6 chars
 */
export async function submitUpiPayment(bookingId, screenshotFile, utr) {
  const formData = new FormData();
  formData.append('screenshot', screenshotFile);
  formData.append('utr', utr);

  const res = await api.post(`/skill-bookings/${bookingId}/upload-payment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/**
 * Fetch the payment screenshot for a booking through the auth-gated endpoint.
 * Returns a temporary blob: URL safe to use as an <img> src.
 * Caller must call URL.revokeObjectURL(url) when the image is no longer needed.
 *
 * Allowed: admin or the learner who owns the booking — server enforces this.
 */
export async function getPaymentScreenshotUrl(bookingId) {
  const res = await api.get(`/skill-bookings/${bookingId}/payment-screenshot`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(res.data);
}

// ── Admin functions ───────────────────────────────────────────────────────────

/**
 * Admin: fetch all bookings with payment_status = 'pending_verification'.
 */
export async function getAdminPendingPayments() {
  const res = await api.get('/skill-bookings/admin/pending-payments');
  return res.data;
}

/**
 * Admin: confirm a payment — runs capacity check under row-lock, sets paid + accepted.
 */
export async function adminConfirmPayment(bookingId) {
  const res = await api.patch(`/skill-bookings/${bookingId}/confirm-payment`);
  return res.data;
}

/**
 * Admin: reject a payment submission — preserves screenshot/UTR evidence,
 * writes rejection reason, resets to unpaid, notifies learner.
 * @param {string} bookingId
 * @param {string} [reason] - optional explanation shown to learner
 */
export async function adminRejectPayment(bookingId, reason = '') {
  const res = await api.patch(`/skill-bookings/${bookingId}/reject-payment`, { reason });
  return res.data;
}

/**
 * Fetch hidden skill booking chat IDs for the current user.
 * Returns an array of booking IDs that have been hidden.
 */
export async function getHiddenSkillBookingIds() {
  const res = await api.get('/skill-bookings/hidden/mine');
  return res.data;
}

/**
 * Hide a skill booking chat from the current user's chat list.
 * The booking is not deleted; it's just hidden from view.
 * @param {string} bookingId
 */
export async function hideSkillBookingChat(bookingId) {
  const res = await api.delete(`/skill-bookings/${bookingId}/for-me`);
  return res.data;
}
