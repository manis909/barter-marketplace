import { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Trophy,
  Upload,
  X
} from 'lucide-react'
import api from '../services/api'
import { uploadImageToSupabase } from '../services/supabase'
import { categoryNames } from '../data/categories'
import './MyListings.css'

const conditions = ['Excellent', 'Very Good', 'Good', 'Fair']
const filterOptions = ['All', 'Active', 'Pending', 'Completed']

const EMPTY_FORM = {
  title: '',
  description: '',
  category: '',
  condition: 'Excellent',
  desiredItem: '',
  coinValue: '',
  images: [],
  existingImageUrls: []
}

export default function MyListingsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imagePreviews, setImagePreviews] = useState([])
  const [listings, setListings] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isFormHighlighting, setIsFormHighlighting] = useState(false)
  const [message, setMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editingItemId, setEditingItemId] = useState(null)
  const createListingRef = useRef(null)

  // ── load listings ──────────────────────────────────────────────
  const loadMyListings = async () => {
    setLoading(true)
    try {
      const response = await api.get('/items/mine')
      setListings(Array.isArray(response.data.items) ? response.data.items : [])
    } catch (error) {
      console.error('Failed to load my listings', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMyListings()
  }, [])

  // ── form helpers ───────────────────────────────────────────────
  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files)
    console.log('Selected files:', files.map((f) => ({ name: f.name, size: f.size, type: f.type })))
    setForm((prev) => ({ ...prev, images: files }))
    setImagePreviews(files.map((f) => URL.createObjectURL(f)))
  }

  const removeNewImage = (index) => {
    const newImages = form.images.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setForm((prev) => ({ ...prev, images: newImages }))
    setImagePreviews(newPreviews)
  }

  const removeExistingImage = (index) => {
    setForm((prev) => ({
      ...prev,
      existingImageUrls: prev.existingImageUrls.filter((_, i) => i !== index)
    }))
  }

  const scrollToForm = () => {
    requestAnimationFrame(() => {
      createListingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setIsFormHighlighting(true)
      window.setTimeout(() => setIsFormHighlighting(false), 1500)
    })
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setImagePreviews([])
    setMessage('')
    setIsEditing(false)
    setEditingItemId(null)
  }

  // ── open create form ───────────────────────────────────────────
  const handleOpenCreateForm = () => {
    resetForm()
    setIsFormOpen(true)
    scrollToForm()
  }

  // ── edit handler ───────────────────────────────────────────────
  const handleEdit = (item) => {
    setIsEditing(true)
    setEditingItemId(item.id)
    setForm({
      title: item.title || '',
      description: item.description || '',
      category: item.category || '',
      condition: mapConditionToDisplay(item.item_condition) || item.condition || 'Excellent',
      desiredItem: item.desired_item || '',
      coinValue: item.estimated_value || '',
      images: [],
      existingImageUrls: Array.isArray(item.image_urls) ? item.image_urls : []
    })
    setImagePreviews([])
    setMessage('')
    setIsFormOpen(true)
    scrollToForm()
  }

  // ── cancel edit ────────────────────────────────────────────────
  const handleCancel = () => {
    resetForm()
    setIsFormOpen(false)
  }

  // ── submit (create or update) ──────────────────────────────────
  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      // Upload any newly selected images
      const newlyUploadedUrls = form.images.length > 0
        ? await Promise.all(
            form.images.map(async (file) => {
              const url = await uploadImageToSupabase(file)
              console.log('Uploaded:', file.name, url)
              return url
            })
          )
        : []

      // Final image list = kept existing + newly uploaded
      const finalImageUrls = [...form.existingImageUrls, ...newlyUploadedUrls]

      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        condition: form.condition,
        image_urls: finalImageUrls
      }

      if (isEditing) {
        // ── UPDATE existing listing ──
        console.log('Updating listing:', editingItemId, payload)
        const response = await api.put(`/items/${editingItemId}`, payload)
        const updated = response.data.item
        setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
        setMessage('Listing updated successfully!')
        resetForm()
        setIsFormOpen(false)
      } else {
        // ── CREATE new listing ──
        console.log('Creating listing:', payload)
        const response = await api.post('/items', payload)
        const created = response.data.item
        setListings((prev) => [created, ...prev])
        setMessage('Listing created successfully!')
        resetForm()
        setIsFormOpen(false)
      }
    } catch (error) {
      console.error('Listing submit error:', error)
      setMessage(error.response?.data?.error || error.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── stats ──────────────────────────────────────────────────────
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
        <button type="button" className="primary-button" onClick={handleOpenCreateForm}>
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

      {/* ── Create / Edit Form ───────────────────────────────────── */}
      {isFormOpen && (
        <form
          ref={createListingRef}
          className={`listing-form ${isFormHighlighting ? 'listing-form--highlight' : ''}`}
          onSubmit={handleSubmit}
        >
          <div className="form-heading">
            <div>
              <p className="section-eyebrow">{isEditing ? 'Edit Listing' : 'Create Listing'}</p>
              <h2>{isEditing ? 'Update your listing details' : 'Share a new item with the community'}</h2>
            </div>
            <p className="form-helper">Keep your offer details clear and compelling so swaps happen faster.</p>
          </div>

          <div className="form-grid">
            {/* Image upload */}
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

              {/* Existing images (when editing) */}
              {form.existingImageUrls.length > 0 && (
                <div className="image-preview-row">
                  {form.existingImageUrls.map((url, index) => (
                    <div key={`existing-${index}`} className="image-preview-item">
                      <img src={url} alt={`existing ${index + 1}`} />
                      <button
                        type="button"
                        className="image-remove-btn"
                        onClick={() => removeExistingImage(index)}
                        aria-label="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Newly selected image previews */}
              {imagePreviews.length > 0 && (
                <div className="image-preview-row">
                  {imagePreviews.map((src, index) => (
                    <div key={`new-${index}`} className="image-preview-item">
                      <img src={src} alt={`new preview ${index + 1}`} />
                      <button
                        type="button"
                        className="image-remove-btn"
                        onClick={() => removeNewImage(index)}
                        aria-label="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                required
              >
                <option value="">Select Category</option>
                {categoryNames.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
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
              />
            </div>
          </div>

          {message && <p className={`form-message ${message.includes('successfully') ? 'form-message--success' : 'form-message--error'}`}>{message}</p>}

          <div className="form-footer">
            {isEditing && (
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              <Upload size={18} />
              <span>
                {isSubmitting
                  ? (isEditing ? 'Saving Changes...' : 'Creating Listing...')
                  : (isEditing ? 'Save Changes' : 'Submit Listing')}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* ── Listings Grid ────────────────────────────────────────── */}
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
                <img
                  src={
                    Array.isArray(item.image_urls) && item.image_urls.length > 0
                      ? item.image_urls[0]
                      : item.image || '/placeholder.png'
                  }
                  alt={item.title || item.name}
                />
              </div>
              <div className="listing-card__content">
                <div className="listing-card__top">
                  <div className="listing-card__badges">
                    <span className="badge badge--category">{item.category}</span>
                    <span className="badge badge--condition">{mapConditionToDisplay(item.item_condition) || item.condition}</span>
                  </div>
                  <div
                    className="listing-card__status"
                    style={{
                      textTransform: 'capitalize',
                      background:
                        item.status === 'available' ? '#D1FAE5' :
                        item.status === 'traded' ? '#FEE2E2' : '#FEF3C7',
                      color:
                        item.status === 'available' ? '#065F46' :
                        item.status === 'traded' ? '#991B1B' : '#92400E',
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {item.status || 'available'}
                  </div>
                </div>
                <h3>{item.title || item.name}</h3>
                <p>{item.description}</p>
                <div className="listing-card__divider" />
                <div className="listing-card__footer">
                  <div className="listing-card__meta">
                    <span className="meta-pill">
                      Listed {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <div className="listing-card__actions">
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => handleEdit(item)}
                    >
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

// ── helpers ────────────────────────────────────────────────────────
// Map the DB enum value back to the display label used in the form
function mapConditionToDisplay(dbValue) {
  if (!dbValue) return ''
  const map = {
    like_new: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Fair',
    new: 'Excellent'
  }
  return map[dbValue.toLowerCase()] || dbValue
}
