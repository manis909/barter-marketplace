import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import api from '../services/api'
import WishlistButton from '../components/WishlistButton'
import './ItemDetail.css'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function ItemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const [item, setItem] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [touchStartX, setTouchStartX] = useState(null)

  // Trade Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [myItems, setMyItems] = useState([])
  const [selectedOfferedItemId, setSelectedOfferedItemId] = useState('')
  const [tradeMessage, setTradeMessage] = useState('')
  const [submittingTrade, setSubmittingTrade] = useState(false)
  const [tradeError, setTradeError] = useState('')
  const [loadingMyItems, setLoadingMyItems] = useState(false)

  useEffect(() => {
    if (!id) {
      setError('No item ID provided.')
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError('')
    setItem(null)

    fetch(`${apiBaseUrl}/items/${id}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Unable to load item details')
        }

        const data = await response.json()
        setItem(data.item)
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          return
        }

        setError('Unable to load item details right now.')
      })
      .finally(() => {
        setLoading(false)
      })

    return () => controller.abort()
  }, [id])

  const normalizedItem = useMemo(() => {
    if (!item) {
      return null
    }

    return {
      ...item,
      title: item.title || 'Untitled Item',
      description: item.description || 'No description provided.',
      category: item.category || 'Uncategorized',
      condition: item.condition || item.item_condition || 'good',
      ownerName: item.ownerName || item.owner_name || 'Owner',
      ownerId: item.owner_id || item.ownerId,
      ownerRating: item.ownerRating ?? item.owner_rating ?? 4.5,
      tradeRating: item.tradeRating ?? item.trade_rating ?? 4.5,
      images: Array.isArray(item.image_urls) && item.image_urls.length > 0
        ? item.image_urls
        : (item.images && item.images.length > 0 ? item.images : [item.image || 'https://via.placeholder.com/900x600?text=Barter+Item'])
    }
  }, [item])

  const images = normalizedItem?.images || []
  const displayImage = selectedImage || images[0]

  useEffect(() => {
    if (images.length > 0) {
      setSelectedImage((current) => (current && images.includes(current) ? current : images[0]))
    }
  }, [images])

  const activeImageIndex = useMemo(() => {
    if (!images.length) {
      return 0
    }

    const currentIndex = images.findIndex((photo) => photo === displayImage)
    return currentIndex >= 0 ? currentIndex : 0
  }, [displayImage, images])

  const showLeftArrow = images.length > 1 && activeImageIndex > 0
  const showRightArrow = images.length > 1 && activeImageIndex < images.length - 1

  function goToPreviousImage() {
    if (!showLeftArrow) {
      return
    }

    setSelectedImage(images[activeImageIndex - 1])
  }

  function goToNextImage() {
    if (!showRightArrow) {
      return
    }

    setSelectedImage(images[activeImageIndex + 1])
  }

  function handleTouchStart(event) {
    setTouchStartX(event.touches[0].clientX)
  }

  function handleTouchEnd(event) {
    if (touchStartX === null) {
      return
    }

    const deltaX = event.changedTouches[0].clientX - touchStartX
    if (deltaX < -50) {
      goToNextImage()
    } else if (deltaX > 50) {
      goToPreviousImage()
    }

    setTouchStartX(null)
  }

  async function openTradeModal() {
    if (!currentUser) {
      navigate('/login')
      return
    }

    setTradeError('')
    setIsModalOpen(true)
    setLoadingMyItems(true)

    try {
      const res = await api.get('/items/mine')
      const availableItems = (res.data.items || []).filter(i => i.status === 'available')
      setMyItems(availableItems)
      if (availableItems.length > 0) {
        setSelectedOfferedItemId(availableItems[0].id)
      }
    } catch (err) {
      setTradeError('Failed to fetch your available items.')
    } finally {
      setLoadingMyItems(false)
    }
  }

  async function handleSendTradeOffer(e) {
    e.preventDefault()
    if (!selectedOfferedItemId) {
      setTradeError('Please select an item to offer.')
      return
    }

    setSubmittingTrade(true)
    setTradeError('')

    try {
      await api.post('/trades', {
        offered_item_id: selectedOfferedItemId,
        requested_item_id: normalizedItem.id,
        message: tradeMessage,
      })

      setIsModalOpen(false)
      navigate('/my-trades')
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit trade proposal.'
      setTradeError(msg)
    } finally {
      setSubmittingTrade(false)
    }
  }

  if (loading) {
    return (
      <div className="item-detail-page">
        <p className="detail-loading">Loading item details...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="item-detail-page">
        <p>{error}</p>
      </div>
    )
  }

  if (!normalizedItem) {
    return (
      <div className="item-detail-page">
        <p>Item not found.</p>
      </div>
    )
  }

  const isOwner = currentUser && (currentUser.id === normalizedItem.ownerId)

  return (
    <div className="item-detail-page">
     <Link
  to="/explore"
  aria-label="Back to Explore"
  className="detail-back"
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '12px'
  }}
>
  <ArrowLeft size={20} />
</Link>
      <div className="detail-grid">
        <div className="detail-gallery">
          <div
            className="detail-image-shell"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img src={displayImage} alt={normalizedItem.title} className="detail-main-image" />
            <WishlistButton itemId={normalizedItem.id} />

            {images.length > 1 && (
              <>
                {showLeftArrow && (
                  <button
                    type="button"
                    className="detail-nav-button detail-nav-button-left"
                    onClick={goToPreviousImage}
                    aria-label="View previous image"
                  >
                    &lt;
                  </button>
                )}

                {showRightArrow && (
                  <button
                    type="button"
                    className="detail-nav-button detail-nav-button-right"
                    onClick={goToNextImage}
                    aria-label="View next image"
                  >
                    &gt;
                  </button>
                )}
              </>
            )}
          </div>
          <div className="detail-thumbs">
            {images.map((photo) => (
              <button
                key={photo}
                type="button"
                className={photo === displayImage ? 'thumb-button active' : 'thumb-button'}
                onClick={() => setSelectedImage(photo)}
              >
                <img src={photo} alt={normalizedItem.title} />
              </button>
            ))}
          </div>
        </div>

        <div className="detail-copy">
          <h1>{normalizedItem.title}</h1>
          <p className="detail-description">{normalizedItem.description}</p>
          <div className="detail-info-grid">
            <div>
              <span className="detail-label">Owner</span>
              <p>{normalizedItem.ownerName}</p>
            </div>
            <div>
              <span className="detail-label">Owner Rating</span>
              <p>{normalizedItem.ownerRating.toFixed(1)}</p>
            </div>
            <div>
              <span className="detail-label">Trade Rating</span>
              <p>{normalizedItem.tradeRating.toFixed(1)}</p>
            </div>
          </div>
          <div className="detail-info-grid">
            <div>
              <span className="detail-label">Status</span>
              <p>{normalizedItem.status}</p>
            </div>
            <div>
              <span className="detail-label">Category</span>
              <p>{normalizedItem.category}</p>
            </div>
            <div>
              <span className="detail-label">Condition</span>
              <p>{normalizedItem.condition}</p>
            </div>
          </div>
          <div className="detail-actions">
            {!isOwner && normalizedItem.status === 'available' ? (
              <button
                type="button"
                className="primary-button detail-action"
                onClick={openTradeModal}
              >
                Offer Trade
              </button>
            ) : isOwner ? (
              <p style={{ color: '#57534E', fontWeight: 600 }}>This is your listing.</p>
            ) : (
              <p style={{ color: '#C8624B', fontWeight: 600 }}>This item is no longer available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Trade Proposal Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: 28,
            maxWidth: 480,
            width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: '#1C1917' }}>Propose a Trade</h2>
            <p style={{ fontSize: 14, color: '#57534E', margin: '0 0 20px' }}>
              Select an item from your inventory to trade for <strong>{normalizedItem.title}</strong>.
            </p>

            {tradeError && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16
              }}>
                {tradeError}
              </div>
            )}

            {loadingMyItems ? (
              <p style={{ fontSize: 14, color: '#57534E' }}>Loading your items...</p>
            ) : myItems.length === 0 ? (
              <div>
                <p style={{ fontSize: 14, color: '#DC2626', marginBottom: 16 }}>
                  You don't have any available items to trade! Please list an item first.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <Link to="/add-item" className="primary-button">
                    + Add Item
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendTradeOffer}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C1917', marginBottom: 6 }}>
                    Select Your Offered Item:
                  </label>
                  <select
                    value={selectedOfferedItemId}
                    onChange={e => setSelectedOfferedItemId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #E4E2D9',
                      fontSize: 14,
                      background: '#F9F8F6'
                    }}
                  >
                    {myItems.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.title} (Est. Value ${i.estimated_value || '0'})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C1917', marginBottom: 6 }}>
                    Message to Owner (Optional):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Hi! I'd love to swap my item for yours..."
                    value={tradeMessage}
                    onChange={e => setTradeMessage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #E4E2D9',
                      fontSize: 14,
                      background: '#F9F8F6',
                      resize: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submittingTrade}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={submittingTrade}
                  >
                    {submittingTrade ? 'Sending Proposal...' : 'Send Trade Offer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}