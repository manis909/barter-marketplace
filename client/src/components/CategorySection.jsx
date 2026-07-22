import ItemCard from './ItemCard'
import './CategorySection.css'

export default function CategorySection({ title, items }) {
  return (
    <section className="item-section">
      <div className="item-section-header">
        <div>
          <h2>{title}</h2>
          <p>Curated selections to help you discover the best barter matches.</p>
        </div>
        <button type="button" className="view-all-button">
          View All
        </button>
      </div>
      <div className="item-grid">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}
