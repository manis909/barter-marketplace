import { useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  Eye,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  Repeat2,
  Search,
  Trash2,
  Trophy,
  Upload
} from 'lucide-react'
import './MyListings.css'

const categories = ['Books', 'Electronics', 'Clothes', 'Shoes', 'Home', 'Kitchen', 'Sports', 'Accessories']
const conditions = ['Excellent', 'Very Good', 'Good', 'Fair']
const filterOptions = ['All', 'Active', 'Pending', 'Completed']

export default function MyListingsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Books',
    condition: 'Excellent',
    desiredItem: '',
    coinValue: '',
    images: []
  })
  const [listings, setListings] = useState([])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files)
    setForm((prev) => ({ ...prev, images: files }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextId = String(listings.length + 1)
    const newListing = {
      id: nextId,
      title: form.title || 'New listing',
      category: form.category,
      condition: form.condition,
      ownerName: 'You',
      ownerRating: 4.9,
      tradeRating: 4.9,
      description: form.description,
      image: form.images[0]?.name ? URL.createObjectURL(form.images[0]) : 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80'
    }

    setListings((prev) => [newListing, ...prev])
    setForm({
      title: '',
      description: '',
      category: 'Books',
      condition: 'Excellent',
      desiredItem: '',
      coinValue: '',
      images: []
    })
    setIsFormOpen(false)
  }

  const activeListings = listings.length
  const pendingTrades = 0
  const completedTrades = 0

  return (
    <section className="my-listings-page">
      <header className="my-listings-hero">
        <div className="hero-copy">
          <div className="hero-badge">
            <Package size={16} />
            <span>My Listings</span>
          </div>
          <h1>Manage, edit and track all your listed items from one place.</h1>
          <p>
            Keep your inventory polished, visible, and ready for trade with a calmer, more premium workflow.
          </p>
        </div>
        <button type="button" className="primary-button" onClick={() => setIsFormOpen((prev) => !prev)}>
          <Plus size={18} />
          <span>Add New Listing</span>
        </button>
      </header>

      <div className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__icon">
            <Package size={18} />
          </div>
          <div>
            <p className="stat-card__label">Total Listings</p>
            <p className="stat-card__value">{listings.length}</p>
            <p className="stat-card__meta">Items currently live</p>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="stat-card__label">Active Listings</p>
            <p className="stat-card__value">{activeListings}</p>
            <p className="stat-card__meta">Ready for trade</p>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon">
            <Clock3 size={18} />
          </div>
          <div>
            <p className="stat-card__label">Pending Trades</p>
            <p className="stat-card__value">{pendingTrades}</p>
            <p className="stat-card__meta">Awaiting review</p>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-card__icon">
            <Trophy size={18} />
          </div>
          <div>
            <p className="stat-card__label">Completed Trades</p>
            <p className="stat-card__value">{completedTrades}</p>
            <p className="stat-card__meta">Successful swaps</p>
          </div>
        </article>
      </div>

      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input type="text" placeholder="Search your listings..." />
        </label>
        <div className="filter-chips">
          {filterOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={`filter-chip ${option === 'All' ? 'is-active' : ''}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {isFormOpen && (
        <form className="listing-form" onSubmit={handleSubmit}>
          <div className="form-heading">
            <div>
              <p className="section-eyebrow">Create Listing</p>
              <h2>Share a new item with the community</h2>
            </div>
            <p className="form-helper">Keep your offer details clear and compelling so swaps happen faster.</p>
          </div>

          <div className="form-grid">
            <div className="form-field form-field--full">
              <label>Upload Images</label>
              <div className="upload-area">
                <input type="file" accept="image/*" multiple onChange={handleFileChange} />
                <div className="upload-content">
                  <div className="upload-icon">
                    <Upload size={18} />
                  </div>
                  <span>Drop or browse images for this listing</span>
                  <small>PNG, JPG, or WebP</small>
                </div>
              </div>
            </div>

            <div className="form-field">
              <label>Title</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Elegant leather bag"
                required
              />
            </div>

            <div className="form-field">
              <label>Category</label>
              <select name="category" value={form.category} onChange={handleChange}>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="form-field form-field--full">
              <label>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe what makes this item special for trade."
                rows="5"
                required
              />
            </div>

            <div className="form-field">
              <label>Item Condition</label>
              <select name="condition" value={form.condition} onChange={handleChange}>
                {conditions.map((condition) => (
                  <option key={condition} value={condition}>{condition}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Desired Item</label>
              <input
                type="text"
                name="desiredItem"
                value={form.desiredItem}
                onChange={handleChange}
                placeholder="What are you looking to trade for?"
                required
              />
            </div>

            <div className="form-field">
              <label>Coin Value</label>
              <input
                type="number"
                name="coinValue"
                value={form.coinValue}
                onChange={handleChange}
                placeholder="Enter coin value"
                required
              />
            </div>
          </div>

          <div className="form-footer">
            <button type="submit" className="primary-button">
              <Upload size={18} />
              <span>Upload Item</span>
            </button>
          </div>
        </form>
      )}

      {listings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">
            <Package size={34} />
          </div>
          <h3>No Listings Yet</h3>
          <p>Start your barter journey by uploading your first item.</p>
          <p>Your listings will appear here once added.</p>
        </div>
      ) : (
        <div className="listings-grid">
          {listings.map((item) => (
            <article key={item.id} className="listing-card">
              <div className="listing-card__media">
                <img src={item.image} alt={item.title || item.name} />
              </div>
              <div className="listing-card__content">
                <div className="listing-card__top">
                  <div className="listing-card__badges">
                    <span className="badge badge--category">{item.category}</span>
                    <span className="badge badge--condition">{item.condition}</span>
                  </div>
                  <div className="listing-card__status">Active</div>
                </div>
                <h3>{item.title || item.name}</h3>
                <p>{item.description || item.name}</p>
                <div className="listing-card__divider" />
                <div className="listing-card__footer">
                  <div className="listing-card__meta">
                    <span className="meta-pill">
                      <Eye size={15} />
                      24 views
                    </span>
                    <span className="meta-pill">
                      <Repeat2 size={15} />
                      3 requests
                    </span>
                  </div>
                  <div className="listing-card__actions">
                    <button type="button" className="action-btn">
                      <Pencil size={14} />
                      <span>Edit</span>
                    </button>
                    <button type="button" className="action-btn action-btn--danger">
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
