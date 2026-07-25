import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import api from '../services/api'
import './ItemCard.css'

export default function ItemCard({ item }) {
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const image = item.image || item.image_urls?.[0] || 'https://via.placeholder.com/300x200?text=Barter+Item'
  const condition = item.condition || item.item_condition || 'good'
  const ownerRating = typeof item.ownerRating === 'number'
    ? item.ownerRating
    : (typeof item.owner_rating === 'number' ? item.owner_rating : 4.5)
  const tradeRating = typeof item.tradeRating === 'number'
    ? item.tradeRating
    : (typeof item.trade_rating === 'number' ? item.trade_rating : 4.5)
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

    setTradeError('')
    setModalOpen(true)
    setLoadingItems(true)

    try {
      const res = await api.get('/items/mine')
      const available = (res.data.items || []).filter(i => i.status === 'available')
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

  const isOwner = currentUser && (currentUser.id === item.owner_id)

  return (
    <>
      <article className="item-card">
        <div className="item-media">
          <img src={image} alt={item.title} />
          <button type="button" className="wishlist-button" aria-label="Add to wishlist">
            ♥
          </button>
        </div>
        <div className="item-content">
          <div className="item-meta">
            <span>{item.category}</span>
            <span>{condition}</span>
          </div>
          <h3>{item.title}</h3>
          <div className="item-rating">
            <span>Owner {ownerName}</span>
            <span>Owner {ownerRating.toFixed(1)}</span>
            <span>Trade {tradeRating.toFixed(1)}</span>
          </div>
        </div>
        <div className="item-actions">
          {!isOwner && item.status === 'available' ? (
            <button
              type="button"
              className="secondary-button"
              onClick={handleOfferTradeClick}
            >
              Offer Trade
            </button>
          ) : isOwner ? (
            <span style={{ fontSize: 12, color: '#78716C', alignSelf: 'center' }}>Your listing</span>
          ) : (
            <span style={{ fontSize: 12, color: '#C8624B', alignSelf: 'center' }}>Unavailable</span>
          )}
          <Link to={`/item/${item.id}`} className="primary-button">View Details</Link>
        </div>
      </article>

      {/* Trade Proposal Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: 20,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: '#fff', borderRadius: 18, padding: 28,
              maxWidth: 460, width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: '#1C1917' }}>
              Propose a Trade
            </h2>
            <p style={{ fontSize: 13, color: '#57534E', margin: '0 0 18px' }}>
              Offer one of your items in exchange for <strong>{item.title}</strong>.
            </p>

            {tradeError && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FCA5A5',
                color: '#991B1B', padding: '9px 13px', borderRadius: 8,
                fontSize: 13, marginBottom: 14,
              }}>
                {tradeError}
              </div>
            )}

            {loadingItems ? (
              <p style={{ fontSize: 14, color: '#57534E' }}>Loading your items...</p>
            ) : myItems.length === 0 ? (
              <>
                <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 16 }}>
                  You have no available items to trade. List one first!
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="secondary-button" onClick={closeModal}>Cancel</button>
                  <Link to="/add-item" className="primary-button" onClick={closeModal}>+ Add Item</Link>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmitTrade}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C1917', marginBottom: 5 }}>
                  Your Item to Offer:
                </label>
                <select
                  value={selectedOfferedItemId}
                  onChange={e => setSelectedOfferedItemId(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: '1px solid #E4E2D9', fontSize: 14, marginBottom: 14,
                    background: '#F9F8F6',
                  }}
                >
                  {myItems.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.title} {i.estimated_value ? `(Est. $${i.estimated_value})` : ''}
                    </option>
                  ))}
                </select>

                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C1917', marginBottom: 5 }}>
                  Message (Optional):
                </label>
                <textarea
                  rows={3}
                  placeholder="Hi! I'd love to swap my item..."
                  value={tradeMessage}
                  onChange={e => setTradeMessage(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: '1px solid #E4E2D9', fontSize: 14, marginBottom: 18,
                    background: '#F9F8F6', resize: 'none',
                  }}
                />

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="secondary-button" onClick={closeModal} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-button" disabled={submitting}>
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
