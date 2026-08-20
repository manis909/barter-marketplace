import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CategoryFilter from '../components/CategoryFilter'
import SkillCard from '../components/SkillCard'
import Footer from '../components/Footer'
import api from '../services/api'
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
//   - Fetches and displays skill listings from the backend skill_listings table
//   - Only shows active skills publicly (status === 'active')
// ---------------------------------------------------------------------------

export default function SkilterExplorePage() {
  const location = useLocation()
  const navigate  = useNavigate()

  const [activeCategory, setActiveCategory] = useState(() =>
    normalizeSkilterCategory(
      new URLSearchParams(location.search).get('category')
    ) || ''
  )
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Sync state when URL changes (e.g. browser back/forward)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setActiveCategory(
      normalizeSkilterCategory(params.get('category')) || ''
    )
  }, [location.search])

  // Fetch skills from the backend
  useEffect(() => {
    async function fetchSkills() {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams(location.search)
        const response = await api.get('/skills', {
          params: { search: params.get('search') || undefined },
        })
        // Backend already filters for status === 'active'
        setSkills(response.data.skills || [])
      } catch (err) {
        console.error('Error fetching skills:', err)
        setError(err.response?.data?.error || err.message || 'Failed to fetch skills')
      } finally {
        setLoading(false)
      }
    }
    fetchSkills()
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
  
  // Filter skills by category
  const filteredSkills = isFiltered
    ? skills.filter((skill) => skill.category === activeCategory)
    : skills

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
      {loading && (
        <div className="skilter-coming-soon">
          <p>Loading skills...</p>
        </div>
      )}

      {error && (
        <div className="skilter-coming-soon">
          <p>Error: {error}</p>
        </div>
      )}

      {!loading && !error && filteredSkills.length === 0 && (
        <div className="skilter-coming-soon">
          <div className="skilter-coming-soon__icon">🎓</div>
          <h3>No skills found</h3>
          <p>
            {isFiltered
              ? `No skills available in ${activeCategory} category.`
              : 'Be the first to post a skill!'}
          </p>
        </div>
      )}

      {!loading && !error && filteredSkills.length > 0 && (
        <div className="skill-grid">
          {filteredSkills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      )}

      <Footer />
    </div>
  )
}