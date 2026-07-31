// client/src/utils/constants.js
//
// Shared constants used across features. If a value appears in more
// than one file (a status string, a route path, a limit), it belongs
// here — not copy-pasted in each component.

// Matches the CHECK constraints in the DB schema exactly.
// If these ever drift out of sync with schema.sql, bugs happen.
export const ITEM_STATUS = {
  AVAILABLE: 'available',
  PENDING: 'pending',
  TRADED: 'traded',
};

export const ITEM_CONDITION = {
  NEW: 'new',
  LIKE_NEW: 'like_new',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
};

export const TRADE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  // ── Proof-based completion flow (Member 3 + Admin) ──────────────────────
  // Set by backend after trade is accepted and before admin reviews.
  PROOF_PENDING: 'proof_pending',               // accepted, no proof yet
  AWAITING_ADMIN_VERIFICATION: 'awaiting_admin_verification', // both proofs in
  REJECTED: 'rejected',                          // admin rejected after review
};

// Frontend route paths — import these instead of hardcoding strings
// in <Link to="..."> or navigate() calls, so a route rename only
// needs one edit.
export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  PROFILE: '/profile',
  EXPLORE: '/explore',
  MY_LISTINGS: '/my-listings',
  MY_TRADES: '/my-trades',
  WISHLIST: '/wishlist',
  FEEDBACK: '/feedback',
  HELP: '/help',
  LOGOUT: '/logout',
  MY_TRADES: '/my-trades',
  TRADE_REQUESTS: '/trade-requests',
  CHAT: (tradeId) => `/chat/${tradeId}`,
};

// localStorage keys — centralized so nobody typos 'token' vs 'Token'
// vs 'authToken' in different files.
export const STORAGE_KEYS = {
  TOKEN: 'token',
};