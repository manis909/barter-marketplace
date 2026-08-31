// client/src/services/rentalService.js — Rental Flow API calls
import api from './api';

// ── Listings ──────────────────────────────────────────────────────────────

export async function createRental({ title, description, daily_rate, image_url, item_id }) {
  const res = await api.post('/rentals', {
    title,
    description,
    daily_rate,
    ...(image_url !== undefined && { image_url }),
    ...(item_id !== undefined && { item_id }),
  });
  return res.data; // { success, rental }
}

export async function getMyRentalListings() {
  const res = await api.get('/rentals/mine');
  return res.data; // { success, rentals }
}

/**
 * Fetch the rental listing attached to an item (if any).
 * Used by ItemDetail to decide whether to show "Request to Rent".
 */
export async function getRentalByItem(itemId) {
  const res = await api.get(`/rentals/by-item/${itemId}`);
  return res.data; // { success, rental | null }
}

export async function getRental(rentalId) {
  const res = await api.get(`/rentals/${rentalId}`);
  return res.data; // { success, rental }
}

// ── Requests ──────────────────────────────────────────────────────────────

/**
 * Send a rental request. Client sends ONLY rentalId + daysRequested —
 * the server computes the fee (daily_rate x days) and deposit (15%).
 */
export async function createRentalRequest(rentalId, daysRequested) {
  const res = await api.post(`/rentals/${rentalId}/requests`, {
    days_requested: daysRequested,
  });
  return res.data; // { success, request, breakdown }
}

/** Both roles in one call: { renting: [...], owned: [...] } */
export async function getMyRentals() {
  const res = await api.get('/rentals/my-rentals');
  return res.data;
}

/** Requests I sent as renter (all statuses). */
export async function getMyRentalRequests() {
  const res = await api.get('/rentals/requests/mine');
  return res.data; // { success, requests }
}

/** Incoming requests on my rentals (owner inbox). */
export async function getIncomingRentalRequests() {
  const res = await api.get('/rentals/requests/incoming');
  return res.data; // { success, requests }
}

/** Owner accepts or declines a pending request. status: 'accepted' | 'declined' */
export async function respondToRentalRequest(requestId, status) {
  const res = await api.patch(`/rentals/requests/${requestId}`, { status });
  return res.data; // { success, request }
}

/** Renter withdraws a pending request before it is accepted. */
export async function cancelRentalRequest(requestId) {
  const res = await api.patch(`/rentals/requests/${requestId}/cancel`);
  return res.data; // { success, request }
}

/**
 * Confirm item return (either party). Mirrors the trade double-confirm
 * pattern: each side confirms independently; deposit releases when both true.
 */
export async function confirmRentalReturn(requestId) {
  const res = await api.post(`/rentals/requests/${requestId}/confirm-return`);
  return res.data; // { success, request }
}