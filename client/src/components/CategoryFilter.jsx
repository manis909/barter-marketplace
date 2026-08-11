import './CategoryFilter.css'
import { CATEGORY_META } from '../data/categories'

const categories = CATEGORY_META

export default function CategoryFilter({ activeCategory, onSelect }) {
  return (
    <section className="category-filter">
      <h2>Browse categories</h2>
      <div className="category-grid">
        {categories.map((category) => {
          const isActive = category.name === activeCategory
          const Icon = category.icon
          return (
            <button
              key={category.name}
              type="button"
              className={isActive ? 'category-pill active' : 'category-pill'}
              onClick={() => onSelect(category.name)}
            >
              <span className="category-icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span>{category.name}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}