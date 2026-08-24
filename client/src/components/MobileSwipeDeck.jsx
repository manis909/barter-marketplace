import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { X, Heart, Star, RotateCcw, Sparkles, Tag, Layers } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { addWishlist } from '../services/tradeService'
import './MobileSwipeDeck.css'

export default function MobileSwipeDeck({ items = [], onClose }) {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [exitDirection, setExitDirection] = useState(null)

  // Motion values for swipe drag physics
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-150, 150], [-12, 12])
  const passOpacity = useTransform(x, [-100, -20], [1, 0])
  const tradeOpacity = useTransform(x, [20, 100], [0, 1])

  // ── Stack order: New items on top, randomized older items underneath ──
  const deckItems = useMemo(() => {
    if (!items || items.length === 0) return []

    const newItems = []
    const olderItems = []

    for (const item of items) {
      if (item.isNew || item.status === 'new') {
        newItems.push(item)
      } else {
        olderItems.push(item)
      }
    }

    // Shuffle older items pseudo-randomly so every session feels fresh
    const shuffledOlder = [...olderItems]
    for (let i = shuffledOlder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffledOlder[i], shuffledOlder[j]] = [shuffledOlder[j], shuffledOlder[i]]
    }

    // Fallback if no items explicitly flagged as new: top 3 newest by ID first, shuffle rest
    if (newItems.length === 0 && items.length > 0) {
      const newestFirst = [...items].sort((a, b) => (b.id || 0) - (a.id || 0))
      const topNew = newestFirst.slice(0, Math.min(3, newestFirst.length))
      const rest = newestFirst.slice(Math.min(3, newestFirst.length))
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[rest[i], rest[j]] = [rest[j], rest[i]]
      }
      return [...topNew, ...rest]
    }

    return [...newItems, ...shuffledOlder]
  }, [items])

  const activeItem = deckItems[currentIndex]
  const isEnd = currentIndex >= deckItems.length

  const handleDragEnd = (event, info) => {
    const offset = info.offset.x
    const velocity = info.velocity.x

    if (offset > 90 || velocity > 400) {
      // Swipe Right -> Wishlist item
      setExitDirection('right')
      if (activeItem && currentUser) {
        addWishlist(activeItem.id).catch((err) => console.error('Wishlist error:', err))
      }
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1)
        setExitDirection(null)
      }, 150)
    } else if (offset < -90 || velocity < -400) {
      // Swipe Left -> Skip
      setExitDirection('left')
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1)
        setExitDirection(null)
      }, 150)
    }
  }

  const handlePass = () => {
    setExitDirection('left')
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1)
      setExitDirection(null)
    }, 150)
  }

  const handleWishlist = async () => {
    if (!activeItem) return
    if (!currentUser) {
      navigate('/login')
      return
    }

    setExitDirection('right')
    try {
      await addWishlist(activeItem.id)
    } catch (err) {
      console.error('Failed to add to wishlist from swipe deck:', err)
    }

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1)
      setExitDirection(null)
    }, 150)
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setExitDirection(null)
  }

  if (deckItems.length === 0) {
    return (
      <div className="swipe-deck-empty">
        <Sparkles size={32} className="empty-icon" />
        <p className="empty-title">No items to discover right now</p>
        <span className="empty-desc">Check back soon for new local listings!</span>
        {onClose && (
          <button type="button" className="deck-reset-btn" onClick={onClose} style={{ marginTop: 16 }}>
            Close Swipe Mode
          </button>
        )}
      </div>
    )
  }

  if (isEnd) {
    return (
      <div className="swipe-deck-completed">
        <div className="completed-badge">
          <Sparkles size={28} />
        </div>
        <h3>You've reviewed all items!</h3>
        <p>Want to see the marketplace deck from the beginning?</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" className="deck-reset-btn" onClick={handleReset}>
            <RotateCcw size={18} />
            <span>Start Over</span>
          </button>
          {onClose && (
            <button type="button" className="deck-reset-btn" onClick={onClose}>
              <span>Exit</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  const nextItem = deckItems[currentIndex + 1]

  return (
    <div className="swipe-deck-wrapper">
      {/* Clean Single Navigation Header */}
      <div className="swipe-deck-header">
        <div className="deck-header-title-box">
          <Layers size={18} className="deck-title-icon" />
          <span className="deck-title-text">Swipe Discovery</span>
        </div>

        <span className="deck-counter-pill">
          {currentIndex + 1} / {deckItems.length}
        </span>

        {onClose && (
          <button
            type="button"
            className="deck-header-close-btn"
            onClick={onClose}
            aria-label="Close Swipe Mode"
            title="Close Swipe Mode"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="deck-sub-hint">
        <span>Swipe right to wishlist • Left to pass</span>
      </div>

      <div className="swipe-card-stack">
        {/* Background next card (gives depth stack effect) */}
        {nextItem && (
          <div className="swipe-card swipe-card-bg">
            <div className="swipe-card-img-wrap">
              <img src={nextItem.image} alt={nextItem.title} />
            </div>
            <div className="swipe-card-info">
              <h4>{nextItem.title}</h4>
            </div>
          </div>
        )}

        {/* Foreground active swipable card */}
        <AnimatePresence mode="popLayout">
          {activeItem && (
            <motion.div
              key={activeItem.id}
              className="swipe-card swipe-card-active"
              style={{ x, rotate }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={handleDragEnd}
              animate={
                exitDirection === 'left'
                  ? { x: -300, opacity: 0, transition: { duration: 0.15 } }
                  : exitDirection === 'right'
                  ? { x: 300, opacity: 0, transition: { duration: 0.15 } }
                  : { x: 0, opacity: 1 }
              }
              whileTap={{ cursor: 'grabbing' }}
            >
              {/* Overlay badges during drag */}
              <motion.div className="swipe-overlay pass-overlay" style={{ opacity: passOpacity }}>
                PASS
              </motion.div>
              <motion.div className="swipe-overlay trade-overlay" style={{ opacity: tradeOpacity }}>
                WISHLIST
              </motion.div>

              {/* Main Image */}
              <div
                className="swipe-card-img-wrap"
                onClick={() => navigate(`/item/${activeItem.id}`)}
                role="button"
                tabIndex={0}
              >
                <img src={activeItem.image} alt={activeItem.title} loading="eager" />
                {activeItem.condition && (
                  <span className="swipe-card-condition-badge">
                    {activeItem.condition.replace('_', ' ')}
                  </span>
                )}
              </div>

              {/* Info section below image */}
              <div
                className="swipe-card-info"
                onClick={() => navigate(`/item/${activeItem.id}`)}
                role="button"
                tabIndex={0}
              >
                <div className="swipe-card-header-row">
                  <h3 className="swipe-card-title">{activeItem.title}</h3>
                  {activeItem.estimated_value && (
                    <span className="swipe-card-val">
                      ₹{parseFloat(activeItem.estimated_value).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div className="swipe-card-sub-row">
                  {activeItem.category && (
                    <span className="swipe-card-category">
                      <Tag size={12} />
                      {activeItem.category}
                    </span>
                  )}
                  <span className="swipe-card-owner">
                    <Star size={12} fill="#eab308" color="#eab308" />
                    {activeItem.ownerRating} • {activeItem.ownerName}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action controls below card */}
      <div className="swipe-actions-bar">
        <button
          type="button"
          className="swipe-action-btn btn-pass"
          onClick={handlePass}
          aria-label="Skip item"
        >
          <X size={24} />
          <span>Pass</span>
        </button>

        <button
          type="button"
          className="swipe-action-btn btn-trade"
          onClick={handleWishlist}
          aria-label="Add to Wishlist"
        >
          <Heart size={20} fill="#FFFFFF" color="#FFFFFF" />
          <span>Wishlist</span>
        </button>
      </div>
    </div>
  )
}
