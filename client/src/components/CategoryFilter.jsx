import './CategoryFilter.css'

const categories = ['All', 'Books', 'Electronics', 'Clothes', 'Shoes', 'Home', 'Kitchen', 'Sports', 'Accessories']
const categoryIcons = {
  All: '🧭',
  Books: '📚',
  Electronics: '🔌',
  Clothes: '👚',
  Shoes: '👟',
  Home: '🏠',
  Kitchen: '🍽️',
  Sports: '🏀',
  Accessories: '⌚'
}

export default function CategoryFilter({ activeCategory, onSelect }) {
  return (
    <section className="category-filter">
      <h2>Browse categories</h2>
      <div className="category-grid">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={category === activeCategory ? 'category-pill active' : 'category-pill'}
            onClick={() => onSelect(category)}
          >
            <span className="category-icon" aria-hidden="true">{categoryIcons[category]}</span>
            <span>{category}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
