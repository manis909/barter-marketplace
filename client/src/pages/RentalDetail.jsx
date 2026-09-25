import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, Heart, Package, ShieldCheck, ShoppingBag, Star, Tag, User } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../features/auth/AuthContext'
import { addRentalWishlist, removeRentalWishlist, getRentalWishlistIds } from '../services/rentalWishlistService'
import Footer from '../components/Footer'
import './RentalDetail.css'

export default function RentalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [rental, setRental] = useState(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [startDatetime, setStartDatetime] = useState('')
  const [endDatetime, setEndDatetime] = useState('')
  const [meetingLocation, setMeetingLocation] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [submittingBooking, setSubmittingBooking] = useState(false)
  const [isLiked, setIsLiked] = useState(false)

  useEffect(() => {
    let active = true
    api.get(`/rental-listings/${id}`)
      .then((response) => { if (active) setRental(response.data.rental) })
      .catch((err) => { if (active) setError(err.response?.data?.error || 'Unable to load this rental listing.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    if (!currentUser || !id) return
    getRentalWishlistIds()
      .then((data) => {
        if (Array.isArray(data.ids)) {
          setIsLiked(data.ids.includes(id))
        }
      })
      .catch(() => {})
  }, [currentUser, id])

  const toggleLike = async () => {
    if (!currentUser) {
      navigate('/login')
      return
    }

    const nextLiked = !isLiked
    setIsLiked(nextLiked)

    try {
      if (nextLiked) {
        await addRentalWishlist(id)
      } else {
        await removeRentalWishlist(id)
      }
    } catch (err) {
      console.error('Failed to toggle rental wishlist:', err)
      setIsLiked(!nextLiked)
    }
  }

  const handleCreateBooking = async (event) => {
    event.preventDefault()
    setBookingError('')

    if (!startDatetime || !endDatetime) {
      setBookingError('Choose both a start and end time.')
      return
    }

    setSubmittingBooking(true)
    try {
      const isDaily = (rental.rate_type || 'daily').toLowerCase() === 'daily'
      const startIso = isDaily
        ? `${startDatetime.split('T')[0]}T00:00:00.000Z`
        : new Date(startDatetime).toISOString()
      const endIso = isDaily
        ? `${endDatetime.split('T')[0]}T00:00:00.000Z`
        : new Date(endDatetime).toISOString()

      await api.post('/rental-bookings', {
        rental_listing_id: rental.id,
        start_datetime: startIso,
        end_datetime: endIso,
        meeting_location: meetingLocation.trim() || null,
      })

      setIsBookingModalOpen(false)
      navigate('/renter/my-rentals')
    } catch (err) {
      setBookingError(err.response?.data?.error || 'Unable to create booking.')
    } finally {
      setSubmittingBooking(false)
    }
  }

  if (loading) return <div className="rental-detail-state"><div className="rental-spinner" /><h2>Loading rental details</h2></div>
  if (error || !rental) return <div className="rental-detail-state rental-detail-error"><Package size={35} /><h2>{error || 'Rental listing not found'}</h2><button type="button" onClick={() => navigate('/renter')}>Back to rentals</button></div>

  const images = Array.isArray(rental.image_urls) && rental.image_urls.length ? rental.image_urls : []
  const title = rental.item_name || 'Rental item'
  const status = rental.status === 'available' ? 'Available' : rental.status === 'paused' ? 'Paused' : 'Rented'
  const isOwner = Boolean(currentUser && (currentUser.id === rental.owner_id || currentUser.id === rental.user_id))

  return (
    <div className="rental-detail-page">
      <main className="rental-detail-content">
        <button type="button" className="rental-detail-back" onClick={() => navigate('/renter')}>
          <ChevronLeft size={18} /> Back to rentals
        </button>

        <div className="rental-detail-layout">
          <div className="rental-detail-gallery">
            <div className="rental-detail-image-shell">
              {images.length ? (
                <>
                  <div className="rental-detail-backdrop" style={{ backgroundImage: `url(${images[imageIndex]})` }} />
                  <img src={images[imageIndex]} alt={title} className="rental-detail-main-image" />
                </>
              ) : (
                <Package size={48} />
              )}
              <span className={`rental-detail-badge rental-detail-badge-${rental.status || 'available'}`}>
                <CheckCircle2 size={13} /> {status}
              </span>
              {images.length > 1 && (
                <>
                  <button type="button" className="rental-detail-arrow left" onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)} aria-label="Previous image">
                    <ChevronLeft size={18} />
                  </button>
                  <button type="button" className="rental-detail-arrow right" onClick={() => setImageIndex((imageIndex + 1) % images.length)} aria-label="Next image">
                    <ChevronRight size={18} />
                  </button>
                  <span className="rental-detail-count">{imageIndex + 1} / {images.length}</span>
                </>
              )}
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
            <div className="rental-detail-badges">
              <span>{rental.category || 'Other'}</span>
              <strong>{status}</strong>
            </div>
            <h1>{rental.item_name}</h1>
            <p className="rental-detail-owner">
              <User size={15} /> Listed by <Link to={`/rental/profile/${rental.owner_id}`}>{rental.owner_name || 'Owner'}</Link>
            </p>
            <p className="rental-detail-description">{rental.description || 'No description provided.'}</p>
            <div className="rental-detail-rate">
              INR {Number(rental.rate_amount).toLocaleString('en-IN')} <small>/ {rental.rate_type === 'hourly' ? 'hour' : 'day'}</small>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              {isOwner ? (
                <span className="rental-detail-mine-pill">Mine (Your listing)</span>
              ) : rental.status === 'available' ? (
                <button
                  type="button"
                  className="rental-detail-rent"
                  onClick={() => { setBookingError(''); setIsBookingModalOpen(true) }}
                >
                  Rent
                </button>
              ) : (
                <p className="rental-detail-unavailable">This listing is not currently available.</p>
              )}

              <button
                type="button"
                className={`rental-detail-wishlist-btn${isLiked ? ' liked' : ''}`}
                onClick={toggleLike}
                aria-label={isLiked ? 'Remove from wishlist' : 'Save to wishlist'}
                title={isLiked ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <Heart size={20} />
              </button>
            </div>
            {notice && <p className="rental-detail-notice" role="status">{notice}</p>}
          </section>
        </div>
      </main>
      {isBookingModalOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="rental-booking-title" style={{ position: 'fixed', inset: 0, zIndex: 20, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(15, 23, 42, 0.45)' }}>
          <form onSubmit={handleCreateBooking} style={{ width: 'min(100%, 460px)', display: 'grid', gap: 14, padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 20px 60px rgba(15, 23, 42, 0.22)' }}>
            <h2 id="rental-booking-title" style={{ margin: 0 }}>Request this rental</h2>
            <label>
              {rental.rate_type === 'hourly' ? 'Start time' : 'Start date'}
              <input
                type={rental.rate_type === 'hourly' ? 'datetime-local' : 'date'}
                value={startDatetime}
                onChange={(event) => setStartDatetime(event.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </label>
            <label>
              {rental.rate_type === 'hourly' ? 'End time' : 'End date'}
              <input
                type={rental.rate_type === 'hourly' ? 'datetime-local' : 'date'}
                value={endDatetime}
                onChange={(event) => setEndDatetime(event.target.value)}
                min={startDatetime ? startDatetime.split('T')[0] : new Date().toISOString().split('T')[0]}
                required
              />
            </label>
            <label>Meeting location<input value={meetingLocation} onChange={(event) => setMeetingLocation(event.target.value)} placeholder="Optional handoff location" /></label>
            {bookingError && <p className="rental-detail-notice" role="alert">{bookingError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setIsBookingModalOpen(false)} disabled={submittingBooking}>Cancel</button>
              <button type="submit" className="rental-detail-rent" disabled={submittingBooking}>{submittingBooking ? 'Sending...' : 'Send request'}</button>
            </div>
          </form>
        </div>
      )}
      <Footer />
    </div>
  )
}
