// client/src/services/rentalService.js — Rental Flow API calls
import api from './api';

// ── Listings ──────────────────────────────────────────────────────────────

/**
 * Create a new rental listing.
 * Fields must match the sanctioned rental_listings table and the POST /api/rental-listings handler.
 */
export async function createRental({ item_name, description, category, image_urls, rate_type, rate_amount }) {
  const res = await api.post('/rental-listings', {
    item_name,
    description,
    category,
    image_urls: Array.isArray(image_urls) ? image_urls : [],
    rate_type,
    rate_amount,
  });
  return res.data; // { rental }
}

/** Get all rental listings owned by the current user. */
export async function getMyRentalListings() {
  const res = await api.get('/rental-listings/mine');
  return res.data; // { rentals }
}

/** Get a single rental listing by ID (public). */
export async function getRental(rentalId) {
  const res = await api.get(`/rentals/${rentalId}`);
  return res.data; // { rental }
}

/** Get all publicly available rental listings. Supports ?category= and ?search= */
export async function getRentals({ category, search } = {}) {
  const params = {};
  if (category) params.category = category;
  if (search) params.search = search;
  const res = await api.get('/rentals', { params });
  return res.data; // { rentals }
}

/** Update a rental listing (owner only). */
export async function updateRental(rentalId, payload) {
  const res = await api.put(`/rentals/${rentalId}`, payload);
  return res.data; // { rental }
}

/** Delete a rental listing (owner only). */
export async function deleteRental(rentalId) {
  const res = await api.delete(`/rentals/${rentalId}`);
  return res.data; // { message }
}

// ── Booking flow — NOT YET IMPLEMENTED on the server ─────────────────────
//
// The routes below are stubs for the rental_bookings flow that will be built
// in a later sprint. The server currently has no /rentals/requests/* or
// /rentals/my-rentals endpoints. MyRentals.jsx and RentalRequests.jsx catch
// the resulting 404 errors gracefully and show an empty state.
//
// DO NOT call these from UI until the booking endpoints are added to
// server/routes/rentals.js and the rental_bookings table is in use.

/** Both roles in one call: { renting: [...], owned: [...] } */
export async function getMyRentals() {
  const res = await api.get('/rentals/my-rentals');
  return res.data;
}

/** Requests I sent as renter (all statuses). */
export async function getMyRentalRequests() {
  const res = await api.get('/rentals/requests/mine');
  return res.data; // { requests }
}

/** Incoming requests on my rentals (owner inbox). */
export async function getIncomingRentalRequests() {
  const res = await api.get('/rentals/requests/incoming');
  return res.data; // { requests }
}

/**
 * Send a rental request for a listing.
 * Body: { days_requested, start_date, meeting_location } — amounts computed server-side.
 */
export async function createRentalRequest(rentalId, requestData) {
  const res = await api.post(`/rentals/${rentalId}/requests`, requestData);
  return res.data; // { request, breakdown }
}

/** Owner accepts or declines a pending request. status: 'accepted' | 'declined' */
export async function respondToRentalRequest(requestId, status) {
  const res = await api.patch(`/rentals/requests/${requestId}`, { status });
  return res.data; // { request }
}

/** Renter withdraws a pending request before it is accepted. */
export async function cancelRentalRequest(requestId) {
  const res = await api.patch(`/rentals/requests/${requestId}/cancel`);
  return res.data; // { request }
}

/** Renter gets payment info for QR generation (Skills-style). */
export async function getRentalPaymentInfo(requestId) {
  const res = await api.post(`/rentals/requests/${requestId}/pay`);
  return res.data; // { amount, fee, deposit, title, upiInfo }
}

/** Renter uploads UPI payment proof (Skills-style). */
export async function uploadRentalPayment(requestId, screenshotFile, utr) {
  const formData = new FormData();
  formData.append('screenshot', screenshotFile);
  formData.append('utr', utr);

  const res = await api.post(`/rentals/requests/${requestId}/upload-payment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data; // { success, message }
}

/** Renter initiates payment (for backward compatibility - calls getRentalPaymentInfo) */
export async function payRentalRequest(requestId) {
  return getRentalPaymentInfo(requestId);
}

/** Admin confirms rental payment (Skills-style). */
export async function confirmRentalPayment(requestId) {
  const res = await api.patch(`/rentals/requests/${requestId}/confirm-payment`);
  return res.data; // { request, message }
}

/**
 * Confirm item pickup (either party). Both sides must confirm before
 * the rental becomes active.
 */
export async function confirmRentalPickup(requestId) {
  const res = await api.post(`/rentals/requests/${requestId}/confirm-pickup`);
  return res.data; // { request }
}

/**
 * Confirm item return (either party). Both sides must confirm before
 * the booking is marked complete.
 */
export async function confirmRentalReturn(requestId) {
  const res = await api.post(`/rentals/requests/${requestId}/confirm-return`);
  return res.data; // { request }
}
