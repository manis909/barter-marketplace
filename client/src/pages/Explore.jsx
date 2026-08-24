import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Layers, X } from 'lucide-react'
import CategoryFilter from '../components/CategoryFilter'
import CategorySection from '../components/CategorySection'
import SmartSection from '../components/SmartSection'
import Footer from '../components/Footer'
import { normalizeCategory } from '../data/categories'
import { useAuth } from '../features/auth/AuthContext'
import { getViewed } from '../hooks/useRecentlyViewed'
import MobileSwipeDeck from '../components/MobileSwipeDeck'
import api from '../services/api'
import './Explore.css'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Normalise a raw item from any endpoint into the shape ItemCard expects ──
function normaliseItem(item) {
  return {
    ...item,
    image: item.image || item.image_urls?.[0] || 'https://via.placeholder.com/300x200?text=Barter+Item',
    condition: item.condition || item.item_condition || 'good',
    ownerName: item.ownerName || item.owner_name || item.owner?.name || item.user?.name || 'Owner',
    ownerId: item.owner_id || item.ownerId || item.owner?.id || item.user_id || item.user?.id || '1',
    ownerUsername: item.owner_username || item.username || item.owner?.username || item.user?.username || '',
    ownerRating: item.ownerRating ?? item.owner_rating ?? 4.5,
  }
}

// ── Fetch helper — returns [] on any error so a section never breaks the page ─
async function safeFetch(urlOrPromise) {
  try {
    if (typeof urlOrPromise === 'string') {
      const res = await fetch(urlOrPromise)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data.items) ? data.items : []
    }
    // axios-style promise (api.get)
    const res = await urlOrPromise
    return Array.isArray(res.data?.items) ? res.data.items : []
  } catch {
    return []
  }
}

export default function ExplorePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  // ── Existing state (UNCHANGED) ───────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState(() => normalizeCategory(new URLSearchParams(location.search).get('category')) || '')
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') || '')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSwipeModeOpen, setIsSwipeModeOpen] = useState(false)

  // ── Smart-section state ──────────────────────────────────────────────────
  const [trendingItems,   setTrendingItems]   = useState([])
  const [recommendedItems, setRecommendedItems] = useState([])
  const [matchesItems,    setMatchesItems]    = useState([])
  const [recentlyViewed,  setRecentlyViewed]  = useState([])
  const [similarItems,    setSimilarItems]    = useState([])
  const [latestItems,     setLatestItems]     = useState([])

  const [smartLoading, setSmartLoading] = useState(true)

  // IDs already shown in any smart section — used to filter the main grid
  const [shownSmartIds, setShownSmartIds] = useState(new Set())

  // Track which fetch cycle the smart data belongs to so stale results from
  // a previous login state are never applied after the user logs out or in.
  const smartFetchId = useRef(0)

  // ── Existing URL-sync effects (UNCHANGED) ────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearch(params.get('search') || '')
    setActiveCategory(normalizeCategory(params.get('category')) || '')
  }, [location.search])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('fromFooter') !== '1') return
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [location.pathname, location.search])

  // ── Existing main-items fetch (UNCHANGED) ────────────────────────────────
  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    const normalizedSearch = search.trim()

    if (activeCategory && activeCategory !== 'All') {
      params.set('category', activeCategory)
    }
    if (normalizedSearch) {
      params.set('search', normalizedSearch)
    }

    const query = params.toString()
    const url = `${apiBaseUrl}/items${query ? `?${query}` : ''}`

    setLoading(true)
    setError('')

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load items')
        const data = await response.json()
        setItems(Array.isArray(data.items) ? data.items : [])
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setItems([])
        setError('Unable to load items right now.')
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [activeCategory, search])

  // ── Smart sections fetch ─────────────────────────────────────────────────
  // Runs once on mount and whenever the logged-in user changes.
  // All requests are parallel; each section fails independently.
  useEffect(() => {
    const fetchId = ++smartFetchId.current
    setSmartLoading(true)

    async function fetchSmartSections() {
      try {
        // 1. Always-visible non-auth sections ─────────────────────────────────
        const [rawTrending, rawLatest] = await Promise.all([
          safeFetch(`${apiBaseUrl}/items/trending`),
          safeFetch(`${apiBaseUrl}/items`),        // sorted by created_at DESC already
        ])

        // 2. Auth-gated sections ───────────────────────────────────────────────
        let rawRecommended = []
        let rawMatches     = []
        let rawSimilar     = []
        let rawViewed      = []

        if (currentUser) {
          ;[rawRecommended, rawMatches] = await Promise.all([
            safeFetch(api.get('/items/recommended')),
            safeFetch(api.get('/items/matches')),
          ])

          // Exclude IDs already claimed by trending + recommended + matches
          const excludeSoFar = [
            ...rawTrending.map((i) => i.id),
            ...rawRecommended.map((i) => i.id),
            ...rawMatches.map((i) => i.id),
          ].join(',')

          rawSimilar = await safeFetch(
            api.get(`/items/similar${excludeSoFar ? `?exclude=${excludeSoFar}` : ''}`)
          )

          // Recently viewed comes from localStorage — already filtered to exclude
          // the user's own items by getViewed(userId, userId).
          rawViewed = getViewed(currentUser.id, currentUser.id)
        }

        // Guard: if a newer fetch started while we were awaiting, discard these results
        if (fetchId !== smartFetchId.current) return

        // ── Global deduplication ──────────────────────────────────────────────
        // Priority: Trending → Recommended → Matches → Recently Viewed → Similar → Latest
        const displayedIds = new Set()

        function dedup(raw) {
          const unique = raw.filter((i) => !displayedIds.has(i.id))
          unique.forEach((i) => displayedIds.add(i.id))
          return unique.map(normaliseItem)
        }

        const trending    = dedup(rawTrending)
        const recommended = dedup(rawRecommended)
        const matches     = dedup(rawMatches)
        const viewed      = dedup(rawViewed)
        const similar     = dedup(rawSimilar)
        // Latest: take up to 8 from the already-fetched main items list
        // (sorted newest-first), excluding anything already shown above
        const latest      = dedup(rawLatest.slice(0, 20))  // slice gives enough candidates

        setTrendingItems(trending)
        setRecommendedItems(recommended)
        setMatchesItems(matches)
        setRecentlyViewed(viewed)
        setSimilarItems(similar)
        setLatestItems(latest.slice(0, 8))
        // Snapshot the full set of displayed IDs so the main grid can exclude them
        setShownSmartIds(new Set(displayedIds))
      } catch (err) {
        console.error('Error fetching smart sections:', err)
      } finally {
        if (fetchId === smartFetchId.current) {
          setSmartLoading(false)
        }
      }
    }

    fetchSmartSections()
  // Re-run only when the logged-in user actually changes (login/logout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  // ── normalizedItems ──────────────────────────────────────────────────────
  // isFiltered must be declared before this memo because the memo depends on it.
  const isFiltered = Boolean((activeCategory && activeCategory !== 'All') || search.trim())

  // When not filtered (homepage), exclude every item already shown in a smart
  // section. When filtered (search / category), show the full result set so
  // the user sees everything matching their query.
  const normalizedItems = useMemo(() => {
    const mapped = items.map(normaliseItem)
    if (isFiltered || shownSmartIds.size === 0) return mapped
    return mapped.filter((item) => !shownSmartIds.has(item.id))
  }, [items, isFiltered, shownSmartIds])

  // ── allExploreItems (For Swipe Deck: includes ALL items, both old & new) ──
  const allExploreItems = useMemo(() => {
    const combined = [
      ...trendingItems,
      ...recommendedItems,
      ...matchesItems,
      ...recentlyViewed,
      ...similarItems,
      ...latestItems,
      ...items
    ]
    const seen = new Set()
    const result = []
    for (const rawItem of combined) {
      if (rawItem && rawItem.id && !seen.has(rawItem.id)) {
        seen.add(rawItem.id)
        result.push(normaliseItem(rawItem))
      }
    }
    return result.length > 0 ? result : items.map(normaliseItem)
  }, [trendingItems, recommendedItems, matchesItems, recentlyViewed, similarItems, latestItems, items])

  // ── Existing category handler (UNCHANGED) ────────────────────────────────
  const handleCategorySelect = (cat) => {
    setActiveCategory(cat)
    const params = new URLSearchParams(location.search)
    if (!cat || cat === 'All') {
      params.delete('category')
    } else {
      params.set('category', cat)
    }
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' })
  }

  return (
    <div className="explore-page">
      <div id="explore-top" />

      {/* ── Existing: category filter bar (UNCHANGED) ─────────────────── */}
      <CategoryFilter activeCategory={activeCategory} onSelect={handleCategorySelect} />

      {/* ── Marketplace Hero Advertisement Banner ─────────────────────── */}
      <div className="market-promo-banner">
        <div className="market-promo-content">
          <span className="market-promo-badge">✨ BARTER MARKETPLACE</span>
          <h2 className="market-promo-heading">Trade items with trusted local members</h2>
          <p className="market-promo-subtext">
            Give items a second life • {loading ? 'Loading items...' : `${allExploreItems.length} items available in ${activeCategory || 'All categories'}`}
          </p>
        </div>
        <div className="market-promo-action">
          <button
            type="button"
            className="swipe-mode-trigger-btn"
            onClick={() => setIsSwipeModeOpen(true)}
            aria-label="Open Swipe Discovery Mode"
            title="Swipe Mode"
          >
            <Layers size={18} />
            <span>Swipe Mode</span>
          </button>
        </div>
      </div>

      {error ? <p className="section-label">{error}</p> : null}

      {/* ── Main Explore Content (Visible on all screen sizes) ─────────── */}
      <div className="explore-main-content">
        {!isFiltered && (
          <div className="smart-sections-block">
            <SmartSection
              title="🔥 Trending Now"
              subtitle="Items people are viewing and saving right now"
              items={trendingItems}
              loading={smartLoading}
            />

            {currentUser && (
              <SmartSection
                title="💜 Recommended for You"
                subtitle="Based on your wishlist activity"
                items={recommendedItems}
                loading={smartLoading}
              />
            )}

            {currentUser && (
              <SmartSection
                title="🎯 Matches Your Desired Items"
                subtitle="Listings that are looking for something you might have"
                items={matchesItems}
                loading={smartLoading}
              />
            )}

            {currentUser && recentlyViewed.length > 0 && (
              <SmartSection
                title="👀 Recently Viewed"
                subtitle="Pick up where you left off"
                items={recentlyViewed}
                loading={false}
              />
            )}

            {currentUser && (
              <SmartSection
                title="✨ You May Also Like"
                subtitle="Similar to items you've shown interest in"
                items={similarItems}
                loading={smartLoading}
              />
            )}

            <SmartSection
              title="🆕 Latest Listings"
              subtitle="Fresh items just added to the marketplace"
              items={latestItems}
              loading={smartLoading}
            />
          </div>
        )}

        {/* Main grid (filtered only — shows search/category results) */}
        {isFiltered && (
          <CategorySection
            title={activeCategory && activeCategory !== 'All' ? activeCategory : 'Search Results'}
            items={normalizedItems}
          />
        )}
      </div>

      {/* ── Full-screen Swipe Discovery Mode Overlay ─────────────────────── */}
      {isSwipeModeOpen && (
        <div className="swipe-modal-backdrop" onClick={() => setIsSwipeModeOpen(false)}>
          <div className="swipe-modal-container" onClick={(e) => e.stopPropagation()}>
            <MobileSwipeDeck items={allExploreItems} onClose={() => setIsSwipeModeOpen(false)} />
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}