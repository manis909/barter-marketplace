import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import {
    ArrowLeft,
  Crop,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X
} from 'lucide-react'
import api from '../services/api'
import { uploadImageToSupabase } from '../services/supabase'
import { categoryNames } from '../data/categories'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import ImageCropModal from '../components/ImageCropModal'
import UndoToast from '../components/UndoToast'
import './MyListings.css'

const MAX_IMAGES = 3
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
  const [activeFilter, setActiveFilter] = useState('All')
  const createListingRef = useRef(null)

  // ── delete / undo state ────────────────────────────────────────
  const [confirmItem, setConfirmItem]     = useState(null)  // item pending confirmation
  const [pendingDelete, setPendingDelete] = useState(null)  // item removed but undoable
  const undoTimerRef     = useRef(null)
  // Keep a ref in sync with pendingDelete so async callbacks always
  // read the current value without creating stale closures.
  const pendingDeleteRef = useRef(null)

  // ── crop state ─────────────────────────────────────────────────
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropImageIndex, setCropImageIndex] = useState(null)
  const [cropImageSrc, setCropImageSrc] = useState(null)

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
    const selected = Array.from(event.target.files)
    // Count images already committed (existing URLs + new files already queued)
    const currentCount = form.existingImageUrls.length + form.images.length

    let incoming = selected
    let limitMessage = ''

    if (currentCount >= MAX_IMAGES) {
      // Already at the limit — reject all new files
      limitMessage = `You can upload a maximum of ${MAX_IMAGES} images per listing. Remove an image first.`
      incoming = []
    } else if (currentCount + selected.length > MAX_IMAGES) {
      // Trim to however many slots remain
      const slots = MAX_IMAGES - currentCount
      incoming = selected.slice(0, slots)
      limitMessage = `Only ${slots} more image${slots === 1 ? '' : 's'} allowed (max ${MAX_IMAGES}). ${selected.length - slots} file${selected.length - slots === 1 ? ' was' : 's were'} skipped.`
    }

    if (limitMessage) {
      setMessage(limitMessage)
    }

    if (incoming.length === 0) {
      // Reset the input so the same files can be re-selected after removing one
      event.target.value = ''
      return
    }

    console.log('Accepted files:', incoming.map((f) => ({ name: f.name, size: f.size })))

    // Append to existing new-image previews — do NOT revoke existing blob URLs
    const newPreviews = incoming.map((f) => URL.createObjectURL(f))

    setForm((prev) => ({ ...prev, images: [...prev.images, ...incoming] }))
    setImagePreviews((prev) => [...prev, ...newPreviews])

    // Reset the input value so the same file can be re-selected after removal
    event.target.value = ''
  }

  const removeNewImage = (index) => {
    URL.revokeObjectURL(imagePreviews[index])
    const newImages = form.images.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setForm((prev) => ({ ...prev, images: newImages }))
    setImagePreviews(newPreviews)
  }

  // ── crop handlers ──────────────────────────────────────────────
  // Open the crop modal for a specific image slot
  const handleOpenCrop = (index) => {
    setCropImageIndex(index)
    setCropImageSrc(imagePreviews[index])
    setCropModalOpen(true)
  }

  // User cancelled cropping — just close, leave the image untouched
  const handleCropCancel = () => {
    setCropModalOpen(false)
    setCropImageIndex(null)
    setCropImageSrc(null)
  }

  // User confirmed a crop — replace the File/Blob and preview at that slot
  const handleCropApply = (croppedBlob) => {
    const index = cropImageIndex
    setCropModalOpen(false)
    setCropImageIndex(null)
    setCropImageSrc(null)

    // Revoke the old preview URL, then build a new one from the blob
    URL.revokeObjectURL(imagePreviews[index])
    const newPreviewUrl = URL.createObjectURL(croppedBlob)

    setForm((prev) => {
      const updatedImages = [...prev.images]
      updatedImages[index] = croppedBlob
      return { ...prev, images: updatedImages }
    })
    setImagePreviews((prev) => {
      const updated = [...prev]
      updated[index] = newPreviewUrl
      return updated
    })
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

  // ── delete handler ─────────────────────────────────────────────
  const handleDelete = (item) => {
    console.log('Delete clicked, item.id:', item.id)
    setConfirmItem(item)
  }

  // User confirmed deletion in the modal
  const handleConfirmDelete = () => {
    const item = confirmItem
    setConfirmItem(null)

    // Optimistically remove from the visible list
    setListings((prev) => prev.filter((l) => l.id !== item.id))

    // Park the item so Undo can restore it; mirror to ref immediately
    pendingDeleteRef.current = item
    setPendingDelete(item)

    // Clear any previous undo timer
    clearTimeout(undoTimerRef.current)
  }

  // Undo clicked — restore the item to the list in its original position
  const handleUndo = () => {
    clearTimeout(undoTimerRef.current)
    const item = pendingDeleteRef.current
    pendingDeleteRef.current = null
    setPendingDelete(null)
    if (item) {
      setListings((prev) =>
        // Re-insert sorted by created_at descending so it lands in the right spot
        [...prev, item].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )
      )
    }
  }

  // Toast timer expired — fire the real DELETE request.
  // Wrapped in useCallback so the reference stays stable across renders;
  // this prevents UndoToast's useEffect([onExpire]) from restarting the
  // 7-second timer every time the parent re-renders.
  const handleDeleteExpire = useCallback(async () => {
    // Read from the ref, not from component state, to avoid a stale closure.
    const item = pendingDeleteRef.current
    pendingDeleteRef.current = null
    setPendingDelete(null)

    if (!item) return   // already handled (e.g. undo was clicked)

    try {
      await api.delete(`/items/${item.id}`)
    } catch (error) {
      console.error('Delete listing error:', error)
      // Restore the item if the network request failed
      setListings((prev) =>
        [...prev, item].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )
      )
    }
  }, []) // no deps — intentionally reads via ref, not state



  // ── filtered listings based on active tab ────────────────────────
  const filteredListings = listings.filter((item) => {
    if (activeFilter === 'All')       return true
    if (activeFilter === 'Active')    return item.status === 'available'
    if (activeFilter === 'Pending')   return item.status === 'pending'
    if (activeFilter === 'Completed') return item.status === 'traded'
    return true
  })

  return (
    <>
    <section className="my-listings-page">
      <header className="my-listings-hero">
      <Link
          to="/explore"
          aria-label="Back to Explore"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: '#FFFFFF',
            border: '1px solid #E4E2D9',
            color: '#1C1917',
            marginBottom: '16px',
            textDecoration: 'none',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#F5F4F0'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
        >
          <ArrowLeft size={20} />
        </Link>
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
              className={`filter-chip ${option === activeFilter ? 'is-active' : ''}`}
              onClick={() => setActiveFilter(option)}
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
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={form.existingImageUrls.length + imagePreviews.length >= MAX_IMAGES}
                />
                <div className="upload-content">
                  <div className="upload-icon">
                    <Upload size={18} />
                  </div>
                  <span>
                    Drop or browse images
                    {' '}
                    <span style={{ color: '#8C887B', fontWeight: 400 }}>
                      ({form.existingImageUrls.length + imagePreviews.length}/{MAX_IMAGES} added)
                    </span>
                  </span>
                  <small>PNG, JPG, or WebP · max {MAX_IMAGES} images</small>
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
                        className="image-crop-btn"
                        onClick={() => handleOpenCrop(index)}
                        aria-label="Crop image"
                        title="Crop image"
                      >
                        <Crop size={11} />
                      </button>
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
      {filteredListings.length === 0 ? (
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
          {filteredListings.map((item) => (
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
                    <button type="button" className="action-btn action-btn--danger" onClick={() => handleDelete(item)}>
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

    {/* ── Delete confirmation modal ────────────────────────────── */}
    {confirmItem && (
      <DeleteConfirmModal
        itemTitle={confirmItem.title}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmItem(null)}
      />
    )}

    {/* ── Crop modal ───────────────────────────────────────────── */}
    {cropModalOpen && cropImageSrc && (
      <ImageCropModal
        imageSrc={cropImageSrc}
        onCrop={handleCropApply}
        onCancel={handleCropCancel}
      />
    )}

    {/* ── Undo toast ───────────────────────────────────────────── */}
    {pendingDelete && (
      <UndoToast
        message="Listing deleted"
        onUndo={handleUndo}
        onExpire={handleDeleteExpire}
      />
    )}
    </>
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
