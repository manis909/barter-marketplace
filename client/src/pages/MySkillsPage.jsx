import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Crop,
  GraduationCap,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X
} from 'lucide-react'
import api from '../services/api'
import { uploadImageToSupabase } from '../services/supabase'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import ImageCropModal from '../components/ImageCropModal'
import UndoToast from '../components/UndoToast'
import { fmtDate, normalizeToUTC } from '../utils/helpers'
import './MySkillsPage.css'

const MAX_IMAGES = 3

// Skilter categories as specified
const SKILL_CATEGORIES = [
  'Music',
  'Dance',
  'Art & Design',
  'Study Help / Tutoring',
  'Coding & Tech',
  'Languages',
  'Fitness & Sports',
  'Photography & Videography',
]

const PRICE_UNITS = ['Hour', 'Session', 'Class', 'Course']
const SESSION_TYPES = ['One-on-One', 'Group']
const filterOptions = ['All', 'Active', 'Inactive']

const EMPTY_FORM = {
  skill_name: '',
  description: '',
  category: '',
  price_type: 'Free',
  price: '',
  price_unit: 'Session',
  session_type: 'One-on-One',
  max_participants: '',
  images: [],
  existingImageUrls: []
}

export default function MySkillsPage() {
  const navigate = useNavigate()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imagePreviews, setImagePreviews] = useState([])
  const [skills, setSkills] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isFormHighlighting, setIsFormHighlighting] = useState(false)
  const [message, setMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editingSkillId, setEditingSkillId] = useState(null)
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const createSkillRef = useRef(null)

  // ── delete / undo state ────────────────────────────────────────
  const [confirmItem, setConfirmItem] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const undoTimerRef = useRef(null)
  const pendingDeleteRef = useRef(null)

  // ── crop state ─────────────────────────────────────────────────
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropImageIndex, setCropImageIndex] = useState(null)
  const [cropImageSrc, setCropImageSrc] = useState(null)

  // ── load skills ────────────────────────────────────────────────
  const loadMySkills = async () => {
    setLoading(true)
    try {
      const response = await api.get('/skills/mine')
      setSkills(Array.isArray(response.data.skills) ? response.data.skills : [])
    } catch (error) {
      console.error('Failed to load my skills', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMySkills()
  }, [])

  // ── form helpers ───────────────────────────────────────────────
  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files)
    const currentCount = form.existingImageUrls.length + form.images.length

    let incoming = selected
    let limitMessage = ''

    if (currentCount >= MAX_IMAGES) {
      limitMessage = `You can upload a maximum of ${MAX_IMAGES} images per skill. Remove an image first.`
      incoming = []
    } else if (currentCount + selected.length > MAX_IMAGES) {
      const slots = MAX_IMAGES - currentCount
      incoming = selected.slice(0, slots)
      limitMessage = `Only ${slots} more image${slots === 1 ? '' : 's'} allowed (max ${MAX_IMAGES}). ${selected.length - slots} file${selected.length - slots === 1 ? ' was' : 's were'} skipped.`
    }

    if (limitMessage) {
      setMessage(limitMessage)
    }

    if (incoming.length === 0) {
      event.target.value = ''
      return
    }

    const newPreviews = incoming.map((f) => URL.createObjectURL(f))
    setForm((prev) => ({ ...prev, images: [...prev.images, ...incoming] }))
    setImagePreviews((prev) => [...prev, ...newPreviews])
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
  const handleOpenCrop = (index) => {
    setCropImageIndex(index)
    setCropImageSrc(imagePreviews[index])
    setCropModalOpen(true)
  }

  const handleCropCancel = () => {
    setCropModalOpen(false)
    setCropImageIndex(null)
    setCropImageSrc(null)
  }

  const handleCropApply = (croppedBlob) => {
    const index = cropImageIndex
    setCropModalOpen(false)
    setCropImageIndex(null)
    setCropImageSrc(null)

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
      createSkillRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setIsFormHighlighting(true)
      window.setTimeout(() => setIsFormHighlighting(false), 1500)
    })
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setImagePreviews([])
    setMessage('')
    setIsEditing(false)
    setEditingSkillId(null)
  }

  // ── open create form ───────────────────────────────────────────
  const handleOpenCreateForm = () => {
    resetForm()
    setIsFormOpen(true)
    scrollToForm()
  }

  // ── edit handler ───────────────────────────────────────────────
  const handleEdit = (skill) => {
    setIsEditing(true)
    setEditingSkillId(skill.id)
    setForm({
      skill_name: skill.skill_name || '',
      description: skill.description || '',
      category: skill.category || '',
      price_type: skill.price_type || 'Free',
      price: skill.price || '',
      price_unit: skill.price_unit || 'Session',
      session_type: skill.session_type || 'One-on-One',
      max_participants: skill.max_participants || '',
      images: [],
      existingImageUrls: Array.isArray(skill.image_urls) ? skill.image_urls : []
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

      const finalImageUrls = [...form.existingImageUrls, ...newlyUploadedUrls]

      const payload = {
        skill_name: form.skill_name,
        description: form.description,
        category: form.category,
        price_type: form.price_type,
        price: (form.price_type === 'Paid' || form.price_type === 'Negotiable') ? form.price : null,
        price_unit: (form.price_type === 'Paid' || form.price_type === 'Negotiable') ? form.price_unit : null,
        session_type: form.session_type,
        max_participants: form.session_type === 'Group' ? form.max_participants : null,
        image_urls: finalImageUrls,
      }

      console.log('🔍 FRONTEND DEBUG - Form state:', {
        session_type: form.session_type,
        max_participants: form.max_participants,
        'session_type === Group': form.session_type === 'Group'
      })
      console.log('🔍 FRONTEND DEBUG - Payload:', payload)

      if (isEditing) {
        console.log('Updating skill:', editingSkillId, payload)
        const response = await api.put(`/skills/${editingSkillId}`, payload)
        const updated = response.data.skill
        setSkills((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
        setMessage('Skill updated successfully!')
        resetForm()
        setIsFormOpen(false)
      } else {
        console.log('Creating skill:', payload)
        const response = await api.post('/skills', payload)
        const created = response.data.skill
        setSkills((prev) => [created, ...prev])
        setMessage('Skill created successfully!')
        resetForm()
        setIsFormOpen(false)
      }
    } catch (error) {
      console.error('Skill submit error:', error)
      setMessage(error.response?.data?.error || error.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── delete handler ─────────────────────────────────────────────
  const handleDelete = (skill) => {
    console.log('Delete clicked, skill.id:', skill.id)
    setConfirmItem(skill)
  }

  const handleConfirmDelete = () => {
    const skill = confirmItem
    setConfirmItem(null)

    setSkills((prev) => prev.filter((s) => s.id !== skill.id))

    pendingDeleteRef.current = skill
    setPendingDelete(skill)

    clearTimeout(undoTimerRef.current)
  }

  const handleUndo = () => {
    clearTimeout(undoTimerRef.current)
    const skill = pendingDeleteRef.current
    pendingDeleteRef.current = null
    setPendingDelete(null)
    if (skill) {
      setSkills((prev) =>
        [...prev, skill].sort(
          (a, b) => new Date(normalizeToUTC(b.created_at)) - new Date(normalizeToUTC(a.created_at))
        )
      )
    }
  }

  const handleDeleteExpire = useCallback(async () => {
    const skill = pendingDeleteRef.current
    pendingDeleteRef.current = null
    setPendingDelete(null)

    if (!skill) return

    try {
      await api.delete(`/skills/${skill.id}`)
    } catch (error) {
      console.error('Delete skill error:', error)
      setSkills((prev) =>
        [...prev, skill].sort(
          (a, b) => new Date(normalizeToUTC(b.created_at)) - new Date(normalizeToUTC(a.created_at))
        )
      )
    }
  }, [])

  // ── suggestions ────────────────────────────────────────────────
  const suggestionCandidates = Array.from(
    new Set(skills.flatMap((s) => [s.skill_name, s.category]).filter(Boolean))
  )
  const matchingSuggestions = searchQuery.trim()
    ? suggestionCandidates.filter((c) =>
        c.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  // ── filtered skills ────────────────────────────────────────────
  const filteredSkills = skills.filter((skill) => {
    if (activeFilter === 'Active' && skill.status !== 'active') return false
    if (activeFilter === 'Inactive' && skill.status === 'active') return false

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      const matchesName = (skill.skill_name || '').toLowerCase().includes(q)
      const matchesCategory = (skill.category || '').toLowerCase().includes(q)
      if (!matchesName && !matchesCategory) return false
    }

    return true
  })

  const handleSelectSuggestion = (val) => {
    setSearchQuery(val)
    setShowSuggestions(false)
  }

  const handleSearchBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false)
    }, 200)
  }

  return (
    <>
    <section className="my-skills-page">
      {/* ── Premium Hero ─────────────────────────────────────────── */}
      <div className="ml-hero">
        <button
          type="button"
          className="ml-hero-back"
          onClick={() => navigate('/skilter')}
          aria-label="Back to Skilter"
        >
          ←
        </button>
      </div>

      {/* ── Title Card ────────────────────────────────────────────── */}
      <div className="ml-title-card">
        <div className="ml-title-card__inner">
          <div className="ml-title-card__copy">
            <div className="hero-badge">
              <GraduationCap size={16} />
              <span>MY SKILLS</span>
            </div>
            <h1>Manage your skills</h1>
            <p>Keep your expertise polished, visible, and ready to share.</p>
          </div>
          <button type="button" className="primary-button" onClick={handleOpenCreateForm}>
            <Plus size={18} />
            <span>Add Skill</span>
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-field-container">
          <label className="search-field">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search your skills..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={handleSearchBlur}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => {
                  setSearchQuery('')
                  setShowSuggestions(false)
                }}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </label>
          
          {showSuggestions && matchingSuggestions.length > 0 && (
            <ul className="suggestions-dropdown">
              {matchingSuggestions.map((suggestion, idx) => (
                <li
                  key={idx}
                  className="suggestion-item"
                  onMouseDown={() => handleSelectSuggestion(suggestion)}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
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
          ref={createSkillRef}
          className={`listing-form ${isFormHighlighting ? 'listing-form--highlight' : ''}`}
          onSubmit={handleSubmit}
        >
          <div className="form-heading">
            <div>
              <p className="section-eyebrow">{isEditing ? 'Edit Skill' : 'Create Skill'}</p>
              <h2>{isEditing ? 'Update your skill details' : 'Share your expertise with the community'}</h2>
            </div>
            <p className="form-helper">Keep your skill details clear and compelling so bookings happen faster.</p>
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

              {/* Existing images */}
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

              {/* New image previews */}
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
              <label>Skill Name</label>
              <input
                type="text"
                name="skill_name"
                value={form.skill_name}
                onChange={handleChange}
                placeholder="Guitar Lessons, Spanish Tutoring, etc."
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
                {SKILL_CATEGORIES.map((cat) => (
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
                placeholder="Describe what you'll teach or help with..."
                rows="5"
                required
              />
            </div>

            <div className="form-field">
              <label>Price Type</label>
              <select name="price_type" value={form.price_type} onChange={handleChange}>
                <option value="Free">Free</option>
                <option value="Paid">Paid</option>
                <option value="Negotiable">Negotiable</option>
              </select>
            </div>

            {(form.price_type === 'Paid' || form.price_type === 'Negotiable') && (
              <>
                <div className="form-field">
                  <label>Price (₹)</label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="Enter price in ₹"
                    required={form.price_type === 'Paid' || form.price_type === 'Negotiable'}
                  />
                </div>

                <div className="form-field">
                  <label>Price Unit</label>
                  <select name="price_unit" value={form.price_unit} onChange={handleChange}>
                    {PRICE_UNITS.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="form-field">
              <label>Session Type</label>
              <select name="session_type" value={form.session_type} onChange={handleChange}>
                {SESSION_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {form.session_type === 'Group' && (
              <div className="form-field">
                <label>Maximum Participants</label>
                <input
                  type="number"
                  name="max_participants"
                  value={form.max_participants}
                  onChange={handleChange}
                  placeholder="Enter max participants"
                  required={form.session_type === 'Group'}
                />
              </div>
            )}
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
                  ? (isEditing ? 'Saving Changes...' : 'Creating Skill...')
                  : (isEditing ? 'Save Changes' : 'Submit Skill')}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* ── Skills Grid ──────────────────────────────────────────── */}
      {filteredSkills.length === 0 ? (
        skills.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">
              <GraduationCap size={34} />
            </div>
            <h3>No Skills Yet</h3>
            <p>Start your Skilter journey by adding your first skill.</p>
            <p>Your skills will appear here once added.</p>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">
              <Search size={34} />
            </div>
            <h3>No matching skills found.</h3>
            <p>Try another name or category.</p>
          </div>
        )
      ) : (
        <div className="listings-grid">
          {filteredSkills.map((skill) => (
            <article key={skill.id} className="listing-card">
              <div className="listing-card__media">
                <div
                  className="listing-card__media-backdrop"
                  style={{
                    backgroundImage: `url(${Array.isArray(skill.image_urls) && skill.image_urls.length > 0 ? skill.image_urls[0] : '/placeholder.png'})`
                  }}
                />
                <img
                  src={
                    Array.isArray(skill.image_urls) && skill.image_urls.length > 0
                      ? skill.image_urls[0]
                      : '/placeholder.png'
                  }
                  alt={skill.skill_name}
                />
              </div>
              <div className="listing-card__content">
                <div className="listing-card__top">
                  <div className="listing-card__badges">
                    <span className="badge badge--category">{skill.category}</span>
                    <span className="badge badge--condition">{skill.session_type}</span>
                  </div>
                  <div
                    className="listing-card__status"
                    style={{
                      textTransform: 'capitalize',
                      background: skill.status === 'active' ? '#E8F5EE' : '#FFF6E2',
                      color: skill.status === 'active' ? '#2F6B57' : '#A56A00',
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {skill.status || 'active'}
                  </div>
                </div>
                <h3>{skill.skill_name}</h3>
                <p>{skill.description}</p>
                <div className="listing-card__divider" />
                <div className="listing-card__footer">
                  <div className="listing-card__meta">
                    {(skill.price_type === 'coins' || skill.price_type === 'negotiable') && skill.price && (
                      <span className="meta-pill">
                        ₹{Number(skill.price).toLocaleString('en-IN')} / {skill.price_unit}
                      </span>
                    )}
                    {skill.price_type === 'free' && (
                      <span className="meta-pill">Free</span>
                    )}
                    {skill.session_type === 'Group' && skill.max_participants && (
                      <span className="meta-pill">Max {skill.max_participants} participants</span>
                    )}
                    <span className="meta-pill">
                      Listed {skill.created_at ? fmtDate(skill.created_at) : ''}
                    </span>
                  </div>
                  <div className="listing-card__actions">
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => handleEdit(skill)}
                    >
                      <Pencil size={14} />
                      <span>Edit</span>
                    </button>
                    <button type="button" className="action-btn action-btn--danger" onClick={() => handleDelete(skill)}>
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
        itemTitle={confirmItem.skill_name}
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
        message="Skill deleted"
        onUndo={handleUndo}
        onExpire={handleDeleteExpire}
      />
    )}
    </>
  )
}

