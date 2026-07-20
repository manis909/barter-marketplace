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
};

// Frontend route paths — import these instead of hardcoding strings
// in <Link to="..."> or navigate() calls, so a route rename only
// needs one edit.
export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  PROFILE: '/profile',
  EXPLORE: '/explore',
  MY_TRADES: '/my-trades',
  WISHLIST: '/wishlist',
  CHAT: (tradeId) => `/chat/${tradeId}`,
};

// localStorage keys — centralized so nobody typos 'token' vs 'Token'
// vs 'authToken' in different files.
export const STORAGE_KEYS = {
  TOKEN: 'token',
};