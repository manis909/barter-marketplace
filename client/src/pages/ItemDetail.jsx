import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import './ItemDetail.css'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function ItemDetailPage() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError('')

    fetch(`${apiBaseUrl}/api/items/${id}`, { signal: controller.signal })
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
      ownerRating: item.ownerRating ?? item.owner_rating ?? 4.5,
      tradeRating: item.tradeRating ?? item.trade_rating ?? 4.5,
      images: Array.isArray(item.image_urls) && item.image_urls.length > 0
        ? item.image_urls
        : (item.images && item.images.length > 0 ? item.images : [item.image || 'https://via.placeholder.com/900x600?text=Barter+Item'])
    }
  }, [item])

  const images = normalizedItem?.images || []
  const displayImage = selectedImage || images[0]

  if (loading) {
    return <div className="item-detail-page"><p>Loading item details...</p></div>
  }

  if (error || !normalizedItem) {
    return <div className="item-detail-page"><p>{error || 'Item not found.'}</p></div>
  }

  return (
    <div className="item-detail-page">
      <Link to="/explore" className="detail-back">
        ← Back to Explore
      </Link>
      <div className="detail-grid">
        <div className="detail-gallery">
          <img src={displayImage} alt={normalizedItem.title} className="detail-main-image" />
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
          <p className="detail-category">{normalizedItem.category} • {normalizedItem.condition}</p>
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
            <button type="button" className="primary-button detail-action">
              Offer Trade
            </button>
            <button
              type="button"
              className="secondary-button detail-action"
              onClick={() => openTradeModal(normalizedItem.id)}
            >
              Trade Item
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
