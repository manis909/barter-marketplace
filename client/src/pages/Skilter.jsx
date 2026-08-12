import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CategoryFilter from '../components/CategoryFilter'
import Footer from '../components/Footer'
import {
  SKILTER_CATEGORY_META,
  normalizeSkilterCategory,
} from '../data/skilterCategories'
import './Skilter.css'

// ---------------------------------------------------------------------------
// SkilterExplorePage
//
// Mirrors the structure of Barter's Explore.jsx:
//   - CategoryFilter (reused component, Skilter categories injected via prop)
//   - URL-synced activeCategory state (?category=)
//   - Placeholder listing grid (real skill listings wired in when the backend
//     skill_listings endpoint is ready — just swap the fetch call)
// ---------------------------------------------------------------------------

export default function SkilterExplorePage() {
  const location = useLocation()
  const navigate  = useNavigate()

  const [activeCategory, setActiveCategory] = useState(() =>
    normalizeSkilterCategory(
      new URLSearchParams(location.search).get('category')
    ) || ''
  )

  // Sync state when URL changes (e.g. browser back/forward)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setActiveCategory(
      normalizeSkilterCategory(params.get('category')) || ''
    )
  }, [location.search])

  function handleCategorySelect(cat) {
    setActiveCategory(cat)
    const params = new URLSearchParams(location.search)
    if (!cat || cat === 'All') {
      params.delete('category')
    } else {
      params.set('category', cat)
    }
    navigate({
      pathname: location.pathname,
      search: params.toString() ? `?${params.toString()}` : '',
    })
  }

  const isFiltered = Boolean(activeCategory && activeCategory !== 'All')

  return (
    <div className="skilter-page">
      {/* ── Category filter ──────────────────────────────────────────── */}
      <CategoryFilter
        categories={SKILTER_CATEGORY_META}
        activeCategory={activeCategory}
        onSelect={handleCategorySelect}
        heading="Browse skill categories"
      />

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="skilter-summary">
        <div>
          <p className="skilter-section-label">Skilter</p>
          <h2>Find students with the skills you need</h2>
        </div>
        {isFiltered && (
          <p className="skilter-filter-hint">
            Showing skills in <strong>{activeCategory}</strong>
          </p>
        )}
      </div>

      {/* ── Skill listing grid ───────────────────────────────────────── */}
      {/* Replace this placeholder with real skill cards once the        */}
      {/* skill_listings backend endpoint is wired up.                    */}
      <div className="skilter-coming-soon">
        <div className="skilter-coming-soon__icon">🎓</div>
        <h3>Skill listings coming soon</h3>
        <p>
          Students will be able to post and discover skills here.
          {isFiltered && (
            <> Category filter is active: <strong>{activeCategory}</strong>.</>
          )}
        </p>
      </div>

      <Footer />
    </div>
  )
}
