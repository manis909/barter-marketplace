import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import CategoryFilter from '../components/CategoryFilter'
import SkillCard from '../components/SkillCard'
import SkillWishlistButton from '../components/SkillWishlistButton'
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

// ── Client-side cache to avoid loading delays on return navigation ───────
let skilterCache = {
  skills: null,
  searchKey: null,
}

export default function SkilterExplorePage() {
  const location = useLocation()
  const navigate  = useNavigate()

  const currentSearchKey = new URLSearchParams(location.search).get('search') || ''
  const hasCache = skilterCache.skills !== null && skilterCache.searchKey === currentSearchKey

  const [activeCategory, setActiveCategory] = useState(() =>
    normalizeSkilterCategory(
      new URLSearchParams(location.search).get('category')
    ) || ''
  )
  const [skills, setSkills] = useState(() => (hasCache ? skilterCache.skills : []))
  const [loading, setLoading] = useState(() => !hasCache)
  const [error, setError] = useState(null)
  const [activeReelIndex, setActiveReelIndex] = useState(null)
  const reelVideoRef = useRef(null)
  const reelTouchStartY = useRef(null)

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
        const params = new URLSearchParams(location.search)
        const searchVal = params.get('search') || ''
        if (!skilterCache.skills || skilterCache.searchKey !== searchVal) {
          setLoading(true)
        }
        setError(null)
        const response = await api.get('/skills', {
          params: { search: searchVal || undefined },
        })
        const fetchedSkills = response.data.skills || []
        setSkills(fetchedSkills)
        skilterCache.skills = fetchedSkills
        skilterCache.searchKey = searchVal
      } catch (err) {
        console.error('Error fetching skills:', err)
        if (!skilterCache.skills) setError(err.response?.data?.error || err.message || 'Failed to fetch skills')
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

  const reelItems = filteredSkills.flatMap((skill) =>
    (Array.isArray(skill.demo_video_urls) ? skill.demo_video_urls : [])
      .filter(Boolean)
      .map((videoUrl, index) => ({
        id: `${skill.id}-${index}`,
        skillId: skill.id,
        videoUrl,
        skillName: skill.skill_name,
        teacherName: skill.teacher_name || 'Teacher'
      }))
  )
  const activeReel = activeReelIndex === null ? null : reelItems[activeReelIndex]

  useEffect(() => {
    if (activeReelIndex === null) return

    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleViewerKeyDown(event) {
      if (event.key === 'Escape') {
        const video = reelVideoRef.current
        if (video) {
          video.pause()
          video.currentTime = 0
        }
        setActiveReelIndex(null)
      } else if (event.key === 'ArrowLeft' && reelItems.length > 1) {
        setActiveReelIndex((index) => (index - 1 + reelItems.length) % reelItems.length)
      } else if (event.key === 'ArrowRight' && reelItems.length > 1) {
        setActiveReelIndex((index) => (index + 1) % reelItems.length)
      }
    }

    window.addEventListener('keydown', handleViewerKeyDown)
    return () => {
      window.removeEventListener('keydown', handleViewerKeyDown)
      document.body.style.overflow = previousBodyOverflow
      const video = reelVideoRef.current
      if (video) {
        video.pause()
        video.currentTime = 0
      }
    }
  }, [activeReelIndex, reelItems.length])

  useEffect(() => {
    if (activeReelIndex === null || !reelVideoRef.current) return
    reelVideoRef.current.play().catch(() => {})
  }, [activeReelIndex])

  function closeReelViewer() {
    const video = reelVideoRef.current
    if (video) {
      video.pause()
      video.currentTime = 0
    }
    setActiveReelIndex(null)
  }

  function handleReelTouchStart(event) {
    reelTouchStartY.current = event.touches[0].clientY
  }

  function handleReelTouchEnd(event) {
    if (reelTouchStartY.current === null || reelItems.length < 2) return

    const distance = reelTouchStartY.current - event.changedTouches[0].clientY
    reelTouchStartY.current = null

    if (Math.abs(distance) < 50) return

    setActiveReelIndex((index) =>
      distance > 0
        ? (index + 1) % reelItems.length
        : (index - 1 + reelItems.length) % reelItems.length
    )
  }

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
        </div>
        {isFiltered && (
          <p className="skilter-filter-hint">
            Showing skills in <strong>{activeCategory}</strong>
          </p>
        )}
      </div>

      {!loading && !error && reelItems.length > 0 && (
        <section className="skilter-reels" aria-labelledby="skilter-reels-title">
          <div className="skilter-reels__header">
            <div>
              <h2 id="skilter-reels-title">See skills in action</h2>
            </div>
          </div>

          <div className="skilter-reels__row">
            {reelItems.map((reel, index) => (
              <div className="skilter-reel-item" key={reel.id}>
                <article
                  className="skilter-reel-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${reel.skillName} reel`}
                  onClick={() => setActiveReelIndex(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setActiveReelIndex(index)
                    }
                  }}
                >
                  <video
                    src={reel.videoUrl}
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="skilter-reel-card__overlay">
                    <div>
                      <h3>{reel.skillName}</h3>
                      <p>{reel.teacherName}</p>
                    </div>
                  </div>
                </article>
                <SkillWishlistButton
                  skillId={reel.skillId}
                  className="skilter-reel-wishlist"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {activeReel && (
        <div
          className="skilter-reel-viewer"
          role="presentation"
          onClick={closeReelViewer}
        >
          <div
            className="skilter-reel-viewer__dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`${activeReel.skillName} reel`}
            onClick={(event) => event.stopPropagation()}
            onTouchStart={handleReelTouchStart}
            onTouchEnd={handleReelTouchEnd}
          >
            <video
              key={activeReel.id}
              ref={reelVideoRef}
              src={activeReel.videoUrl}
              autoPlay
              controls
              playsInline
              preload="auto"
            />
            <div className="skilter-reel-viewer__caption">
              <h2>{activeReel.skillName}</h2>
              <p>{activeReel.teacherName}</p>
            </div>
            <button
              type="button"
              className="skilter-reel-viewer__close"
              aria-label="Close reel viewer"
              onClick={closeReelViewer}
            >
              <X size={22} />
            </button>
            {reelItems.length > 1 && (
              <div className="skilter-reel-viewer__navigation">
                <button
                  type="button"
                  aria-label="Previous reel"
                  onClick={() => setActiveReelIndex((index) => (index - 1 + reelItems.length) % reelItems.length)}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  aria-label="Next reel"
                  onClick={() => setActiveReelIndex((index) => (index + 1) % reelItems.length)}
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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