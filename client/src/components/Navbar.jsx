import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import SearchBar from './SearchBar'
import ProfileDrawer from './ProfileDrawer'
import NotificationBell from '../features/notifications/NotificationBell'
import { User } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import './Navbar.css'

const CATEGORIES = [
  { id: 'all', name: 'All', color: '#3D6E63', lightBg: '#E4F0ED' },
  { id: 'books', name: 'Books', color: '#EA580C', lightBg: 'rgba(234, 88, 12, 0.12)' },
  { id: 'electronics', name: 'Electronics', color: '#2563EB', lightBg: 'rgba(37, 99, 235, 0.12)' },
  { id: 'gaming', name: 'Gaming', color: '#9333EA', lightBg: 'rgba(147, 51, 234, 0.12)' },
  { id: 'fashion', name: 'Fashion', color: '#DB2777', lightBg: 'rgba(219, 39, 119, 0.12)' },
  { id: 'home', name: 'Home', color: '#16A34A', lightBg: 'rgba(22, 163, 74, 0.12)' },
  { id: 'sports', name: 'Sports', color: '#059669', lightBg: 'rgba(5, 150, 105, 0.12)' },
  { id: 'music', name: 'Music', color: '#4F46E5', lightBg: 'rgba(79, 70, 229, 0.12)' },
  { id: 'others', name: 'Others', color: '#475569', lightBg: 'rgba(71, 85, 105, 0.12)' },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') || '')
  const [activeCategory, setActiveCategory] = useState(() => {
    const cat = new URLSearchParams(location.search).get('category')
    return cat ? cat.toLowerCase() : 'all'
  })
  const [scrolled, setScrolled] = useState(false)
  const { currentUser } = useAuth()

  // Sync state with URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearch(params.get('search') || '')
    const cat = params.get('category')
    setActiveCategory(cat ? cat.toLowerCase() : 'all')
  }, [location.search])

  // requestAnimationFrame throttled scroll listener with 80px / 20px hysteresis
  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY
          setScrolled((prev) => {
            if (!prev && y > 80) return true
            if (prev && y < 20) return false
            return prev
          })
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSearchChange = useCallback((event) => {
    setSearch(event.target.value)
  }, [])

  const handleSearch = useCallback(
    (query) => {
      const params = new URLSearchParams(location.search)
      if (query) {
        params.set('search', query)
      } else {
        params.delete('search')
      }
      navigate({ pathname: '/explore', search: params.toString() ? `?${params.toString()}` : '' })
    },
    [location.search, navigate]
  )

  const handleSelect = useCallback(
    (item) => {
      navigate(`/item/${item.id}`)
    },
    [navigate]
  )

  const handleCategoryClick = useCallback(
    (catId) => {
      setActiveCategory(catId)
      const params = new URLSearchParams(location.search)
      if (catId === 'all') {
        params.delete('category')
      } else {
        params.set('category', catId)
      }
      navigate({ pathname: '/explore', search: params.toString() ? `?${params.toString()}` : '' })
    },
    [location.search, navigate]
  )

  const isExploreActive = location.pathname === '/explore'
  const activeCategoryObj = useMemo(
    () => CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0],
    [activeCategory]
  )

  return (
    <>
      <header
        className={`navbar-wrapper ${scrolled ? 'is-scrolled' : ''}`}
        style={{
          '--active-accent-color': activeCategoryObj.color,
          '--active-accent-bg': activeCategoryObj.lightBg,
        }}
      >
        <div className="navbar-container">
          {/* DESKTOP LAYOUT (768px and above) */}
          <div className="navbar-desktop-row">
            {/* Desktop Left: Logo */}
            <div className="navbar-left">
              <Link to="/explore" className="navbar-brand" aria-label="Barter Home">
                <motion.div
                  className="navbar-mark"
                  whileHover={{ rotate: 180, scale: 1.08 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                >
                  ⇄
                </motion.div>
                <span className="navbar-logo">Barter</span>
              </Link>
            </div>

            {/* Desktop Center: Search Bar */}
            <div className="navbar-center">
              <SearchBar
                placeholder="Search items to trade..."
                value={search}
                onChange={handleSearchChange}
                onSearch={handleSearch}
                onSelect={handleSelect}
              />
            </div>

            {/* Desktop Right: Actions */}
            <div className="navbar-right">
              <Link to="/explore" className="navbar-link" style={{ position: 'relative' }}>
                Explore
                {isExploreActive && (
                  <motion.div
                    layoutId="navbar-underline"
                    className="active-underline"
                    style={{ backgroundColor: activeCategoryObj.color }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>

              {currentUser && <NotificationBell />}

              {currentUser ? (
                <motion.button
                  type="button"
                  className="profile-button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open profile drawer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <User className="profile-icon" size={20} />
                </motion.button>
              ) : (
                <Link to="/login" className="navbar-link navbar-login-btn">
                  Login
                </Link>
              )}
            </div>
          </div>

          {/* MOBILE LAYOUT (Below 768px) */}
          <div className={`navbar-mobile-wrapper ${scrolled ? 'mobile-scrolled' : ''}`}>
            {/* ROW 1: Logo (Left) & Notifications + Profile (Right) */}
            <div className="mobile-row-1">
              <Link to="/explore" className="navbar-brand" aria-label="Barter Home">
                <motion.div
                  className="navbar-mark mobile-mark"
                  whileHover={{ rotate: 180, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  ⇄
                </motion.div>
                <span className="navbar-logo mobile-logo">Barter</span>
              </Link>

              <div className="mobile-actions-right">
                {currentUser && <NotificationBell />}

                {currentUser ? (
                  <motion.button
                    type="button"
                    className="profile-button mobile-profile-btn"
                    onClick={() => setDrawerOpen(true)}
                    aria-label="Open profile drawer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <User className="profile-icon" size={18} />
                  </motion.button>
                ) : (
                  <Link to="/login" className="navbar-link navbar-login-btn mobile-login-btn">
                    Login
                  </Link>
                )}
              </div>
            </div>

            {/* ROW 2: Search Bar */}
            <div className="mobile-row-2">
              <SearchBar
                placeholder="Search items to trade..."
                value={search}
                onChange={handleSearchChange}
                onSearch={handleSearch}
                onSelect={handleSelect}
              />
            </div>

            {/* ROW 3: Collapsible Horizontally Scrollable Categories */}
            <AnimatePresence initial={false}>
              {!scrolled && (
                <motion.div
                  key="mobile-category-row-wrapper"
                  className="mobile-row-3-collapse-wrapper"
                  initial={{ opacity: 0, y: -12, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto', marginTop: 4 }}
                  exit={{ opacity: 0, y: -12, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.28, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden', willChange: 'transform, opacity' }}
                >
                  <div className="mobile-row-3-categories-scroll">
                    <div className="categories-track">
                      {CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat.id
                        return (
                          <motion.button
                            key={cat.id}
                            type="button"
                            className={`category-chip ${isActive ? 'active' : ''}`}
                            onClick={() => handleCategoryClick(cat.id)}
                            aria-label={`Category ${cat.name}`}
                            style={{
                              '--chip-color': cat.color,
                              '--chip-bg': cat.lightBg,
                            }}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                          >
                            {isActive && (
                              <motion.span
                                layoutId="active-cat-bg-mobile"
                                className="active-chip-bg"
                                style={{ backgroundColor: cat.color }}
                                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                              />
                            )}
                            <span className="chip-label">{cat.name}</span>
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {currentUser && <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
    </>
  )
}