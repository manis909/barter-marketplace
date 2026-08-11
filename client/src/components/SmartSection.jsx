/**
 * SmartSection
 * Reusable horizontal-scroll section for the Explore page smart rows.
 *
 * Props:
 *   title       {string}   Section heading
 *   subtitle    {string}   Optional muted sub-text below heading
 *   items       {array}    Normalised item objects (same shape as ItemCard expects)
 *   loading     {boolean}  Show skeleton placeholders
 *   seeAllHref  {string}   Optional URL for a "See all" link; omit to hide the link
 *   emptyText   {string}   Optional override for the hidden-state message (dev only)
 *
 * Behaviour:
 *   - Returns null when loading=false and items is empty → section disappears entirely
 *   - Shows SKELETON_COUNT skeleton cards while loading=true
 *   - Renders a horizontal scroll row of ItemCard components
 */
import ItemCard from './ItemCard'
import './SmartSection.css'

const SKELETON_COUNT = 5

export default function SmartSection({
  title,
  subtitle,
  items = [],
  loading = false,
  seeAllHref,
}) {
  // Hide completely when not loading and nothing to show
  if (!loading && items.length === 0) return null

  return (
    <section className="smart-section">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="smart-section__header">
        <div className="smart-section__titles">
          <h2 className="smart-section__title">{title}</h2>
          {subtitle && (
            <p className="smart-section__subtitle">{subtitle}</p>
          )}
        </div>
        {seeAllHref && !loading && items.length > 0 && (
          <a href={seeAllHref} className="smart-section__see-all">
            See all →
          </a>
        )}
      </div>

      {/* ── Scroll row ──────────────────────────────────────── */}
      <div className="smart-section__scroll-track">
        <div className="smart-section__row">
          {loading
            ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <div key={i} className="smart-section__skeleton" aria-hidden="true">
                  <div className="skeleton-media" />
                  <div className="skeleton-body">
                    <div className="skeleton-line skeleton-line--short" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line skeleton-line--medium" />
                    <div className="skeleton-actions">
                      <div className="skeleton-btn" />
                      <div className="skeleton-btn" />
                    </div>
                  </div>
                </div>
              ))
            : items.map((item) => (
                <div key={item.id} className="smart-section__card-wrap">
                  <ItemCard item={item} />
                </div>
              ))}
        </div>
      </div>
    </section>
  )
}
