/**
 * useRecentlyViewed
 *
 * Stores and retrieves recently-viewed item objects in localStorage.
 * No backend required — purely client-side.
 *
 * Storage key : `barter_recently_viewed_<userId>`  (anonymous: `barter_recently_viewed`)
 * Format      : JSON array of plain item objects, newest first, capped at MAX_ITEMS
 *
 * Named exports (framework-agnostic helpers)
 * ──────────────────────────────────────────
 * trackView(item, userId?)
 *   Prepend item, deduplicate by id, trim to MAX_ITEMS, persist.
 *   Safe to call with null/undefined item.
 *
 * getViewed(userId?, excludeOwner?)
 *   Read stored array. Pass excludeOwner to filter out the user's own listings.
 *
 * clearViewed(userId?)
 *   Wipe history for this user (e.g. on logout).
 *
 * Default export: useRecentlyViewed(userId) React hook
 *   Returns { viewed, track, refresh, clear }
 *   `viewed` already has the user's own items filtered out.
 */

import { useCallback, useState } from 'react'

const MAX_ITEMS = 20
const BASE_KEY = 'barter_recently_viewed'

// ── Storage helpers ─────────────────────────────────────────────

function storageKey(userId) {
  return userId ? `${BASE_KEY}_${userId}` : BASE_KEY
}

function readRaw(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRaw(userId, items) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(items))
  } catch {
    // Storage quota exceeded or private-browsing restriction — silent no-op
  }
}

// ── Named exports ────────────────────────────────────────────────

/**
 * trackView — call from ItemDetail after a successful item load.
 * @param {object} item      Full item object (must have .id)
 * @param {string} [userId]  Current user's id (omit for anonymous)
 */
export function trackView(item, userId) {
  if (!item || !item.id) return
  const existing = readRaw(userId)
  const updated = [
    item,
    ...existing.filter((i) => i.id !== item.id),
  ].slice(0, MAX_ITEMS)
  writeRaw(userId, updated)
}

/**
 * getViewed — returns recently viewed items.
 * @param {string} [userId]         Current user's id
 * @param {string} [excludeOwner]   Filter out items where owner_id === this value
 * @returns {object[]}
 */
export function getViewed(userId, excludeOwner) {
  const items = readRaw(userId)
  if (!excludeOwner) return items
  return items.filter(
    (i) => i.owner_id !== excludeOwner && i.ownerId !== excludeOwner
  )
}

/**
 * clearViewed — wipe history for this user.
 * @param {string} [userId]
 */
export function clearViewed(userId) {
  try {
    localStorage.removeItem(storageKey(userId))
  } catch {
    // ignore
  }
}

// ── React hook (default export) ──────────────────────────────────

export default function useRecentlyViewed(userId) {
  // Initialise once from localStorage; already filters out the user's own items
  const [viewed, setViewed] = useState(() => getViewed(userId, userId))

  const track = useCallback(
    (item) => {
      trackView(item, userId)
      // Refresh state so callers see the update immediately
      setViewed(getViewed(userId, userId))
    },
    [userId]
  )

  const refresh = useCallback(() => {
    setViewed(getViewed(userId, userId))
  }, [userId])

  const clear = useCallback(() => {
    clearViewed(userId)
    setViewed([])
  }, [userId])

  return { viewed, track, refresh, clear }
}
