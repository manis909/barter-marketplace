import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import itemsData from '../data/items.json'
import './ItemDetail.css'

export default function ItemDetailPage() {
  const { id } = useParams()
  const [selectedImage, setSelectedImage] = useState(null)

  const item = useMemo(
    () => itemsData.find((entry) => entry.id === id) || itemsData[0],
    [id]
  )

  const images = item.images || [item.image]
  const displayImage = selectedImage || images[0]

  return (
    <div className="item-detail-page">
      <Link to="/explore" className="detail-back">
        ← Back to Explore
      </Link>
      <div className="detail-grid">
        <div className="detail-gallery">
          <img src={displayImage} alt={item.title} className="detail-main-image" />
          <div className="detail-thumbs">
            {images.map((photo) => (
              <button
                key={photo}
                type="button"
                className={photo === displayImage ? 'thumb-button active' : 'thumb-button'}
                onClick={() => setSelectedImage(photo)}
              >
                <img src={photo} alt={item.title} />
              </button>
            ))}
          </div>
        </div>

        <div className="detail-copy">
          <p className="detail-category">{item.category} • {item.condition}</p>
          <h1>{item.title}</h1>
          <p className="detail-description">{item.description}</p>
          <div className="detail-info-grid">
            <div>
              <span className="detail-label">Owner</span>
              <p>{item.ownerName}</p>
            </div>
            <div>
              <span className="detail-label">Owner Rating</span>
              <p>{item.ownerRating.toFixed(1)}</p>
            </div>
            <div>
              <span className="detail-label">Trade Rating</span>
              <p>{item.tradeRating.toFixed(1)}</p>
            </div>
          </div>
          <button type="button" className="primary-button detail-action">
            Offer Trade
          </button>
        </div>
      </div>
    </div>
  )
}
