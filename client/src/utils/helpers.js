// client/src/utils/helpers.js
//
// Small, pure utility functions used across features. Add to this
// file rather than duplicating small formatting logic in components.

// Formats a timestamp from the DB into something readable in the UI.
// e.g. "2026-07-18T11:23:44.706277" -> "Jul 18, 2026"
export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Formats a timestamp as relative time for chat/notifications.
// e.g. "2 minutes ago", "3 hours ago"
export function timeAgo(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);

  const intervals = [
    { label: 'year', secs: 31536000 },
    { label: 'month', secs: 2592000 },
    { label: 'day', secs: 86400 },
    { label: 'hour', secs: 3600 },
    { label: 'minute', secs: 60 },
  ];

  for (const { label, secs } of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

// Truncates long item descriptions for card/grid views.
export function truncate(text, maxLength = 100) {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength).trim() + '...' : text;
}

// Basic email format check for signup/login forms — not a replacement
// for server-side validation, just a fast client-side check before
// hitting the API.
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Reads a friendly error message out of an Axios error response,
// falling back gracefully if the backend didn't send one.
export function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
}