import './CategoryFilter.css'
import { CATEGORY_META } from '../data/categories'

/**
 * CategoryFilter
 *
 * Renders a row of category pills.
 *
 * Props:
 *   activeCategory  {string}    The currently selected category name
 *   onSelect        {function}  Called with the category name when clicked
 *   categories      {array}     Optional. Defaults to Barter's CATEGORY_META.
 *                               Pass SKILTER_CATEGORY_META for Skilter pages.
 *   heading         {string}    Optional heading. Defaults to "Browse categories".
 */
export default function CategoryFilter({
  activeCategory,
  onSelect,
  categories = CATEGORY_META,
  heading = 'Browse categories',
}) {
  return (
    <section className="category-filter">
      <h2>{heading}</h2>
      <div className="category-grid">
        {categories.map((category) => {
          const isActive =
            category.name === activeCategory ||
            (category.name === 'All' && (!activeCategory || activeCategory === 'All'))
          const Icon = category.icon
          return (
            <button
              key={category.id}
              type="button"
              className={isActive ? 'category-pill active' : 'category-pill'}
              onClick={() => onSelect(category.name)}
            >
              <span
                className="category-icon"
                aria-hidden="true"
              >
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