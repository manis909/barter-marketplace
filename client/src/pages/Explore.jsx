import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import HeroBanner from '../components/HeroBanner'
import CategoryFilter from '../components/CategoryFilter'
import CategorySection from '../components/CategorySection'
import Footer from '../components/Footer'
import './Explore.css'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const sectionMapping = [
  { title: 'Recommended Items' },
  { title: 'Recently Added' },
  { title: 'Trending Items' }
]

const carouselSlides = [
  {
    title: 'Advertise your trades to a trusted community',
    subtitle: 'Promote items, connect with local traders, and complete exchanges confidently with every listing.'
  },
  {
    title: 'Trade smarter with curated offers',
    subtitle: 'Find the best matches in seconds using verified listings and transparent trade details.'
  },
  {
    title: 'A premium barter experience',
    subtitle: 'Enjoy a clean marketplace with simple browsing, secure conversations, and faster exchanges.'
  }
]

export default function ExplorePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState(() => new URLSearchParams(location.search).get('category') || '')
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') || '')
  const [bannerIndex, setBannerIndex] = useState(0)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((current) => (current + 1) % carouselSlides.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearch(params.get('search') || '')
    setActiveCategory(params.get('category') || '')
  }, [location.search])

  useEffect(() => {
    const params = new URLSearchParams()

    if (activeCategory && activeCategory !== 'All') {
      params.set('category', activeCategory)
    }

    if (search.trim()) {
      params.set('search', search.trim())
    }

    const nextSearch = params.toString()
    const currentSearch = location.search.replace(/^\?/, '')

    if (nextSearch !== currentSearch) {
      navigate({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' }, { replace: true })
    }
  }, [activeCategory, location.pathname, location.search, navigate, search])

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
    const url = `${apiBaseUrl}/api/items${query ? `?${query}` : ''}`

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
      tradeRating: item.tradeRating ?? item.trade_rating ?? 4.5
    }))
  }, [items])

  return (
    <div className="explore-page">
      <HeroBanner
        search={search}
        onSearch={(event) => setSearch(event.target.value)}
      />

      <div className="banner-carousel-section">
        <div className="banner-carousel">
          {carouselSlides.map((slide, index) => (
            <div
              key={slide.title}
              className={index === bannerIndex ? 'banner-slide active' : 'banner-slide'}
            >
              <p className="banner-slide-label">Marketplace Spotlight</p>
              <h2>{slide.title}</h2>
              <p>{slide.subtitle}</p>
            </div>
          ))}
        </div>
        <div className="banner-dots">
          {carouselSlides.map((_, index) => (
            <button
              key={index}
              type="button"
              className={index === bannerIndex ? 'banner-dot active' : 'banner-dot'}
              onClick={() => setBannerIndex(index)}
              aria-label={`Show slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <CategoryFilter activeCategory={activeCategory} onSelect={setActiveCategory} />

      <div className="market-summary">
        <div>
          <p className="section-label">Marketplace</p>
          <h2>Trade items with trusted local members</h2>
        </div>
        <p>{loading ? 'Loading items...' : `${normalizedItems.length} items available in ${activeCategory || 'All categories'}`}</p>
      </div>

      {error ? <p className="section-label">{error}</p> : null}

      {sectionMapping.map((section, index) => {
        const sectionItems = normalizedItems.slice(index * 4, index * 4 + 4)

        return (
          <CategorySection
            key={section.title}
            title={section.title}
            items={sectionItems}
          />
        )
      })}

      <Footer />
    </div>
  )
}
