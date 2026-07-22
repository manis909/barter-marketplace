import SearchBar from './SearchBar'
import './HeroBanner.css'

const heroChips = ['Verified Traders', 'AI Trade Matching', 'Safe Exchanges', 'Trusted Community']
const recentTrades = [
  { actor: 'Arjun', action: 'traded Headphones for Camera', time: '2m' },
  { actor: 'Sneha', action: 'traded Novels for Earbuds', time: '7m' },
  { actor: 'Rahul', action: 'traded Nike Shoes for Jeans', time: '14m' }
]

export default function HeroBanner({ search, onSearch }) {
  return (
    <section className="hero-banner">
      <div className="hero-main">
        <span className="hero-tag">NO MONEY. JUST TRADES.</span>
        <h1>
          Trade What You Want,
          <span>Get What You Need.</span>
        </h1>
        <p className="hero-description">
          Trade high-quality items across categories with a trusted barter community that keeps exchanges simple and safe.
        </p>

        <div className="hero-search-card">
          <SearchBar
            placeholder="Search items to trade..."
            value={search}
            onChange={onSearch}
          />
          <button type="button" className="primary-button hero-search-button">
            Search
          </button>
        </div>

        <div className="hero-tags">
          {heroChips.map((label) => (
            <span key={label} className="hero-chip">{label}</span>
          ))}
        </div>
      </div>

      <aside className="hero-sidebar">
        <div className="hero-stats-grid">
          <div className="hero-stat-card">
            <p className="hero-stat-label">Items Listed</p>
            <strong>12,400+</strong>
          </div>
          <div className="hero-stat-card">
            <p className="hero-stat-label">Trades Completed</p>
            <strong>8,200+</strong>
          </div>
          <div className="hero-stat-card">
            <p className="hero-stat-label">Active Traders</p>
            <strong>4,600+</strong>
          </div>
          <div className="hero-stat-card">
            <p className="hero-stat-label">Happy Exchanges</p>
            <strong>98%</strong>
          </div>
        </div>
      </aside>
    </section>
  )
}
