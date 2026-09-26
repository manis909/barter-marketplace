import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import api from '../services/api'
import WishlistButton from './WishlistButton'
import VerificationRequiredModal from './VerificationRequiredModal'
import useVerificationStatus from '../hooks/useVerificationStatus'
import './ItemCard.css'

function formatConditionLabel(str) {
  if (!str) return 'Good'
  return String(str)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function ItemCard({ item }) {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { verificationStatus, rejectionReason, isVerified, loading: verificationLoading } = useVerificationStatus()
  const [showVerificationModal, setShowVerificationModal] = useState(false)

  const images = (Array.isArray(item.image_urls) && item.image_urls.length > 0)
    ? item.image_urls
    : (Array.isArray(item.images) && item.images.length > 0)
      ? item.images
      : [item.image || 'https://via.placeholder.com/300x220?text=Barter']

  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  // Auto-cycle image on hover if item has multiple images
  useEffect(() => {
    if (!isHovered || images.length <= 1) return

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length)
    }, 1500)

    return () => clearInterval(interval)
  }, [isHovered, images.length])

  const handlePrevImage = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const handleNextImage = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const currentImage = images[currentImageIndex] || images[0]
  const rawCondition = item.condition || item.item_condition || 'Good'
  const condition = formatConditionLabel(rawCondition)
  const category = item.category || 'General'

  const ownerName = item.ownerName || item.owner_name || 'Owner'

  // Trade modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [myItems, setMyItems] = useState([])
  const [selectedOfferedItemId, setSelectedOfferedItemId] = useState('')
  const [tradeMessage, setTradeMessage] = useState('')
  const [loadingItems, setLoadingItems] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [tradeError, setTradeError] = useState('')

  async function handleOfferTradeClick() {
    if (!currentUser) {
      navigate('/login')
      return
    }

    if (!isVerified && !verificationLoading) {
      setShowVerificationModal(true)
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

  const isOwner = currentUser && currentUser.id === item.owner_id

  return (
    <>
      <motion.article
        className="compact-item-card"
        role="link"
        tabIndex={0}
        aria-label={`View details for ${item.title}`}
        onClick={() => navigate(`/item/${item.id}`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate(`/item/${item.id}`)
          }
        }}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setCurrentImageIndex(0)
        }}
      >
        {/* Image Media Container */}
        <div className="card-media-wrapper">
          <img src={currentImage} alt={item.title} className="card-image" />
          <WishlistButton itemId={item.id} />

          {images.length > 1 && (
            <div className="card-image-dots">
              {images.map((_, index) => (
                <span
                  key={index}
                  className={`image-dot ${index === currentImageIndex ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setCurrentImageIndex(index)
                  }}
                />
              ))}
            </div>
          )}

          {images.length > 1 && isHovered && (
            <>
              <button
                type="button"
                className="image-nav-btn prev-btn"
                onClick={handlePrevImage}
                aria-label="Previous image"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="image-nav-btn next-btn"
                onClick={handleNextImage}
                aria-label="Next image"
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>

        {/* Compact Content Density (Amazon/Flipkart E-Commerce Style) */}
        <div className="card-body">
          {/* 1. Item Title (Single Bold Line) */}
          <h3 className="card-title" title={item.title}>
            {item.title}
          </h3>

          {/* 2. Owner Info Line */}
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
          </div>

          {/* 3. Action Buttons */}
          <div className="card-actions-row">
            {!isOwner && item.status === 'available' ? (
              <button
                type="button"
                className="btn-compact btn-compact-primary"
                onClick={handleOfferTradeClick}
              >
                Trade
              </button>
            ) : isOwner ? (
              <span className="card-status-badge owner-badge">Mine</span>
            ) : (
              <span className="card-status-badge unavailable-badge">Unavailable</span>
            )}
            <Link to={`/item/${item.id}`} className="btn-compact btn-compact-secondary">
              Details
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

      {showVerificationModal && (
        <VerificationRequiredModal
          status={verificationStatus}
          rejectionReason={rejectionReason}
          onClose={() => setShowVerificationModal(false)}
        />
      )}
    </>
  )
}