// client/src/utils/helpers.js
//
// Small, pure utility functions used across features.

// ---------------------------------------------------------------------------
// TIMESTAMP UTILITIES
// ---------------------------------------------------------------------------
//
// PostgreSQL TIMESTAMP columns (without timezone) are serialised by pg as
// strings like "2026-07-30T07:05:29.295195" — no 'Z', no offset.
// The server runs in UTC so those values ARE UTC, but without the suffix
// JavaScript's Date parser treats them as local time and produces wrong output.
//
// normalizeToUTC() appends 'Z' when no timezone marker is present so that
// new Date() always interprets the string as UTC. It is a no-op for strings
// that already carry 'Z' or a numeric offset (socket.io serialises Dates
// with .toISOString() which always ends in 'Z').
//
// All fmtXxx functions use the BROWSER's locale + timezone automatically
// (locale = [], timeZone = undefined). No 'en-IN', 'en-US', 'Asia/Kolkata',
// or any other hardcoded value. The output matches the user's device clock —
// exactly like WhatsApp / Instagram / Telegram.

/**
 * Ensure a DB timestamp string is treated as UTC by new Date().
 */
export function normalizeToUTC(ts) {
  if (!ts) return ts;
  if (typeof ts === 'number') return ts;
  if (ts instanceof Date) return ts;
  const s = String(ts).trim();
  if (!s) return s;
  if (/Z$|[+-]\d{2}:?\d{2}$/i.test(s)) return s;   // already has tz info
  return s.replace(' ', 'T') + 'Z';                // add UTC marker
}

/**
 * "12:47 PM"  — short time in the user's local timezone.
 */
export function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(normalizeToUTC(ts));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * "Jul 30, 2026"  — medium date in the user's local timezone.
 */
export function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(normalizeToUTC(ts));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * "Jul 30, 2026, 12:47 PM"  — date + time in the user's local timezone.
 */
export function fmtDateTime(ts) {
  if (!ts) return '';
  const d = new Date(normalizeToUTC(ts));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * Returns { date, time } as separate strings.
 * Used by the Notifications page which renders them on two lines.
 * Example: { date: "30 Jul 2026", time: "12:47 PM" }
 */
export function fmtDateAndTime(ts) {
  if (!ts) return { date: '', time: '' };
  const d = new Date(normalizeToUTC(ts));
  if (isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
  };
}

/**
 * Returns YYYY-MM-DD string in user's local timezone for grouping messages by day.
 */
export function getDateKey(ts) {
  if (!ts) return '';
  const d = new Date(normalizeToUTC(ts));
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Returns a human-readable date header string in user's local timezone:
 * - "Today"
 * - "Yesterday"
 * - "Monday", "Tuesday", etc. (if within the last 6 days)
 * - "31 July 2026" (otherwise)
 */
export function formatChatDateHeader(ts) {
  if (!ts) return '';
  const d = new Date(normalizeToUTC(ts));
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const sixDaysAgoStart = todayStart - 6 * 86400000;

  const msgDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  if (msgDayStart === todayStart) {
    return 'Today';
  }
  if (msgDayStart === yesterdayStart) {
    return 'Yesterday';
  }
  if (msgDayStart >= sixDaysAgoStart && msgDayStart < yesterdayStart) {
    return d.toLocaleDateString([], { weekday: 'long' });
  }
  return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// LEGACY WRAPPERS — kept so nothing that already imports formatDate breaks
// ---------------------------------------------------------------------------

/** @deprecated Use fmtDate() */
export function formatDate(timestamp) {
  return fmtDate(timestamp);
}

/** Formats a timestamp as relative time. e.g. "3 hours ago" */
export function timeAgo(timestamp) {
  if (!timestamp) return '';
  const d = new Date(normalizeToUTC(timestamp));
  if (isNaN(d.getTime())) return '';
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 30) return 'just now';
  const intervals = [
    { label: 'year',   secs: 31536000 },
    { label: 'month',  secs: 2592000  },
    { label: 'day',    secs: 86400    },
    { label: 'hour',   secs: 3600     },
    { label: 'minute', secs: 60       },
  ];
  for (const { label, secs } of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

// ---------------------------------------------------------------------------
// OTHER UTILITIES
// ---------------------------------------------------------------------------

export function truncate(text, maxLength = 100) {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength).trim() + '...' : text;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
}
