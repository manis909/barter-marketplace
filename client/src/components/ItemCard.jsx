import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, User, Star } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import api from '../services/api'
import { addWishlist, removeWishlist, getWishlist } from '../services/tradeService'
import './ItemCard.css'

export default function ItemCard({ item }) {
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const image = item.image || item.image_urls?.[0] || 'https://via.placeholder.com/300x220?text=Barter'
  const condition = item.condition || item.item_condition || 'Good'
  const category = item.category || 'General'

  const ownerRating = typeof item.ownerRating === 'number'
    ? item.ownerRating
    : (typeof item.owner_rating === 'number' ? item.owner_rating : 4.5)

  const ownerName = item.ownerName || item.owner_name || 'Owner'

  // Trade modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [myItems, setMyItems] = useState([])
  const [selectedOfferedItemId, setSelectedOfferedItemId] = useState('')
  const [tradeMessage, setTradeMessage] = useState('')
  const [loadingItems, setLoadingItems] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [tradeError, setTradeError] = useState('')

  // Wishlist state
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function checkWishlistStatus() {
      if (!currentUser) return
      try {
        const data = await getWishlist()
        const wishlistItems = data.items || data.wishlist || (Array.isArray(data) ? data : [])
        const isWishlisted = wishlistItems.some((w) => {
          const wId = w.item_id || w.id || (w.item && w.item.id)
          return wId === item.id
        })
        if (!cancelled) {
          setWishlisted(isWishlisted)
        }
      } catch (err) {
        console.error('Failed to check wishlist status:', err)
      }
    }

    checkWishlistStatus()

    return () => { cancelled = true }
  }, [item.id, currentUser])

  async function handleOfferTradeClick() {
    if (!currentUser) {
      navigate('/login')
      return
    }

    setTradeError('')
    setModalOpen(true)
    setLoadingItems(true)

    try {
      const res = await api.get('/items/mine')
      const available = (res.data.items || []).filter((i) => i.status === 'available')
      setMyItems(available)
      if (available.length > 0) setSelectedOfferedItemId(available[0].id)
    } catch {
      setTradeError('Could not load your items. Please try again.')
    } finally {
      setLoadingItems(false)
    }
  }

  async function handleSubmitTrade(e) {
    e.preventDefault()
    if (!selectedOfferedItemId) {
      setTradeError('Please select an item to offer.')
      return
    }
    setSubmitting(true)
    setTradeError('')
    try {
      await api.post('/trades', {
        offered_item_id: selectedOfferedItemId,
        requested_item_id: item.id,
        message: tradeMessage,
      })
      setModalOpen(false)
      navigate('/my-trades')
    } catch (err) {
      setTradeError(err.response?.data?.error || 'Failed to send trade offer.')
    } finally {
      setSubmitting(false)
    }
  }

  function closeModal() {
    setModalOpen(false)
    setTradeError('')
    setTradeMessage('')
  }

  async function handleWishlistToggle(e) {
    e.stopPropagation()
    if (!currentUser) {
      navigate('/login')
      return
    }
    if (wishlistLoading) return
    setWishlistLoading(true)
    try {
      if (wishlisted) {
        await removeWishlist(item.id)
        setWishlisted(false)
      } else {
        await addWishlist(item.id)
        setWishlisted(true)
      }
    } catch (err) {
      console.error('Wishlist toggle failed:', err)
    } finally {
      setWishlistLoading(false)
    }
  }

  const isOwner = currentUser && currentUser.id === item.owner_id

  return (
    <>
      <motion.article
        className="compact-item-card"
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
      >
        {/* Image Media Container */}
        <div className="card-media-wrapper">
          <img src={image} alt={item.title} className="card-image" />
          <button
            type="button"
            className={`glass-wishlist-btn ${wishlisted ? 'wishlisted' : ''}`}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            onClick={handleWishlistToggle}
            disabled={wishlistLoading}
          >
            <Heart
              size={15}
              className={`heart-icon ${wishlisted ? 'filled' : ''}`}
            />
          </button>
        </div>

        {/* Compact Content Density */}
        <div className="card-body">
          {/* Row 1: Category & Condition Pill Badges */}
          <div className="card-badges-row">
            <span className="pill-badge category-pill">{category}</span>
            <span className="pill-badge condition-pill">{condition}</span>
          </div>

          {/* Row 2: 2-Line Truncated Title */}
          <h3 className="card-title" title={item.title}>
            {item.title}
          </h3>

          {/* Row 3: Owner & Rating (Single Compact Row) */}
          <div className="card-owner-rating-row">
            <div className="owner-box">
              <User size={12} className="meta-icon" />
              <Link
                to={`/profile/${item.owner_id}`}
                onClick={(e) => e.stopPropagation()}
                className="owner-link"
              >
                {ownerName}
              </Link>
            </div>
            <div className="rating-box">
              <Star size={12} className="star-icon filled" />
              <span>{ownerRating.toFixed(1)}</span>
            </div>
          </div>

          {/* Row 4: Clean Icon-Free Equal-Width Buttons */}
          <div className="card-actions-row">
            {!isOwner && item.status === 'available' ? (
              <button
                type="button"
                className="btn-compact btn-compact-secondary"
                onClick={handleOfferTradeClick}
              >
                Offer Trade
              </button>
            ) : isOwner ? (
              <span className="card-status-pill owner-pill">Mine</span>
            ) : (
              <span className="card-status-pill unavailable-pill">Unavailable</span>
            )}
            <Link to={`/item/${item.id}`} className="btn-compact btn-compact-primary">
              View Details
            </Link>
          </div>
        </div>
      </motion.article>

      {/* Trade Proposal Modal */}
      {modalOpen && (
        <div className="trade-modal-backdrop" onClick={closeModal}>
          <div className="trade-modal-container" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Propose a Trade</h2>
            <p className="modal-subtitle">
              Offer one of your items in exchange for <strong>{item.title}</strong>.
            </p>

            {tradeError && (
              <div className="modal-error-banner">{tradeError}</div>
            )}

            {loadingItems ? (
              <p className="modal-loading-text">Loading your items...</p>
            ) : myItems.length === 0 ? (
              <>
                <p className="modal-warning-text">
                  You have no available items to trade. List one first!
                </p>
                <div className="modal-actions-row">
                  <button type="button" className="btn-modal-cancel" onClick={closeModal}>
                    Cancel
                  </button>
                  <Link to="/add-item" className="btn-modal-submit" onClick={closeModal}>
                    + Add Item
                  </Link>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmitTrade}>
                <label className="modal-label">Your Item to Offer:</label>
                <select
                  value={selectedOfferedItemId}
                  onChange={(e) => setSelectedOfferedItemId(e.target.value)}
                  className="modal-select"
                >
                  {myItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title} {i.estimated_value ? `(Est. $${i.estimated_value})` : ''}
                    </option>
                  ))}
                </select>

                <label className="modal-label">Message (Optional):</label>
                <textarea
                  rows={3}
                  placeholder="Hi! I'd love to swap my item..."
                  value={tradeMessage}
                  onChange={(e) => setTradeMessage(e.target.value)}
                  className="modal-textarea"
                />

                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-modal-submit" disabled={submitting}>
                    {submitting ? 'Sending...' : 'Send Trade Offer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}