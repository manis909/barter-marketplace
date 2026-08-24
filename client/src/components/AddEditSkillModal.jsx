import { useState, useEffect } from 'react'
import { X, Crop } from 'lucide-react'
import api from '../services/api'
import { uploadImageToSupabase } from '../services/supabase'
import ImageCropModal from './ImageCropModal'
import './AddEditSkillModal.css'

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

const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels']
const SESSION_DURATIONS = ['30 minutes', '45 minutes', '1 hour', '1.5 hours', '2 hours', 'Flexible']
const TEACHING_MODES = ['Online', 'In-Person', 'Online & In-Person']
const TEACHING_LANGUAGES = ['English', 'Telugu', 'Hindi', 'Tamil', 'Kannada', 'Malayalam', 'Other']
const AVAILABILITY_OPTIONS = ['Weekdays', 'Weekends', 'Flexible']

export default function AddEditSkillModal({ isOpen, onClose, onSuccess, editSkill = null }) {
  const isEditMode = !!editSkill

  const [form, setForm] = useState({
    skill_name: '',
    description: '',
    category: '',
    price_type: 'free',
    price: '',
    price_unit: 'hour',
    session_type: 'one_on_one',
    experience_level: '',
    session_duration: '',
    teaching_mode: '',
    teaching_language: '',
    availability: [],
    max_participants: '',
    images: [],
  })

  const [existingImageUrls, setExistingImageUrls] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  // Crop modal state
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [currentImageForCrop, setCurrentImageForCrop] = useState(null)
  const [cropImageIndex, setCropImageIndex] = useState(null) // Track which image is being cropped

  // Load existing skill data when editing
  useEffect(() => {
    if (isEditMode && editSkill) {
      setForm({
        skill_name: editSkill.skill_name || '',
        description: editSkill.description || '',
        category: editSkill.category || '',
        price_type: editSkill.price_type || 'free',
        price: editSkill.price || '',
        price_unit: editSkill.price_unit || 'hour',
        session_type: editSkill.session_type || 'one_on_one',
        experience_level: editSkill.experience_level || '',
        session_duration: editSkill.session_duration || '',
        teaching_mode: editSkill.teaching_mode || '',
        teaching_language: editSkill.teaching_language || '',
        availability: editSkill.availability ? editSkill.availability.split(', ') : [],
        max_participants: editSkill.max_participants || '',
        images: [],
      })
      setExistingImageUrls(editSkill.image_urls || [])
    } else {
      // Reset for add mode
      setForm({
        skill_name: '',
        description: '',
        category: '',
        price_type: 'free',
        price: '',
        price_unit: 'hour',
        session_type: 'one_on_one',
        experience_level: '',
        session_duration: '',
        teaching_mode: '',
        teaching_language: '',
        availability: [],
        max_participants: '',
        images: [],
      })
      setExistingImageUrls([])
    }
    setImagePreviews([])
    setError('')
  }, [isEditMode, editSkill, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target
    setForm((prev) => ({
      ...prev,
      availability: checked
        ? [...prev.availability, value]
        : prev.availability.filter((item) => item !== value),
    }))
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    // Check image limit
    const currentImageCount = form.images.length + existingImageUrls.length
    const remainingSlots = 5 - currentImageCount
    if (remainingSlots <= 0) {
      setError('Maximum 5 images allowed')
      e.target.value = ''
      return
    }

    // Take only as many files as we have slots for
    const filesToAdd = files.slice(0, remainingSlots)

    // Add images directly without opening crop modal
    setForm((prev) => ({ ...prev, images: [...prev.images, ...filesToAdd] }))
    // Create preview URLs
    const newPreviews = filesToAdd.map((file) => URL.createObjectURL(file))
    setImagePreviews((prev) => [...prev, ...newPreviews])

    // Clear the file input so the same file can be selected again
    e.target.value = ''
  }

  const handleCropImage = (index) => {
    // Open crop modal for the image at the given index
    const imageUrl = imagePreviews[index]
    setCurrentImageForCrop(imageUrl)
    setCropImageIndex(index)
    setCropModalOpen(true)
  }

  const handleCropComplete = (croppedBlob) => {
    if (cropImageIndex === null) return

    // Convert blob to File object
    const croppedFile = new File([croppedBlob], `cropped-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    })

    // Replace the image at the specific index
    setForm((prev) => {
      const newImages = [...prev.images]
      newImages[cropImageIndex] = croppedFile
      return { ...prev, images: newImages }
    })
    // Replace the preview URL
    const newPreviewUrl = URL.createObjectURL(croppedBlob)
    setImagePreviews((prev) => {
      const newPreviews = [...prev]
      // Revoke old preview URL to free memory
      URL.revokeObjectURL(newPreviews[cropImageIndex])
      newPreviews[cropImageIndex] = newPreviewUrl
      return newPreviews
    })

    // Close crop modal
    setCropModalOpen(false)
    setCurrentImageForCrop(null)
    setCropImageIndex(null)
  }

  const handleCropCancel = () => {
    // Close crop modal without saving
    setCropModalOpen(false)
    setCurrentImageForCrop(null)
    setCropImageIndex(null)
  }

  const removeNewImage = (indexToRemove) => {
    const newImages = form.images.filter((_, i) => i !== indexToRemove)
    const newPreviews = imagePreviews.filter((_, i) => i !== indexToRemove)
    setForm((prev) => ({ ...prev, images: newImages }))
    setImagePreviews(newPreviews)
  }

  const removeExistingImage = (indexToRemove) => {
    setExistingImageUrls(existingImageUrls.filter((_, i) => i !== indexToRemove))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // Upload new images if any
      const uploadedImageUrls =
        form.images.length > 0
          ? await Promise.all(
              form.images.map(async (file) => {
                const url = await uploadImageToSupabase(file, 'skill-images')
                return url
              })
            )
          : []

      // Combine existing and new image URLs
      const allImageUrls = [...existingImageUrls, ...uploadedImageUrls]

      // Prepare payload
      const payload = {
        skill_name: form.skill_name,
        description: form.description,
        category: form.category,
        image_urls: allImageUrls,
        price_type: form.price_type,
        price: form.price_type === 'free' ? null : Number(form.price) || null,
        price_unit: form.price_type === 'coins' ? form.price_unit : null,
        session_type: form.session_type,
        experience_level: form.experience_level || null,
        session_duration: form.session_duration || null,
        teaching_mode: form.teaching_mode || null,
        teaching_language: form.teaching_language || null,
        availability: form.availability.length > 0 ? form.availability.join(', ') : null,
        max_participants: form.session_type === 'group' ? Number(form.max_participants) : 1,
      }

      if (isEditMode) {
        await api.put(`/skills/${editSkill.id}`, payload)
      } else {
        await api.post('/skills', payload)
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error saving skill:', err)
      setError(err.response?.data?.error || err.message || 'Failed to save skill')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="add-skill-page">
      <div className="add-skill-container">
        {/* Page Header */}
        <div className="add-skill-header">
          <div className="add-skill-header-left">
            <p className="add-skill-label">CREATE SKILL</p>
            <h1 className="add-skill-heading">Share your expertise with the community</h1>
          </div>
          <button type="button" className="close-form-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Helper Text */}
        <p className="add-skill-helper-text">
          Keep your skill details clear and compelling so bookings happen faster.
        </p>

        {/* Main Form Card */}
        <div className="add-skill-form-card">
          <form onSubmit={handleSubmit} className="skill-form">
            {error && <div className="skill-form-error">{error}</div>}

            {/* Image Upload Section */}
            <div className="form-section image-upload-section">
              <label className="section-label">Skill Images</label>
              <div className="image-upload-area">
                <input
                  type="file"
                  id="images"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="file-input-hidden"
                />
                <label htmlFor="images" className="upload-dropzone">
                  <div className="upload-icon">📷</div>
                  <p className="upload-title">Click to upload images</p>
                  <p className="upload-subtitle">Upload up to 5 images · JPG, PNG, WebP</p>
                </label>

                {/* Existing & New Images */}
                {(existingImageUrls.length > 0 || imagePreviews.length > 0) && (
                  <div className="image-preview-grid">
                    {existingImageUrls.map((url, index) => (
                      <div key={`existing-${index}`} className="image-preview-item">
                        <img src={url} alt={`Existing ${index + 1}`} />
                        <button
                          type="button"
                          className="remove-image-btn"
                          onClick={() => removeExistingImage(index)}
                          aria-label="Remove image"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {imagePreviews.map((preview, index) => (
                      <div key={`new-${index}`} className="image-preview-item">
                        <img src={preview} alt={`New ${index + 1}`} />
                        <button
                          type="button"
                          className="crop-image-btn"
                          onClick={() => handleCropImage(index)}
                          aria-label="Crop image"
                          title="Crop image"
                        >
                          <Crop size={13} />
                        </button>
                        <button
                          type="button"
                          className="remove-image-btn"
                          onClick={() => removeNewImage(index)}
                          aria-label="Remove image"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2-Column: Skill Name & Category */}
            <div className="form-row-2col">
              <div className="form-field">
                <label htmlFor="skill_name">Skill Name *</label>
                <input
                  type="text"
                  id="skill_name"
                  name="skill_name"
                  value={form.skill_name}
                  onChange={handleChange}
                  placeholder="e.g., Guitar Lessons"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="category">Category *</label>
                <select id="category" name="category" value={form.category} onChange={handleChange} required>
                  <option value="">Select Category</option>
                  {SKILL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Full Width: Description */}
            <div className="form-field">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe what you'll teach and what students will learn..."
                rows={4}
                required
              />
            </div>

            {/* 2-Column: Price Type & Session Type */}
            <div className="form-row-2col">
              <div className="form-field">
                <label htmlFor="price_type">Pricing *</label>
                <select id="price_type" name="price_type" value={form.price_type} onChange={handleChange} required>
                  <option value="free">Free</option>
                  <option value="coins">Paid</option>
                  <option value="negotiable">Negotiable</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="session_type">Session Type *</label>
                <select id="session_type" name="session_type" value={form.session_type} onChange={handleChange} required>
                  <option value="one_on_one">One-on-One</option>
                  <option value="group">Group</option>
                </select>
              </div>
            </div>

            {/* Conditional: Price & Price Unit */}
            {(form.price_type === 'coins' || form.price_type === 'negotiable') && (
              <div className="form-row-2col">
                <div className="form-field">
                  <label htmlFor="price">{form.price_type === 'coins' ? 'Price *' : 'Base Price'}</label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="e.g., 500"
                    min="0"
                    step="0.01"
                    required={form.price_type === 'coins'}
                  />
                </div>

                {form.price_type === 'coins' && (
                  <div className="form-field">
                    <label htmlFor="price_unit">Per *</label>
                    <select id="price_unit" name="price_unit" value={form.price_unit} onChange={handleChange} required>
                      <option value="hour">Hour</option>
                      <option value="session">Session</option>
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Conditional: Max Participants */}
            {form.session_type === 'group' && (
              <div className="form-field">
                <label htmlFor="max_participants">Maximum Participants *</label>
                <input
                  type="number"
                  id="max_participants"
                  name="max_participants"
                  value={form.max_participants}
                  onChange={handleChange}
                  placeholder="e.g., 10"
                  min="2"
                  required
                />
              </div>
            )}

            {/* 2-Column: Experience & Duration */}
            <div className="form-row-2col">
              <div className="form-field">
                <label htmlFor="experience_level">Experience Level</label>
                <select id="experience_level" name="experience_level" value={form.experience_level} onChange={handleChange}>
                  <option value="">Select Level</option>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="session_duration">Session Duration</label>
                <select id="session_duration" name="session_duration" value={form.session_duration} onChange={handleChange}>
                  <option value="">Select Duration</option>
                  {SESSION_DURATIONS.map((duration) => (
                    <option key={duration} value={duration}>
                      {duration}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2-Column: Teaching Mode & Language */}
            <div className="form-row-2col">
              <div className="form-field">
                <label htmlFor="teaching_mode">Teaching Mode</label>
                <select id="teaching_mode" name="teaching_mode" value={form.teaching_mode} onChange={handleChange}>
                  <option value="">Select Mode</option>
                  {TEACHING_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="teaching_language">Teaching Language</label>
                <select id="teaching_language" name="teaching_language" value={form.teaching_language} onChange={handleChange}>
                  <option value="">Select Language</option>
                  {TEACHING_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Availability Checkboxes */}
            <div className="form-field">
              <label>Availability</label>
              <div className="checkbox-grid">
                {AVAILABILITY_OPTIONS.map((option) => (
                  <label key={option} className="checkbox-option">
                    <input
                      type="checkbox"
                      value={option}
                      checked={form.availability.includes(option)}
                      onChange={handleCheckboxChange}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button type="button" className="cancel-button" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="submit-button" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEditMode ? 'Update Skill' : 'Submit Skill'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Image Crop Modal */}
      {cropModalOpen && currentImageForCrop && (
        <ImageCropModal
          imageSrc={currentImageForCrop}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  )
}
