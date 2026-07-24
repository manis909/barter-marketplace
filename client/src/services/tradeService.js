// client/src/services/tradeService.js
//
// All HTTP calls for the Trade Flow feature (Member 3).
// Every function uses the shared Axios client from api.js, which
// automatically attaches the JWT and handles 401s centrally.
//
// None of these functions catch errors — they let them propagate so
// the calling component can decide how to display them. Use
// getErrorMessage() from utils/helpers.js to extract a readable string.

import api from './api';

// ─────────────────────────────────────────────────────────────────────────────
// Trade Offers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new trade offer.
 *
 * @param {Object} payload
 * @param {string} payload.offered_item_id   - UUID of an item the sender owns
 * @param {string} payload.requested_item_id - UUID of an item the sender wants
 * @param {string} [payload.message]         - Optional message to the receiver
 * @returns {Promise<{ success: boolean, tradeOffer: Object }>}
 */
export async function createTrade({ offered_item_id, requested_item_id, message }) {
  const res = await api.post('/trades', {
    offered_item_id,
    requested_item_id,
    // Only include message in the body if the caller provided one —
    // avoids sending an explicit `message: undefined` key.
    ...(message !== undefined && { message }),
  });
  return res.data;
}

/**
 * Get all trade offers where the current user is sender or receiver.
 * Results are ordered by most recent first.
 *
 * @returns {Promise<{ success: boolean, trades: Object[] }>}
 */
export async function getMyTrades() {
  const res = await api.get('/trades/mine');
  return res.data;
}

/**
 * Accept a pending trade offer.
 * Only the receiver of the trade can call this.
 *
 * @param {string} tradeId - UUID of the trade offer to accept
 * @returns {Promise<{ success: boolean, tradeOffer: Object }>}
 */
export async function acceptTrade(tradeId) {
  const res = await api.patch(`/trades/${tradeId}`, { status: 'accepted' });
  return res.data;
}

/**
 * Decline a pending trade offer.
 * Only the receiver of the trade can call this.
 *
 * @param {string} tradeId - UUID of the trade offer to decline
 * @returns {Promise<{ success: boolean, tradeOffer: Object }>}
 */
export async function declineTrade(tradeId) {
  const res = await api.patch(`/trades/${tradeId}`, { status: 'declined' });
  return res.data;
}

/**
 * Mark an accepted trade as completed.
 * Either the sender or receiver can call this — both are present at the meetup.
 *
 * @param {string} tradeId - UUID of the trade offer to complete
 * @returns {Promise<{ success: boolean, tradeOffer: Object }>}
 */
export async function completeTrade(tradeId) {
  const res = await api.patch(`/trades/${tradeId}/complete`);
  return res.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Wishlist
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add an item to the current user's wishlist.
 * Safe to call multiple times for the same item — the server is idempotent
 * and returns 200 instead of an error if the item is already wishlisted.
 *
 * @param {string} itemId - UUID of the item to wishlist
 * @returns {Promise<{ success: boolean, wishlistEntry?: Object, message?: string }>}
 */
export async function addWishlist(itemId) {
  const res = await api.post(`/trades/wishlist/${itemId}`);
  return res.data;
}

/**
 * Get all items in the current user's wishlist.
 * Returns a joined shape of wishlists + items, ordered by most recently
 * wishlisted first. See TRADE_API.md for the full WishlistItem shape.
 *
 * @returns {Promise<{ success: boolean, wishlist: Object[] }>}
 */
export async function getWishlist() {
  const res = await api.get('/trades/wishlist');
  return res.data;
}

/**
 * Remove an item from the current user's wishlist.
 *
 * @param {string} itemId - UUID of the item to remove
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function removeWishlist(itemId) {
  const res = await api.delete(`/trades/wishlist/${itemId}`);
  return res.data;
}

