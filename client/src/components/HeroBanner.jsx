import './HeroBanner.css'

export default function HeroBanner() {
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
