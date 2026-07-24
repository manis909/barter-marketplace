import { useEffect, useMemo, useState } from 'react'
import HeroBanner from '../components/HeroBanner'
import CategoryFilter from '../components/CategoryFilter'
import CategorySection from '../components/CategorySection'
import itemsData from '../data/items.json'
import './Explore.css'

const sectionMapping = [
  { title: 'Recommended Items', ids: ['1', '2', '5', '6'] },
  { title: 'Recently Added', ids: ['4', '3', '7', '8'] },
  { title: 'Trending Items', ids: ['2', '5', '7', '1'] }
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
  const [activeCategory, setActiveCategory] = useState('Books')
  const [search, setSearch] = useState('')
  const [bannerIndex, setBannerIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((current) => (current + 1) % carouselSlides.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [])

  const filteredItems = useMemo(() => {
    return itemsData.filter((item) => {
      const matchesCategory = activeCategory ? item.category === activeCategory : true
      const matchesSearch = [item.title, item.category, item.ownerName]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, search])

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
        <p>{filteredItems.length} items available in {activeCategory}</p>
      </div>

      {sectionMapping.map((section) => (
        <CategorySection
          key={section.title}
          title={section.title}
          items={itemsData.filter((item) => section.ids.includes(item.id))}
        />
      ))}
    </div>
  )
}
