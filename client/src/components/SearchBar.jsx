import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, Tag, ImageOff } from 'lucide-react'
import api from '../services/api'
import './SearchBar.css'

const MAX_SUGGESTIONS = 6
const DEBOUNCE_MS = 250

/**
 * SearchBar with autocomplete dropdown.
 *
 * Props:
 *   value          — controlled input value
 *   onChange       — called with the raw input event on every keystroke
 *   onSearch(q)    — called when the user presses Enter or clicks the search icon;
 *                    navigates to /explore?search=<q>
 *   onSelect(item) — called when the user clicks a suggestion row;
 *                    navigates to /item/:id
 *   placeholder    — input placeholder text
 */
export default function SearchBar({
  value = '',
  onChange,
  onSearch,
  onSelect,
  placeholder = 'Search items to trade...',
  searchEndpoint = '/items',
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [totalMatches, setTotalMatches] = useState(0)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    clearTimeout(timerRef.current)
    abortRef.current?.abort()

    const trimmed = value.trim()

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
        const response = await api.get(searchEndpoint, {
          params: { search: trimmed },
          signal: abortRef.current.signal,
        })

        const allItems = searchEndpoint === '/rentals' && Array.isArray(response.data?.rentals)
          ? response.data.rentals
          : Array.isArray(response.data?.items)
          ? response.data.items
          : Array.isArray(response.data?.skills)
            ? response.data.skills
            : []

        const normalised = allItems.map((item) => ({
          id: item.id,
          title: item.title || item.skill_name || item.item_name || item.name || '',
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

        setTotalMatches(0)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timerRef.current)
      abortRef.current?.abort()
    }
  }, [value, searchEndpoint])

  const hasMore = totalMatches > suggestions.length
  const showDropdown = open && value.trim().length > 0

  // ── close on outside click ──────────────────────────────────────
  useEffect(() => {
    function handlePointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  // ── reset active index when suggestions change ──────────────────
  useEffect(() => {
    setActiveIndex(-1)
  }, [suggestions])

  // ── keyboard navigation ─────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (!showDropdown) {
        if (e.key === 'Enter') {
          onSearch?.(value.trim())
        }
        return
      }

      // Total navigable rows = suggestions + (hasMore ? 1 "see all" row : 0)
      const rowCount = suggestions.length + (hasMore ? 1 : 0)

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % rowCount)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => (prev - 1 + rowCount) % rowCount)
      } else if (e.key === 'Escape') {
        setOpen(false)
        setActiveIndex(-1)
        inputRef.current?.blur()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          // A suggestion row is highlighted
          onSelect?.(suggestions[activeIndex])
          setOpen(false)
        } else {
          // "See all" row or nothing highlighted → full search
          onSearch?.(value.trim())
          setOpen(false)
        }
      }
    },
    [showDropdown, suggestions, hasMore, activeIndex, value, onSearch, onSelect]
  )

  const handleSuggestionClick = (item) => {
    onSelect?.(item)
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleSeeAll = () => {
    onSearch?.(value.trim())
    setOpen(false)
  }

  const handleSearchIconClick = () => {
    onSearch?.(value.trim())
    setOpen(false)
  }

  return (
    <div className="search-bar" ref={containerRef}>
      {/* ── Input row ─────────────────────────────────────────────── */}
      <div className="search-bar__input-row">
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => {
            onChange?.(e)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          aria-label="Search marketplace"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          role="combobox"
        />
        <button
          type="button"
          className="search-bar__icon-btn"
          onClick={handleSearchIconClick}
          aria-label="Search"
          tabIndex={-1}
        >
          <Search size={17} />
        </button>
      </div>

      {/* ── Dropdown ──────────────────────────────────────────────── */}
      {showDropdown && (
        <div className="search-dropdown" role="listbox" aria-label="Search suggestions">

          {/* Loading skeleton */}
          {isLoading && (
            <div className="search-dropdown__loading">
              <span className="search-dropdown__spinner" />
              <span>Searching…</span>
            </div>
          )}

          {/* No results */}
          {!isLoading && suggestions.length === 0 && (
            <div className="search-dropdown__empty">
              <ImageOff size={28} strokeWidth={1.4} />
              <p>No items found for <strong>"{value.trim()}"</strong></p>
              <span>Try a different keyword or browse all listings.</span>
            </div>
          )}

          {/* Suggestion rows */}
          {!isLoading && suggestions.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={activeIndex === idx}
              className={`search-dropdown__row${activeIndex === idx ? ' is-active' : ''}`}
              onClick={() => handleSuggestionClick(item)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              {/* Thumbnail */}
              <div className="search-dropdown__thumb">
                {item.image
                  ? <img src={item.image} alt="" />
                  : <div className="search-dropdown__thumb-placeholder"><ImageOff size={14} /></div>
                }
              </div>

              {/* Text */}
              <div className="search-dropdown__text">
                <span className="search-dropdown__title">
                  {highlightMatch(item.title, value.trim())}
                </span>
                {item.category && (
                  <span className="search-dropdown__category">
                    <Tag size={11} />
                    {item.category}
                  </span>
                )}
              </div>
            </button>
          ))}

          {/* See all results */}
          {!isLoading && hasMore && (
            <button
              type="button"
              role="option"
              aria-selected={activeIndex === suggestions.length}
              className={`search-dropdown__see-all${activeIndex === suggestions.length ? ' is-active' : ''}`}
              onClick={handleSeeAll}
              onMouseEnter={() => setActiveIndex(suggestions.length)}
            >
              See all results for <strong>"{value.trim()}"</strong>
              <span className="search-dropdown__see-all-count">{totalMatches}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── helpers ────────────────────────────────────────────────────────
/**
 * Wraps the matched portion of `text` in a <mark> so it appears bold/highlighted.
 * Returns an array of strings/elements safe for React rendering.
 */
function highlightMatch(text, query) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}
