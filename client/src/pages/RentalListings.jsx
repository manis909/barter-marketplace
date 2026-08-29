import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, ImagePlus, Package, Pause, Pencil, Play, Plus, Search, Trash2, Upload, X } from 'lucide-react'
import api from '../services/api'
import { uploadImageToSupabase } from '../services/supabase'
import { categoryNames } from '../data/categories'
import ImageCropModal from '../components/ImageCropModal'
import VerificationRequiredModal from '../components/VerificationRequiredModal'
import useVerificationStatus from '../hooks/useVerificationStatus'
import UndoToast from '../components/UndoToast'
import './RentalListings.css'

const MAX_IMAGES = 3
const filters = ['All', 'Available', 'Paused', 'Rented']
const emptyForm = { item_name: '', description: '', category: '', rate_amount: '', rate_type: 'daily', status: 'available', images: [], existingImageUrls: [] }

export default function RentalListingsPage() {
  const navigate = useNavigate()
  const { verificationStatus, rejectionReason, isVerified, loading: verificationLoading } = useVerificationStatus()
  const [listings, setListings] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [confirmListing, setConfirmListing] = useState(null)
  const [verificationModal, setVerificationModal] = useState(false)
  const [imagePreviews, setImagePreviews] = useState([])
  const [crop, setCrop] = useState(null)
  const [activeImages, setActiveImages] = useState({})
  const [pendingDelete, setPendingDelete] = useState(null)
  const pendingDeleteRef = useRef(null)

  const loadListings = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/rentals/mine')
      setListings(Array.isArray(response.data.rentals) ? response.data.rentals : [])
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load your rental listings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadListings() }, [])

  const visibleListings = useMemo(() => listings.filter((listing) => {
    if (activeFilter !== 'All' && listing.status !== activeFilter.toLowerCase()) return false
    const query = search.trim().toLowerCase()
    if (!query) return true
    return [listing.item_name, listing.category, listing.description].some((value) => String(value || '').toLowerCase().includes(query))
  }), [activeFilter, listings, search])

  const canManage = () => {
    if (!isVerified && !verificationLoading) { setVerificationModal(true); return false }
    return true
  }

  const beginCreate = () => {
    if (!canManage()) return
    setForm({ ...emptyForm })
    setEditingId(null)
    setImagePreviews([])
    setFormError('')
    setMessage('')
    setFormOpen(true)
  }

  const beginEdit = (listing) => {
    if (!canManage()) return
    setEditingId(listing.id)
    setForm({
      item_name: listing.item_name || '', description: listing.description || '', category: listing.category || '',
      rate_amount: listing.rate_amount ?? '', rate_type: listing.rate_type || 'daily', status: listing.status || 'available',
      images: [], existingImageUrls: Array.isArray(listing.image_urls) ? listing.image_urls : []
    })
    setImagePreviews([])
    setFormError('')
    setMessage('')
    setFormOpen(true)
  }

  const closeForm = () => {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url))
    setFormOpen(false)
    setEditingId(null)
    setForm({ ...emptyForm })
    setImagePreviews([])
    setFormError('')
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || [])
    const slots = MAX_IMAGES - form.existingImageUrls.length - form.images.length
    const accepted = files.slice(0, Math.max(0, slots))
    if (accepted.length < files.length) setFormError(`A listing can have up to ${MAX_IMAGES} images.`)
    if (!accepted.length) { event.target.value = ''; return }
    setForm((previous) => ({ ...previous, images: [...previous.images, ...accepted] }))
    setImagePreviews((previous) => [...previous, ...accepted.map((file) => URL.createObjectURL(file))])
    event.target.value = ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const itemName = form.item_name.trim()
    const description = form.description.trim()
    const rateAmount = Number(form.rate_amount)
    if (!itemName || !description || !form.category || !form.rate_type || !Number.isFinite(rateAmount) || rateAmount <= 0) {
      setFormError('Add an item name, description, category, rate type, and a positive price.')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      const uploaded = await Promise.all(form.images.map((file) => uploadImageToSupabase(file)))
      const imageUrls = [...form.existingImageUrls, ...uploaded]
      const payload = {
        item_name: itemName,
        description,
        category: form.category,
        rate_type: form.rate_type,
        rate_amount: rateAmount,
        image_urls: imageUrls
      }
      if (editingId) {
        if (form.status !== 'rented') payload.status = form.status
        const response = await api.put(`/rentals/${editingId}`, payload)
        setListings((previous) => previous.map((listing) => listing.id === editingId ? response.data.rental : listing))
        setMessage('Rental listing updated successfully.')
      } else {
        const response = await api.post('/rentals', payload)
        setListings((previous) => [response.data.rental, ...previous])
        setMessage('Rental listing created successfully.')
      }
      closeForm()
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Unable to save this rental listing.')
    } finally { setSubmitting(false) }
  }

  const updateStatus = async (listing, status) => {
    if (listing.status === 'rented') return
    try {
      const response = await api.put(`/rentals/${listing.id}`, { status })
      setListings((previous) => previous.map((item) => item.id === listing.id ? response.data.rental : item))
      setMessage(status === 'paused' ? 'Listing paused.' : 'Listing is available again.')
    } catch (err) { setMessage(err.response?.data?.error || 'Unable to update listing status.') }
  }

  const confirmDeleteListing = () => {
    const listing = confirmListing
    setConfirmListing(null)
    setListings((previous) => previous.filter((item) => item.id !== listing.id))
    pendingDeleteRef.current = listing
    setPendingDelete(listing)
  }

  const undoDelete = () => {
    const listing = pendingDeleteRef.current
    pendingDeleteRef.current = null
    setPendingDelete(null)
    if (listing) setListings((previous) => [listing, ...previous])
  }

  const finalizeDelete = useCallback(async () => {
    const listing = pendingDeleteRef.current
    pendingDeleteRef.current = null
    setPendingDelete(null)
    if (!listing) return
    try {
      await api.delete(`/rentals/${listing.id}`)
      setMessage('Rental listing deleted successfully.')
    } catch (err) {
      setListings((previous) => [listing, ...previous])
      setMessage(err.response?.data?.error || 'Unable to delete this listing.')
    }
  }, [])

  const changeImage = (listing, direction) => {
    const images = Array.isArray(listing.image_urls) ? listing.image_urls : []
    if (images.length < 2) return
    const current = activeImages[listing.id] || 0
    setActiveImages((previous) => ({ ...previous, [listing.id]: (current + direction + images.length) % images.length }))
  }

  const completeCrop = (blob) => {
    const file = new File([blob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' })
    const url = URL.createObjectURL(blob)
    URL.revokeObjectURL(imagePreviews[crop.index])
    setForm((previous) => ({ ...previous, images: previous.images.map((item, index) => index === crop.index ? file : item) }))
    setImagePreviews((previous) => previous.map((item, index) => index === crop.index ? url : item))
    setCrop(null)
  }

  return <div className="rental-listings-page">
    <div className="rental-listings-hero">
      <button className="rental-back" type="button" onClick={() => navigate('/explore')} aria-label="Back to Explore"><ChevronLeft size={19} /></button>
      <div className="rental-hero-copy"><span className="rental-kicker">RENTAL STUDIO</span><h1>My Rental Listings</h1><p>Offer the things you own to students who need them, one rental at a time.</p></div>
      <button className="rental-add-button" type="button" onClick={beginCreate}><Plus size={18} /> Add Rental</button>
    </div>

    <main className="rental-listings-content">
      <div className="rental-toolbar">
        <label className="rental-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, category, or description" /><button type="button" onClick={() => setSearch('')} aria-label="Clear search" hidden={!search}><X size={16} /></button></label>
        <div className="rental-filters">{filters.map((filter) => <button key={filter} type="button" className={activeFilter === filter ? 'active' : ''} onClick={() => setActiveFilter(filter)}>{filter}</button>)}</div>
      </div>
      {message && <div className="rental-message" role="status"><Check size={17} />{message}<button type="button" onClick={() => setMessage('')} aria-label="Dismiss message"><X size={15} /></button></div>}
      {formOpen && <form className="rental-form" onSubmit={handleSubmit}>
        <div className="rental-form-heading"><div><span className="rental-kicker">{editingId ? 'EDIT RENTAL' : 'NEW RENTAL'}</span><h2>{editingId ? 'Keep your listing up to date' : 'List something useful'}</h2></div><button className="icon-button" type="button" onClick={closeForm} aria-label="Close form"><X size={18} /></button></div>
        <div className="rental-form-grid">
          <label className="rental-field rental-field-full"><span>Images</span><div className="rental-upload"><ImagePlus size={21} /><strong>Choose up to {MAX_IMAGES} images</strong><small>PNG, JPG, or WebP</small><input type="file" accept="image/*" multiple onChange={handleFileChange} /></div><div className="rental-previews">{form.existingImageUrls.map((url, index) => <div className="rental-preview" key={`${url}-${index}`}><img src={url} alt={`Existing rental image ${index + 1}`} /><button type="button" onClick={() => setForm((previous) => ({ ...previous, existingImageUrls: previous.existingImageUrls.filter((_, imageIndex) => imageIndex !== index) }))} aria-label="Remove image"><X size={12} /></button></div>)}{imagePreviews.map((url, index) => <div className="rental-preview" key={url}><img src={url} alt={`New rental image ${index + 1}`} /><button type="button" className="crop-button" onClick={() => setCrop({ index, src: url })} aria-label="Crop image">Crop</button><button type="button" onClick={() => { URL.revokeObjectURL(url); setImagePreviews((previous) => previous.filter((_, imageIndex) => imageIndex !== index)); setForm((previous) => ({ ...previous, images: previous.images.filter((_, imageIndex) => imageIndex !== index) })) }} aria-label="Remove image"><X size={12} /></button></div>)}</div></label>
          <label className="rental-field"><span>Item name</span><input value={form.item_name} onChange={(event) => setForm({ ...form, item_name: event.target.value })} placeholder="Portable projector" required /></label>
          <label className="rental-field"><span>Category</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required><option value="">Select category</option>{categoryNames.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className="rental-field rental-field-full"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What should renters know about this item?" rows="4" required /></label>
          <label className="rental-field"><span>Rate type</span><select value={form.rate_type} onChange={(event) => setForm({ ...form, rate_type: event.target.value })} required><option value="daily">Daily</option><option value="hourly">Hourly</option></select></label>
          <label className="rental-field"><span>Rate amount (INR)</span><input type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]+" value={form.rate_amount} onChange={(event) => setForm((previous) => ({ ...previous, rate_amount: event.target.value }))} placeholder="250" required /></label>
          {editingId && form.status !== 'rented' && <label className="rental-field"><span>Listing status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="available">Available</option><option value="paused">Paused</option></select></label>}
        </div>
        {form.status === 'rented' && <p className="rented-note">This item is currently rented. Its availability is managed by the booking flow.</p>}
        {formError && <p className="rental-form-error">{formError}</p>}
        <div className="rental-form-actions"><button type="button" className="rental-secondary" onClick={closeForm}>Cancel</button><button type="submit" className="rental-primary" disabled={submitting}><Upload size={17} />{submitting ? 'Saving...' : editingId ? 'Save changes' : 'Create rental'}</button></div>
      </form>}

      {loading ? <div className="rental-state"><div className="rental-spinner" /><h2>Loading your listings</h2><p>Pulling together your rental shelf...</p></div> : error ? <div className="rental-state rental-state-error"><Package size={35} /><h2>We could not load your listings</h2><p>{error}</p><button className="rental-primary" type="button" onClick={loadListings}>Try again</button></div> : visibleListings.length === 0 ? <div className="rental-state"><Package size={35} /><h2>{listings.length ? 'No matching rentals' : 'No rental listings yet'}</h2><p>{listings.length ? 'Try another search or filter.' : 'List an item you own and let other students rent it.'}</p>{!listings.length && <button className="rental-primary" type="button" onClick={beginCreate}><Plus size={17} /> Add Rental</button>}</div> : <div className="rental-grid">{visibleListings.map((listing) => {
        const images = Array.isArray(listing.image_urls) ? listing.image_urls : []
        const itemName = listing.item_name || 'Rental item'
        const rateTypeLabel = listing.rate_type === 'hourly' ? 'hour' : 'day'
        const imageIndex = activeImages[listing.id] || 0
        const statusLabel = listing.status === 'rented' ? 'Rented' : listing.status === 'requested' ? 'Requested' : listing.status === 'paused' ? 'Paused' : 'Available'
        return <article className="rental-card" key={listing.id}><div className="rental-card-media">{images.length ? <><div className="rental-card-backdrop" style={{ backgroundImage: `url(${images[imageIndex]})` }} /><img src={images[imageIndex]} alt={itemName} /></> : <Package size={35} />}{images.length > 1 && <><button className="image-nav image-nav-left" type="button" onClick={() => changeImage(listing, -1)} aria-label="Previous image"><ChevronLeft size={16} /></button><button className="image-nav image-nav-right" type="button" onClick={() => changeImage(listing, 1)} aria-label="Next image"><ChevronRight size={16} /></button><div className="image-count">{imageIndex + 1} / {images.length}</div></>}</div><div className="rental-card-body"><div className="rental-card-top"><span className="rental-category">{listing.category || 'Other'}</span><span className={`rental-status rental-status-${listing.status}`}>{statusLabel}</span></div><h2>{itemName}</h2><p className="rental-description">{listing.description || 'No description provided.'}</p><div className="rental-rate">INR {Number(listing.rate_amount).toLocaleString('en-IN')} <small>/ {rateTypeLabel}</small></div>{listing.status === 'rented' && <p className="rented-note">Currently rented. Availability is managed by the booking flow.</p>}<div className="rental-card-actions"><button type="button" onClick={() => beginEdit(listing)}><Pencil size={15} /> Edit</button>{listing.status !== 'rented' && <button type="button" onClick={() => updateStatus(listing, listing.status === 'paused' ? 'available' : 'paused')}>{listing.status === 'paused' ? <Play size={15} /> : <Pause size={15} />} {listing.status === 'paused' ? 'Activate' : 'Pause'}</button>}<button className="danger" type="button" onClick={() => setConfirmListing(listing)}><Trash2 size={15} /> Delete</button></div></div></article>
      })}</div>}
    </main>
    {confirmListing && <div className="rental-modal-backdrop" onClick={() => setConfirmListing(null)}><div className="rental-confirm" role="alertdialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><button className="icon-button" type="button" onClick={() => setConfirmListing(null)} aria-label="Close"><X size={18} /></button><div className="confirm-icon"><Trash2 size={22} /></div><h2>Delete rental listing?</h2><p>Are you sure you want to delete <strong>"{confirmListing.item_name || 'this item'}"</strong>? This cannot be undone.</p><div className="rental-form-actions"><button className="rental-secondary" type="button" onClick={() => setConfirmListing(null)}>Keep listing</button><button className="rental-delete" type="button" onClick={confirmDeleteListing}><Trash2 size={16} /> Delete</button></div></div></div>}
    {pendingDelete && <UndoToast message="Rental listing deleted" onUndo={undoDelete} onExpire={finalizeDelete} />}
    {crop && <ImageCropModal imageSrc={crop.src} onCrop={completeCrop} onCancel={() => setCrop(null)} />}
    {verificationModal && <VerificationRequiredModal status={verificationStatus} rejectionReason={rejectionReason} onClose={() => setVerificationModal(false)} />}
  </div>
}
