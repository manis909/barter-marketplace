import { useState } from 'react'
import './MyListings.css'

const categories = ['Books', 'Electronics', 'Clothes', 'Shoes', 'Home', 'Kitchen', 'Sports', 'Accessories']
const conditions = ['Excellent', 'Very Good', 'Good', 'Fair']

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

  return (
    <section className="my-listings-page">
      <div className="my-listings-header">
        <div>
          <p className="page-label">My Listings</p>
          <h1>Manage your active listings</h1>
          <p className="page-description">
            Add new listings, update your offers, and keep your inventory visible to the Barter community.
          </p>
        </div>
        <button type="button" className="primary-button" onClick={() => setIsFormOpen((prev) => !prev)}>
          + Add New Listing
        </button>
      </div>

      {isFormOpen && (
        <form className="listing-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Upload Images
              <input type="file" accept="image/*" multiple onChange={handleFileChange} />
            </label>
            <label>
              Title
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Elegant leather bag"
                required
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe what makes this item special for trade."
                rows="5"
                required
              />
            </label>
            <label>
              Category
              <select name="category" value={form.category} onChange={handleChange}>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Item Condition
              <select name="condition" value={form.condition} onChange={handleChange}>
                {conditions.map((condition) => (
                  <option key={condition} value={condition}>{condition}</option>
                ))}
              </select>
            </label>
            <label>
              Desired Item
              <input
                type="text"
                name="desiredItem"
                value={form.desiredItem}
                onChange={handleChange}
                placeholder="What are you looking to trade for?"
                required
              />
            </label>
            <label>
              Coin Value
              <input
                type="number"
                name="coinValue"
                value={form.coinValue}
                onChange={handleChange}
                placeholder="Enter coin value"
                required
              />
            </label>
          </div>

          <div className="form-footer">
            <button type="submit" className="primary-button">
              Upload Item
            </button>
          </div>
        </form>
      )}

      {listings.length === 0 ? (
        <div className="empty-state">
          <p>You haven't listed any items yet.</p>
          {!isFormOpen && (
            <button type="button" className="primary-button" onClick={() => setIsFormOpen(true)}>
              + Add New Listing
            </button>
          )}
        </div>
      ) : (
        <div className="listings-grid">
          {listings.map((item) => (
            <article key={item.id} className="listing-card">
              <div className="listing-card__media">
                <img src={item.image} alt={item.title || item.name} />
              </div>
              <div className="listing-card__content">
                <div className="listing-card__meta">
                  <span>{item.category}</span>
                  <span>{item.condition}</span>
                </div>
                <h3>{item.title || item.name}</h3>
                <p>{item.description || item.name}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
