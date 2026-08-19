import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { X, ArrowRightLeft, Star, RotateCcw, Sparkles, Tag } from 'lucide-react'
import './MobileSwipeDeck.css'

export default function MobileSwipeDeck({ items = [], onClose }) {
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [exitDirection, setExitDirection] = useState(null)

  // Motion values for swipe drag physics
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-150, 150], [-12, 12])
  const passOpacity = useTransform(x, [-100, -20], [1, 0])
  const tradeOpacity = useTransform(x, [20, 100], [0, 1])

  const activeItem = items[currentIndex]
  const isEnd = currentIndex >= items.length

  const handleDragEnd = (event, info) => {
    const offset = info.offset.x
    const velocity = info.velocity.x

    if (offset > 90 || velocity > 400) {
      // Swipe Right -> Trade Interest
      setExitDirection('right')
      setTimeout(() => {
        if (activeItem) {
          navigate(`/item/${activeItem.id}`)
        }
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

  const handleTradeInterest = () => {
    if (!activeItem) return
    setExitDirection('right')
    setTimeout(() => {
      navigate(`/item/${activeItem.id}`)
      setCurrentIndex((prev) => prev + 1)
      setExitDirection(null)
    }, 150)
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setExitDirection(null)
  }

  if (items.length === 0) {
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

  const nextItem = items[currentIndex + 1]

  return (
    <div className="swipe-deck-wrapper">
      <div className="swipe-deck-header">
        <span className="deck-counter">
          {currentIndex + 1} of {items.length}
        </span>
        <span className="deck-hint">Swipe right to trade • Left to skip</span>
        {onClose && (
          <button
            type="button"
            className="deck-header-close-btn"
            onClick={onClose}
            aria-label="Exit Swipe Mode"
            title="Exit Swipe Mode"
          >
            <X size={18} />
          </button>
        )}
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
                TRADE
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
          onClick={handleTradeInterest}
          aria-label="Trade interest"
        >
          <ArrowRightLeft size={22} />
          <span>Trade Interest</span>
        </button>
      </div>
    </div>
  )
}
