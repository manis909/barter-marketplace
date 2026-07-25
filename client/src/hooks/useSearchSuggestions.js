import { useEffect, useRef, useState } from 'react'
import staticItems from '../data/items.json'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const MAX_SUGGESTIONS = 6
const DEBOUNCE_MS = 250

/**
 * Returns suggestion items that match the given query string.
 *
 * Strategy:
 *  1. Debounce the raw query by DEBOUNCE_MS.
 *  2. Try the live API (/api/items?search=<query>).
 *  3. If the API call fails (backend down, network error, etc.) fall back
 *     to the static items.json dataset so the UI is never broken.
 *  4. Always cap results at MAX_SUGGESTIONS.
 *
 * Returned shape: { suggestions, isLoading, totalMatches }
 *   suggestions   — array of up to MAX_SUGGESTIONS item objects
 *   isLoading     — true while a fetch is in-flight
 *   totalMatches  — total number of matches before the cap (for "see all" row)
 */
export function useSearchSuggestions(query) {
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [totalMatches, setTotalMatches] = useState(0)

  // Keep an AbortController ref so we can cancel stale requests
  const abortRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    // Clear any pending debounce + in-flight request
    clearTimeout(timerRef.current)
    abortRef.current?.abort()

    const trimmed = query.trim()

    if (!trimmed) {
      setSuggestions([])
      setTotalMatches(0)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    timerRef.current = setTimeout(async () => {
      abortRef.current = new AbortController()

      try {
        const res = await fetch(
          `${API_BASE}/api/items?search=${encodeURIComponent(trimmed)}`,
          { signal: abortRef.current.signal }
        )

        if (!res.ok) throw new Error('API error')

        const data = await res.json()
        const allItems = Array.isArray(data.items) ? data.items : []

        // Normalise shape so the dropdown always gets `image`, `title`, `category`
        const normalised = allItems.map((item) => ({
          id: item.id,
          title: item.title || item.name || '',
          category: item.category || '',
          image:
            (Array.isArray(item.image_urls) && item.image_urls[0]) ||
            item.image ||
            null,
        }))

        setTotalMatches(normalised.length)
        setSuggestions(normalised.slice(0, MAX_SUGGESTIONS))
      } catch (err) {
        if (err.name === 'AbortError') return

        // ── Fallback: filter the static dataset client-side ──────────
        const lower = trimmed.toLowerCase()
        const matched = staticItems.filter(
          (item) =>
            item.title?.toLowerCase().includes(lower) ||
            item.category?.toLowerCase().includes(lower)
        )

        const normalised = matched.map((item) => ({
          id: item.id,
          title: item.title || '',
          category: item.category || '',
          image: item.image || null,
        }))

        setTotalMatches(normalised.length)
        setSuggestions(normalised.slice(0, MAX_SUGGESTIONS))
      } finally {
        setIsLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timerRef.current)
      abortRef.current?.abort()
    }
  }, [query])

  return { suggestions, isLoading, totalMatches }
}
