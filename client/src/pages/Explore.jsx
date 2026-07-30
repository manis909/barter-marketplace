import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CategoryFilter from '../components/CategoryFilter'
import CategorySection from '../components/CategorySection'
import Footer from '../components/Footer'
import './Explore.css'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function ExplorePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState(() => new URLSearchParams(location.search).get('category') || '')
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') || '')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Sync state with URL params without calling scrollIntoView or double navigate loops
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearch(params.get('search') || '')
    setActiveCategory(params.get('category') || '')
  }, [location.search])

  // Fetch items when activeCategory or search changes
  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()

    if (activeCategory && activeCategory !== 'All') {
      params.set('category', activeCategory)
    }

    if (search.trim()) {
      params.set('search', search.trim())
    }

    const query = params.toString()
    const url = `${apiBaseUrl}/items${query ? `?${query}` : ''}`

    setLoading(true)
    setError('')

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Unable to load items')
        }

        const data = await response.json()
        setItems(Array.isArray(data.items) ? data.items : [])
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          return
        }

        setItems([])
        setError('Unable to load items right now.')
      })
      .finally(() => {
        setLoading(false)
      })

    return () => controller.abort()
  }, [activeCategory, search])

  const normalizedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      image: item.image || item.image_urls?.[0] || 'https://via.placeholder.com/300x200?text=Barter+Item',
      condition: item.condition || item.item_condition || 'good',
      ownerName: item.ownerName || item.owner_name || 'Owner',
      ownerRating: item.ownerRating ?? item.owner_rating ?? 4.5,
      tradeRating: item.tradeRating ?? item.trade_rating ?? 4.5,
    }))
  }, [items])

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

  const isFiltered = Boolean((activeCategory && activeCategory !== 'All') || search.trim())

  return (
    <div className="explore-page">
      <CategoryFilter activeCategory={activeCategory} onSelect={handleCategorySelect} />

      <div className="market-summary">
        <div>
          <p className="section-label">Marketplace</p>
          <h2>Trade items with trusted local members</h2>
        </div>
        <p>
          {loading
            ? 'Loading items...'
            : `${normalizedItems.length} items available in ${activeCategory || 'All categories'}`}
        </p>
      </div>

      {error ? <p className="section-label">{error}</p> : null}

      {isFiltered ? (
        <CategorySection
          title={activeCategory && activeCategory !== 'All' ? activeCategory : 'Search Results'}
          items={normalizedItems}
        />
      ) : (
        <>
          <CategorySection
            title="Recently Added"
            items={normalizedItems.slice(0, 4)}
          />
          <CategorySection
            title="Recommended Items"
            items={normalizedItems.slice(4, 8)}
          />
          <CategorySection
            title="Trending Items"
            items={normalizedItems.slice(8, 12)}
          />
        </>
      )}

      <Footer />
    </div>
  )
}