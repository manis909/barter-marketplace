import { useState } from 'react'
import api from '../services/api'
import { uploadImageToSupabase } from '../services/supabase'
import './AddItem.css'

const categories = ['Books', 'Electronics', 'Clothes', 'Shoes', 'Home', 'Kitchen', 'Sports', 'Accessories']
const conditions = ['Excellent', 'Very Good', 'Good', 'Fair']

export default function AddItemPage() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Books',
    condition: 'Excellent',
    desiredItem: '',
    images: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files)
    setForm((prev) => ({ ...prev, images: files }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      const uploadedImageUrls = form.images.length > 0
        ? await Promise.all(form.images.map((file) => uploadImageToSupabase(file)))
        : []

      const response = await api.post('/items', {
        title: form.title,
        description: form.description,
        category: form.category,
        image_urls: uploadedImageUrls
      })

      setMessage(`Item created successfully! ID: ${response.data.item.id}`)
      setForm({
        title: '',
        description: '',
        category: 'Books',
        condition: 'Excellent',
        desiredItem: '',
        images: []
      })
    } catch (error) {
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
            <select name="category" value={form.category} onChange={handleChange}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label>
            Condition
            <select name="condition" value={form.condition} onChange={handleChange}>
              {conditions.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
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

        {message ? <p className="form-message">{message}</p> : null}
      </form>
    </section>
  )
}
