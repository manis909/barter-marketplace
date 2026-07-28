import { Book, Cpu, Shirt, Home, Gamepad2, Music, Dumbbell, Package, LayoutGrid } from 'lucide-react'
import './CategoryFilter.css'
import { categoryNames } from '../data/categories'

const categories = ['All', ...categoryNames]

const categoryIcons = {
  All: LayoutGrid,
  Books: Book,
  Electronics: Cpu,
  'Fashion & Accessories': Shirt,
  'Home & Living': Home,
  Gaming: Gamepad2,
  'Musical Instruments': Music,
  'Sports & Fitness': Dumbbell,
  Others: Package
}

export default function CategoryFilter({ activeCategory, onSelect }) {
  return (
    <section className="category-filter">
      <h2>Browse categories</h2>
      <div className="category-grid">
        {categories.map((category) => {
          const Icon = categoryIcons[category]
          return (
            <button
              key={category}
              type="button"
              className={category === activeCategory ? 'category-pill active' : 'category-pill'}
              onClick={() => onSelect(category)}
            >
              <span className="category-icon" aria-hidden="true"><Icon size={18} /></span>
              <span>{category}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}