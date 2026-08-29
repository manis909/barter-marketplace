import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, Package, ShieldCheck, ShoppingBag, Star, Tag, User } from 'lucide-react'
import api from '../services/api'
import Footer from '../components/Footer'
import './RentalDetail.css'

export default function RentalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [rental, setRental] = useState(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    api.get(`/rentals/${id}`)
      .then((response) => { if (active) setRental(response.data.rental) })
      .catch((err) => { if (active) setError(err.response?.data?.error || 'Unable to load this rental listing.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  if (loading) return <div className="rental-detail-state"><div className="rental-spinner" /><h2>Loading rental details</h2></div>
  if (error || !rental) return <div className="rental-detail-state rental-detail-error"><Package size={35} /><h2>{error || 'Rental listing not found'}</h2><button type="button" onClick={() => navigate('/renter')}>Back to rentals</button></div>

  const images = Array.isArray(rental.image_urls) && rental.image_urls.length ? rental.image_urls : []
  const title = rental.item_name || 'Rental item'
  const status = rental.status === 'available' ? 'Available' : rental.status === 'paused' ? 'Paused' : 'Rented'
  const rateUnit = rental.rate_type === 'hourly' ? 'hour' : 'day'
  const ownerName = rental.owner_username || rental.owner_name || 'Owner'
  const ownerRating = rental.owner_rating != null ? Number(rental.owner_rating) : null

  return <div className="rental-detail-page">
    <main className="rental-detail-content">
      <button type="button" className="rental-detail-back" onClick={() => navigate('/renter')}><ChevronLeft size={18} /> Back to rentals</button>

      <div className="rental-detail-layout">
        <div className="rental-detail-gallery">
          <div className="rental-detail-image-shell">
            {images.length ? <><div className="rental-detail-backdrop" style={{ backgroundImage: `url(${images[imageIndex]})` }} /><img src={images[imageIndex]} alt={title} className="rental-detail-main-image" /></> : <Package size={48} />}
            <span className={`rental-detail-badge rental-detail-badge-${rental.status || 'available'}`}><CheckCircle2 size={13} /> {status}</span>
            {images.length > 1 && <><button type="button" className="rental-detail-arrow left" onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)} aria-label="Previous image"><ChevronLeft size={18} /></button><button type="button" className="rental-detail-arrow right" onClick={() => setImageIndex((imageIndex + 1) % images.length)} aria-label="Next image"><ChevronRight size={18} /></button><span className="rental-detail-count">{imageIndex + 1} / {images.length}</span></>}
          </div>

          {images.length > 1 && (
            <div className="rental-detail-thumbs">
              {images.map((photo, index) => (
                <button
                  key={`${photo}-${index}`}
                  type="button"
                  className={index === imageIndex ? 'rental-detail-thumb active' : 'rental-detail-thumb'}
                  onClick={() => setImageIndex(index)}
                  aria-label={`View image ${index + 1}`}
                >
                  <img src={photo} alt={`${title} thumbnail ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="rental-detail-copy">
          <div className="rental-detail-header-card">
            <div className="rental-detail-header-row">
              <span className="rental-detail-category-chip"><Tag size={13} /> {rental.category || 'Other'}</span>
              <span className="rental-detail-type-chip"><Clock3 size={13} /> {rental.rate_type === 'hourly' ? 'Hourly' : 'Daily'}</span>
            </div>
            <h1>{title}</h1>
          </div>

          <div className="rental-detail-price-card">
            <div className="rental-detail-price-label">Rental rate</div>
            <div className="rental-detail-rate">INR {Number(rental.rate_amount).toLocaleString('en-IN')} <small>/ {rateUnit}</small></div>
            <div className="rental-detail-price-note">Verified owner • flexible booking • secure handoff</div>
          </div>

          <div className="rental-detail-owner-card">
            <div className="rental-detail-owner-avatar"><User size={22} /></div>
            <div className="rental-detail-owner-meta">
              <div className="rental-detail-owner-row">
                <Link to={`/rental/profile/${rental.owner_id}`}>{ownerName}</Link>
                <span className="rental-detail-verified-badge"><CheckCircle2 size={12} /> Verified</span>
              </div>
              {ownerRating !== null ? (
                <div className="rental-detail-owner-rating">
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <span>{ownerRating.toFixed(1)} rating</span>
                </div>
              ) : (
                <div className="rental-detail-owner-rating muted">Trusted renter profile</div>
              )}
            </div>
            <Link className="rental-detail-owner-link" to={`/rental/profile/${rental.owner_id}`}>View profile</Link>
          </div>

          <div className="rental-detail-info-card">
            <h3>Listing details</h3>
            <div className="rental-detail-specs">
              <div className="rental-detail-spec-item">
                <span className="rental-detail-spec-label"><Tag size={13} /> Category</span>
                <span className="rental-detail-spec-value">{rental.category || 'Other'}</span>
              </div>
              <div className="rental-detail-spec-item">
                <span className="rental-detail-spec-label"><CheckCircle2 size={13} /> Status</span>
                <span className="rental-detail-spec-value">{status}</span>
              </div>
              <div className="rental-detail-spec-item">
                <span className="rental-detail-spec-label"><Clock3 size={13} /> Rate type</span>
                <span className="rental-detail-spec-value">{rental.rate_type || 'daily'}</span>
              </div>
              <div className="rental-detail-spec-item">
                <span className="rental-detail-spec-label"><Package size={13} /> Availability</span>
                <span className="rental-detail-spec-value">{rental.status === 'available' ? 'Open to book' : rental.status === 'paused' ? 'Temporarily paused' : 'Booked'}</span>
              </div>
            </div>
          </div>

          <div className="rental-detail-description-card">
            <h3>About this rental</h3>
            <p>{rental.description || 'No description provided.'}</p>
          </div>

          <div className="rental-detail-action-card">
            {rental.status === 'available' ? (
              <button type="button" className="rental-detail-rent" onClick={() => setNotice('Rental requests are not available yet. Please check back soon.')}>
                <ShoppingBag size={18} /> Rent
              </button>
            ) : (
              <p className="rental-detail-unavailable">This listing is not currently available.</p>
            )}
            {notice && <p className="rental-detail-notice" role="status">{notice}</p>}
            <div className="rental-detail-guarantee"><ShieldCheck size={16} /> Protected by Renter Safe Rental Guarantee</div>
          </div>
        </section>
      </div>
    </main>
    <Footer />
  </div>
}
