import api from './api';

/**
 * Create a rental booking request for a listing.
 */
export async function createRentalBooking({ rental_listing_id, start_datetime, end_datetime, meeting_location }) {
  const res = await api.post('/rental-bookings', {
    rental_listing_id,
    start_datetime,
    end_datetime,
    meeting_location,
  });
  return res.data;
}

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

export async function getRentalBookingPaymentQr(bookingId) {
  const res = await api.get(`/rental-bookings/${bookingId}/payment-qr`);
  return res.data;
}

export async function uploadRentalBookingPayment(bookingId, screenshotFile, utr) {
  const formData = new FormData();
  formData.append('screenshot', screenshotFile);
  formData.append('utr', utr);

  const res = await api.post(`/rental-bookings/${bookingId}/upload-payment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

// ── Admin functions ───────────────────────────────────────────────────────────

/**
 * Admin: fetch all rental bookings with payment_status = 'pending_verification'.
 */
export async function getAdminPendingRentalPayments() {
  const res = await api.get('/rental-bookings/admin/pending-payments');
  return res.data;
}

/**
 * Admin: confirm a rental payment — sets payment_status = 'paid'.
 */
export async function adminConfirmRentalPayment(bookingId) {
  const res = await api.patch(`/rental-bookings/${bookingId}/confirm-payment`);
  return res.data;
}

/**
 * Admin: reject a rental payment submission — resets to unpaid, notifies renter.
 * @param {string} bookingId
 * @param {string} [reason] - optional explanation shown to renter
 */
export async function adminRejectRentalPayment(bookingId, reason = '') {
  const res = await api.patch(`/rental-bookings/${bookingId}/reject-payment`, { reason });
  return res.data;
}

/**
 * Admin: confirm payout sent to seller/owner — sets payout_status = 'paid_out'.
 */
export async function adminConfirmRentalPayout(bookingId, { payout_utr = '', payout_notes = '' } = {}) {
  const res = await api.patch(`/rental-bookings/${bookingId}/confirm-payout`, { payout_utr, payout_notes });
  return res.data;
}

/**
 * Fetch the rental payment screenshot through the auth-gated endpoint.
 * Returns a temporary blob: URL safe to use as an <img> src.
 * Caller must call URL.revokeObjectURL(url) when no longer needed.
 */
export async function getRentalPaymentScreenshotUrl(bookingId) {
  const res = await api.get(`/rental-bookings/${bookingId}/payment-screenshot`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(res.data);
}


