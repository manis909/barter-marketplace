import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import SearchBar from './SearchBar'
import ProfileDrawer from './ProfileDrawer'
import SkilterDrawer from './SkilterDrawer'
import NotificationBell from '../features/notifications/NotificationBell'
import { User, Home, ChevronDown } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { CATEGORY_META, normalizeCategory } from '../data/categories'
import { SKILTER_CATEGORY_META, normalizeSkilterCategory } from '../data/skilterCategories'
import './Navbar.css'

const CATEGORIES        = CATEGORY_META
const SKILTER_CATEGORIES = SKILTER_CATEGORY_META

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false)
  const desktopBrandRef = useRef(null)
  const mobileBrandRef = useRef(null)
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') || '')
  const [activeCategory, setActiveCategory] = useState(() => {
    const cat = new URLSearchParams(location.search).get('category')
    return cat ? normalizeCategory(cat) : 'All'
  })
  const [skilterCategory, setSkilterCategory] = useState(() => {
    const cat = new URLSearchParams(location.search).get('category')
    return cat ? normalizeSkilterCategory(cat) : 'All'
  })
  const [scrolled, setScrolled] = useState(false)
  const lastScrollY = useRef(0)
  const { currentUser } = useAuth()

  // Sync state with URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearch(params.get('search') || '')
    const cat = params.get('category')
    setActiveCategory(cat ? normalizeCategory(cat) : 'All')
    setSkilterCategory(cat ? normalizeSkilterCategory(cat) : 'All')
  }, [location.search])

  // Close brand dropdown on route change
  useEffect(() => {
    setBrandDropdownOpen(false)
  }, [location.pathname])

  // Close brand dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        desktopBrandRef.current && !desktopBrandRef.current.contains(event.target) &&
        mobileBrandRef.current && !mobileBrandRef.current.contains(event.target)
      ) {
        setBrandDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Direction-aware throttled scroll listener with hysteresis
  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY
          const prevY = lastScrollY.current
          const diff = currentY - prevY

          // Ignore tiny scroll jitter (< 8px)
          if (Math.abs(diff) >= 8) {
            setScrolled((prevScrolled) => {
              if (!prevScrolled && currentY > 110 && diff > 0) {
                return true
              }
              if (prevScrolled && (currentY < 30 || diff < -15)) {
                return false
              }
              return prevScrolled
            })
            lastScrollY.current = currentY
          }
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isExploreActive = location.pathname === '/explore' || location.pathname === '/' || location.pathname === '/skilter/explore' || location.pathname === '/skilter'
  const isSkilterActive = location.pathname.startsWith('/skilter') || location.pathname.startsWith('/skills')
  // Show the mobile category row on both Barter Explore and Skilter Explore
  const showCategoryRow = isExploreActive || isSkilterActive

  // ── Platform detection ───────────────────────────────────────────────────
  // Paths that are explicitly owned by a platform:
  const SKILTER_PREFIXES = ['/skilter', '/skills']
  const RENTER_PREFIXES  = ['/renter', '/rent']
  const BARTER_PREFIXES  = ['/explore', '/my-listings', '/my-trades', '/trade-requests',
                             '/wishlist', '/wallet', '/add-item', '/item/']

  // Paths that are platform-neutral (shared pages like Profile, Feedback, etc.)
  // When navigating to these, we keep whichever platform was active before.
  const isNeutralPath = (p) =>
    p.startsWith('/profile') ||
    p === '/feedback'        ||
    p === '/help'            ||
    p === '/notifications'   ||
    p === '/privacy'         ||
    p === '/terms'           ||
    p === '/chats'           ||
    p.startsWith('/chat/')   ||
    p === '/logout'

  // Remember the last explicitly-set platform so neutral pages don't reset it
  const lastPlatformRef = useRef('Barter')

  const currentPlatform = useMemo(() => {
    const p = location.pathname
    if (SKILTER_PREFIXES.some((prefix) => p.startsWith(prefix))) {
      lastPlatformRef.current = 'Skilter'
      return 'Skilter'
    }
    if (RENTER_PREFIXES.some((prefix) => p.startsWith(prefix))) {
      lastPlatformRef.current = 'Renter'
      return 'Renter'
    }
    if (BARTER_PREFIXES.some((prefix) => p.startsWith(prefix))) {
      lastPlatformRef.current = 'Barter'
      return 'Barter'
    }
    // Neutral path — return the last known platform instead of defaulting to Barter
    if (isNeutralPath(p)) {
      return lastPlatformRef.current
    }
    // Fallback for any other path (landing, login, etc.)
    lastPlatformRef.current = 'Barter'
    return 'Barter'
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

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
    (categoryName) => {
      setActiveCategory(categoryName)
      const params = new URLSearchParams(location.search)
      if (!categoryName || categoryName === 'All') {
        params.delete('category')
      } else {
        params.set('category', categoryName)
      }
      navigate({ pathname: '/explore', search: params.toString() ? `?${params.toString()}` : '' })
    },
    [location.search, navigate]
  )

  const handleSkilterCategoryClick = useCallback(
    (categoryName) => {
      setSkilterCategory(categoryName)
      const params = new URLSearchParams(location.search)
      if (!categoryName || categoryName === 'All') {
        params.delete('category')
      } else {
        params.set('category', categoryName)
      }
      navigate({ pathname: '/skilter', search: params.toString() ? `?${params.toString()}` : '' })
    },
    [location.search, navigate]
  )

  const activeCategoryObj = useMemo(
    () => CATEGORIES.find((c) => c.name === activeCategory) || CATEGORIES[0],
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
            {/* Desktop Left: Logo Dropdown */}
            <div className="navbar-left" ref={desktopBrandRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="navbar-brand navbar-brand-dropdown-trigger"
                onClick={() => setBrandDropdownOpen((prev) => !prev)}
                aria-expanded={brandDropdownOpen}
                aria-label="Select Platform"
              >
                <motion.div
                  className="navbar-mark"
                  whileHover={{ rotate: 180, scale: 1.08 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                >
                  ⇄
                </motion.div>
                <span className="navbar-logo">{currentPlatform}</span>
                <ChevronDown
                  size={16}
                  className={`brand-dropdown-chevron ${brandDropdownOpen ? 'open' : ''}`}
                />
              </button>

              <AnimatePresence>
                {brandDropdownOpen && (
                  <motion.div
                    className="brand-dropdown-menu"
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                  >
                    <button
                      type="button"
                      className={`brand-dropdown-item ${currentPlatform === 'Barter' ? 'active' : ''}`}
                      onClick={() => {
                        setBrandDropdownOpen(false)
                        navigate('/explore')
                      }}
                    >
                      Barter
                    </button>
                    <button
                      type="button"
                      className={`brand-dropdown-item ${currentPlatform === 'Skilter' ? 'active' : ''}`}
                      onClick={() => {
                        setBrandDropdownOpen(false)
                        navigate('/skilter')
                      }}
                    >
                      Skilter
                    </button>
                    <button
                      type="button"
                      className={`brand-dropdown-item ${currentPlatform === 'Renter' ? 'active' : ''}`}
                      onClick={() => {
                        setBrandDropdownOpen(false)
                        navigate('/renter')
                      }}
                    >
                      Renter
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
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
              <Link 
                to={currentPlatform === 'Skilter' ? '/skilter/explore' : '/explore'} 
                className="navbar-link" 
                style={{ position: 'relative' }}
              >
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

              {currentUser?.is_admin && (
                <Link to="/admin/verification" className="navbar-link">Admin</Link>
              )}

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
    {currentUser.profile_image ? (
      <img src={currentUser.profile_image} alt="Profile" className="profile-icon-image" />
    ) : (
      <User className="profile-icon" size={20} />
    )}
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
            {/* ROW 1: Logo Dropdown (Left) & Home + Notifications + Profile (Right) */}
            <div className={`mobile-row-1 ${brandDropdownOpen ? 'dropdown-open' : ''}`}>
              <div ref={mobileBrandRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="navbar-brand navbar-brand-dropdown-trigger"
                  onClick={() => setBrandDropdownOpen((prev) => !prev)}
                  aria-expanded={brandDropdownOpen}
                  aria-label="Select Platform"
                >
                  <motion.div
                    className="navbar-mark mobile-mark"
                    whileHover={{ rotate: 180, scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    ⇄
                  </motion.div>
                  <span className="navbar-logo mobile-logo">{currentPlatform}</span>
                  <ChevronDown
                    size={16}
                    className={`brand-dropdown-chevron ${brandDropdownOpen ? 'open' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {brandDropdownOpen && (
                    <motion.div
                      className="brand-dropdown-menu mobile-brand-dropdown-menu"
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                    >
                      <button
                        type="button"
                        className={`brand-dropdown-item ${currentPlatform === 'Barter' ? 'active' : ''}`}
                        onClick={() => {
                          setBrandDropdownOpen(false)
                          navigate('/explore')
                        }}
                      >
                        Barter
                      </button>
                      <button
                        type="button"
                        className={`brand-dropdown-item ${currentPlatform === 'Skilter' ? 'active' : ''}`}
                        onClick={() => {
                          setBrandDropdownOpen(false)
                          navigate('/skilter')
                        }}
                      >
                        Skilter
                      </button>
                      <button
                        type="button"
                        className={`brand-dropdown-item ${currentPlatform === 'Renter' ? 'active' : ''}`}
                        onClick={() => {
                          setBrandDropdownOpen(false)
                          navigate('/renter')
                        }}
                      >
                        Renter
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mobile-actions-right">
                {/* Mobile Home Button (🏠) */}
                <Link 
                  to={currentPlatform === 'Skilter' ? '/skilter/explore' : '/explore'} 
                  className="mobile-home-btn" 
                  aria-label="Explore Home"
                >
                  <Home size={18} className="mobile-home-icon" />
                </Link>

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
    {currentUser.profile_image ? (
      <img src={currentUser.profile_image} alt="Profile" className="profile-icon-image" />
    ) : (
      <User className="profile-icon" size={18} />
    )}
  </motion.button>
) : (
                  <Link to="/login" className="navbar-link navbar-login-btn mobile-login-btn">
                    Login
                  </Link>
                )}
              </div>
            </div>

            {/* ROW 2: Search Bar */}
            <div className={`mobile-row-2 ${brandDropdownOpen ? 'dropdown-open' : ''}`}>
              <SearchBar
                placeholder="Search items to trade..."
                value={search}
                onChange={handleSearchChange}
                onSearch={handleSearch}
                onSelect={handleSelect}
              />
            </div>

            {/* ROW 3: Categories (Render ONLY on Explore page when Profile Drawer is closed and not scrolled down) */}
            <AnimatePresence initial={false}>
              {showCategoryRow && !drawerOpen && !scrolled && (
                <motion.div
                  key="mobile-category-row-wrapper"
                  className="mobile-row-3-collapse-wrapper"
                  initial={{ opacity: 0, y: -10, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto', marginTop: 4 }}
                  exit={{ opacity: 0, y: -10, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden', willChange: 'transform, opacity' }}
                >
                  <div className="mobile-row-3-categories-scroll">
                    <div className="categories-track">
                      {(isSkilterActive ? SKILTER_CATEGORIES : CATEGORIES).map((cat) => {
                        const activeCat = isSkilterActive ? skilterCategory : activeCategory
                        const isActive  = activeCat === cat.name
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            className={`category-chip ${isActive ? 'active' : ''}`}
                            onClick={() =>
                              isSkilterActive
                                ? handleSkilterCategoryClick(cat.name)
                                : handleCategoryClick(cat.name)
                            }
                            aria-label={`Category ${cat.name}`}
                            style={{
                              '--chip-color': cat.color,
                              '--chip-bg': cat.lightBg,
                            }}
                          >
                            {isActive && (
                              <span
                                className="active-chip-bg"
                                style={{ backgroundColor: cat.color }}
                              />
                            )}
                            <span className="chip-label">{cat.name}</span>
                          </button>
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

      {currentUser && currentPlatform !== 'Skilter' && (
        <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      )}
      {currentUser && currentPlatform === 'Skilter' && (
        <SkilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      )}
    </>
  )
}