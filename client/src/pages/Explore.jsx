import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Layers } from 'lucide-react'
import CategoryFilter from '../components/CategoryFilter'
import ItemCard from '../components/ItemCard'
import Footer from '../components/Footer'
import { normalizeCategory } from '../data/categories'
import MobileSwipeDeck from '../components/MobileSwipeDeck'
import '../components/CategorySection.css'
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

// ── Client-side cache to avoid 1-2s loading delays on return navigation ────
let exploreCache = {
  items: null,
  queryKey: null,
}

export default function ExplorePage() {
  const location = useLocation()
  const navigate = useNavigate()

  const initialCat = normalizeCategory(new URLSearchParams(location.search).get('category')) || ''
  const initialSearch = (new URLSearchParams(location.search).get('search') || '').trim()
  const initialParams = new URLSearchParams()
  if (initialCat && initialCat !== 'All') initialParams.set('category', initialCat)
  if (initialSearch) initialParams.set('search', initialSearch)
  const initialQueryKey = initialParams.toString()

  const hasItemCache = exploreCache.items !== null && exploreCache.queryKey === initialQueryKey

  // ── Existing state ───────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState(initialCat)
  const [search, setSearch] = useState(initialSearch)
  const [items, setItems] = useState(() => (hasItemCache ? exploreCache.items : []))
  const [loading, setLoading] = useState(() => !hasItemCache)
  const [error, setError] = useState('')
  const [isSwipeModeOpen, setIsSwipeModeOpen] = useState(false)

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

  // ── Existing main-items fetch (With cache revalidation) ─────────────────
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

    if (!exploreCache.items || exploreCache.queryKey !== query) {
      setLoading(true)
    }
    setError('')

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load items')
        const data = await response.json()
        const fetchedItems = Array.isArray(data.items) ? data.items : []
        setItems(fetchedItems)
        exploreCache.items = fetchedItems
        exploreCache.queryKey = query
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        if (!exploreCache.items) setItems([])
        setError('Unable to load items right now.')
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [activeCategory, search])

  const normalizedItems = useMemo(() => {
    return items.map(normaliseItem)
  }, [items])

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
    <div className="explore-page barter-theme">
      <div id="explore-top" />

      {/* ── Category filter bar (UNCHANGED) ───────────────────────────── */}
      <CategoryFilter activeCategory={activeCategory} onSelect={handleCategorySelect} />

      {/* ── Subheader row with item count & inline Swipe Mode button ── */}
      <div className="explore-subhead-row">
        <span className="explore-count-text">
          {loading ? 'Loading items...' : `${normalizedItems.length} items available ${activeCategory && activeCategory !== 'All' ? `in ${activeCategory}` : ''}`}
        </span>
        <button
          type="button"
          className="swipe-mode-trigger-btn"
          onClick={() => setIsSwipeModeOpen(true)}
          aria-label="Open Swipe Discovery Mode"
          title="Swipe Mode"
        >
          <Layers size={14} />
          <span>Swipe Mode</span>
        </button>
      </div>

      {error ? <p className="section-label">{error}</p> : null}

      {/* ── Main Continuous Item Grid (No section title or heading) ───── */}
      <div className="explore-main-content">
        {loading && items.length === 0 ? (
          <div className="explore-loading-state" style={{ padding: '60px 0', textAlign: 'center', color: '#567367' }}>
            <p>Loading items...</p>
          </div>
        ) : normalizedItems.length > 0 ? (
          <div className="item-grid">
            {normalizedItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="explore-empty-state" style={{ padding: '60px 0', textAlign: 'center', color: '#567367' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0F3D2E', marginBottom: 6 }}>No items found</p>
            <p style={{ fontSize: '0.9rem' }}>Try choosing another category or clearing your search filter.</p>
          </div>
        )}
      </div>

      {/* ── Full-screen Swipe Discovery Mode Overlay ─────────────────────── */}
      {isSwipeModeOpen && (
        <div className="swipe-modal-backdrop" onClick={() => setIsSwipeModeOpen(false)}>
          <div className="swipe-modal-container" onClick={(e) => e.stopPropagation()}>
            <MobileSwipeDeck items={normalizedItems} onClose={() => setIsSwipeModeOpen(false)} />
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}