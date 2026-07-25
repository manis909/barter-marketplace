import { Link } from 'react-router-dom'
import './ItemCard.css'

export default function ItemCard({ item }) {
  const image = item.image || item.image_urls?.[0] || 'https://via.placeholder.com/300x200?text=Barter+Item'
  const condition = item.condition || item.item_condition || 'good'
  const ownerRating = typeof item.ownerRating === 'number'
    ? item.ownerRating
    : (typeof item.owner_rating === 'number' ? item.owner_rating : 4.5)
  const tradeRating = typeof item.tradeRating === 'number'
    ? item.tradeRating
    : (typeof item.trade_rating === 'number' ? item.trade_rating : 4.5)
  const ownerName = item.ownerName || item.owner_name || 'Owner'

  return (
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
        <button type="button" className="secondary-button">Offer Trade</button>
        <Link to={`/item/${item.id}`} className="primary-button">View Details</Link>
      </div>
    </article>
  )
}
