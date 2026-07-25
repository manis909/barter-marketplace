import { useState } from 'react'
import api from '../services/api'
import { uploadImageToSupabase } from '../services/supabase'
import { categoryNames } from '../data/categories'
import './AddItem.css'

const conditions = ['Excellent', 'Very Good', 'Good', 'Fair']

export default function AddItemPage() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    condition: 'Excellent',
    desiredItem: '',
    images: []
  })
  const [imagePreviews, setImagePreviews] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files)
    console.log('Selected files:', files.map((file) => ({ name: file.name, size: file.size, type: file.type })))
    setForm((prev) => ({ ...prev, images: files }))
    setImagePreviews(files.map((file) => URL.createObjectURL(file)))
  }

  const removeImage = (indexToRemove) => {
    const newImages = form.images.filter((_, i) => i !== indexToRemove)
    const newPreviews = imagePreviews.filter((_, i) => i !== indexToRemove)
    setForm((prev) => ({ ...prev, images: newImages }))
    setImagePreviews(newPreviews)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      console.log('Submitting listing with selected files:', form.images.map((file) => ({ name: file.name, size: file.size, type: file.type })))

      const uploadedImageUrls = form.images.length > 0
        ? await Promise.all(form.images.map(async (file) => {
            const url = await uploadImageToSupabase(file)
            console.log('Upload result for file:', file.name, url)
            return url
          }))
        : []

      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        condition: form.condition,
        image_urls: uploadedImageUrls
      }

      console.log('Request payload sent to backend:', payload)

      const response = await api.post('/items', payload)
      console.log('Backend create listing response:', response.data)

      setMessage(`Item created successfully! ID: ${response.data.item.id}`)
      setForm({
        title: '',
        description: '',
        category: '',
        condition: 'Excellent',
        desiredItem: '',
        images: []
      })
      setImagePreviews([])
    } catch (error) {
      console.error('Create listing failed:', error)
      setMessage(error.response?.data?.error || error.message || 'Unable to create item right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="add-item-page">
      <div className="add-item-header">
        <div>
          <p className="page-label">Add Item</p>
          <h1>List an item for barter.</h1>
          <p className="page-description">
            Complete the listing details and share your item with the Barter community.
          </p>
        </div>
      </div>

      <form className="item-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Upload Images
            <input type="file" accept="image/*" multiple onChange={handleFileChange} />
          </label>

          {imagePreviews.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
              {imagePreviews.map((src, index) => (
                <div key={index} style={{ position: 'relative' }}>
                  <img
                    src={src}
                    alt={`preview ${index}`}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      background: 'red',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <label>
            Item Title
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
            <select name="category" value={form.category} onChange={handleChange} required>
              <option value="">Select Category</option>
              {categoryNames.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>

          <label>
            Condition
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
        </div>

        <div className="form-footer">
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Listing...' : 'Submit Listing'}
          </button>
        </div>

        {message && <p className="form-message">{message}</p>}
      </form>
    </section>
  )
}
