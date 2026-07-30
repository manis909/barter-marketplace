// client/src/services/tradeService.js — Member 3 Trade Flow API calls
import api from './api';

// ── Trade offers ──────────────────────────────────────────────────────────

export async function createTrade({ offered_item_id, requested_item_id, message }) {
  const res = await api.post('/trades', {
    offered_item_id, requested_item_id,
    ...(message !== undefined && { message }),
  });
  return res.data;
}

export async function getMyTrades() {
  const res = await api.get('/trades/mine');
  return res.data;
}

/**
 * Fetch a single trade by ID.
 * Used to verify trade status before allowing completion in Chat.
 */
export async function getTrade(tradeId) {
  const res = await api.get(`/trades/${tradeId}`);
  return res.data;
}

export async function acceptTrade(tradeId) {
  const res = await api.patch(`/trades/${tradeId}`, { status: 'accepted' });
  return res.data;
}

export async function declineTrade(tradeId) {
  const res = await api.patch(`/trades/${tradeId}`, { status: 'declined' });
  return res.data;
}

/**
 * Mark an accepted trade as completed.
 * Calls the /confirm endpoint to participate in the two-user confirmation flow.
 */
export async function completeTrade(tradeId) {
  const res = await api.patch(`/trades/${tradeId}/confirm`);
  return res.data;
}

export async function confirmTrade(tradeId) {
  const res = await api.patch(`/trades/${tradeId}/confirm`);
  return res.data;
}

export async function requestMoreItems(tradeId, counterNote) {
  const res = await api.patch(`/trades/${tradeId}/request-more`, { counter_note: counterNote });
  return res.data;
}

export async function getTradeEvents(tradeId) {
  const res = await api.get(`/trades/${tradeId}/events`);
  return res.data;
}

/**
 * Returns the full list of offered items for a trade: the original
 * offered_item_id PLUS any extra items added via trade_offer_items.
 * Both joined to items — use this wherever "offered items" are displayed.
 */
export async function getTradeItems(tradeId) {
  const res = await api.get(`/trades/${tradeId}/items`);
  return res.data; // { success, offeredItems: [...] }
}

/**
 * Sender calls this when needs_more_items = true.
 * itemIds: string[] — UUIDs of additional items the sender owns.
 * Inserts into trade_offer_items, resets needs_more_items/counter_note.
 */
export async function addItemsToTrade(tradeId, itemIds) {
  const res = await api.post(`/trades/${tradeId}/add-items`, { item_ids: itemIds });
  return res.data; // { success, tradeOffer }
}

/**
 * Cancel a pending trade offer (sender only).
 * Sets status to 'cancelled'. Only works while trade is still pending.
 */
export async function cancelTrade(tradeId) {
  const res = await api.patch(`/trades/${tradeId}/cancel`);
  return res.data;
}

// ── Wishlist ──────────────────────────────────────────────────────────────

export async function addWishlist(itemId) {
  const res = await api.post(`/trades/wishlist/${itemId}`);
  return res.data;
}

export async function getWishlist() {
  const res = await api.get('/trades/wishlist');
  return res.data;
}

export async function removeWishlist(itemId) {
  const res = await api.delete(`/trades/wishlist/${itemId}`);
  return res.data;
}
