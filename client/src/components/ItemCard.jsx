import { Link } from 'react-router-dom'
import './ItemCard.css'

export default function ItemCard({ item }) {
  return (
    <article className="item-card">
      <div className="item-media">
        <img src={item.image} alt={item.title} />
        <button type="button" className="wishlist-button" aria-label="Add to wishlist">
          ♥
        </button>
      </div>
      <div className="item-content">
        <div className="item-meta">
          <span>{item.category}</span>
          <span>{item.condition}</span>
        </div>
        <h3>{item.title}</h3>
        <div className="item-rating">
          <span>Owner {item.ownerRating.toFixed(1)}</span>
          <span>Trade {item.tradeRating.toFixed(1)}</span>
        </div>
      </div>
      <div className="item-actions">
        <button type="button" className="secondary-button">Offer Trade</button>
        <Link to={`/item/${item.id}`} className="primary-button">View Details</Link>
      </div>
    </article>
  )
}
