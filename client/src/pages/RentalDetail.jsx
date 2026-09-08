import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Package, User } from 'lucide-react'
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
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [startDatetime, setStartDatetime] = useState('')
  const [endDatetime, setEndDatetime] = useState('')
  const [meetingLocation, setMeetingLocation] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [submittingBooking, setSubmittingBooking] = useState(false)

  useEffect(() => {
    let active = true
    api.get(`/rental-listings/${id}`)
      .then((response) => { if (active) setRental(response.data.rental) })
      .catch((err) => { if (active) setError(err.response?.data?.error || 'Unable to load this rental listing.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  const handleCreateBooking = async (event) => {
    event.preventDefault()
    setBookingError('')

    if (!startDatetime || !endDatetime) {
      setBookingError('Choose both a start and end time.')
      return
    }

    setSubmittingBooking(true)
    try {
      const response = await api.post('/rental-bookings', {
        rental_listing_id: rental.id,
        start_datetime: new Date(startDatetime).toISOString(),
        end_datetime: new Date(endDatetime).toISOString(),
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

  const images = Array.isArray(rental.image_urls) ? rental.image_urls : []
  const status = rental.status === 'available' ? 'Available' : rental.status === 'paused' ? 'Paused' : 'Rented'

  return <div className="rental-detail-page">
    <main className="rental-detail-content">
      <button type="button" className="rental-detail-back" onClick={() => navigate('/renter')}><ChevronLeft size={18} /> Back to rentals</button>
      <div className="rental-detail-layout">
        <div className="rental-detail-media">
          {images.length ? <><div className="rental-detail-backdrop" style={{ backgroundImage: `url(${images[imageIndex]})` }} /><img src={images[imageIndex]} alt={rental.item_name} /></> : <Package size={48} />}
          {images.length > 1 && <><button type="button" className="rental-detail-arrow left" onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)} aria-label="Previous image"><ChevronLeft size={18} /></button><button type="button" className="rental-detail-arrow right" onClick={() => setImageIndex((imageIndex + 1) % images.length)} aria-label="Next image"><ChevronRight size={18} /></button><span className="rental-detail-count">{imageIndex + 1} / {images.length}</span></>}
        </div>
        <section className="rental-detail-copy">
          <div className="rental-detail-badges"><span>{rental.category || 'Other'}</span><strong>{status}</strong></div>
          <h1>{rental.item_name}</h1>
          <p className="rental-detail-owner"><User size={15} /> Listed by <Link to={`/rental/profile/${rental.owner_id}`}>{rental.owner_name || 'Owner'}</Link></p>
          <p className="rental-detail-description">{rental.description || 'No description provided.'}</p>
          <div className="rental-detail-rate">INR {Number(rental.rate_amount).toLocaleString('en-IN')} <small>/ {rental.rate_type === 'hourly' ? 'hour' : 'day'}</small></div>
          {rental.status === 'available' ? <button type="button" className="rental-detail-rent" onClick={() => { setBookingError(''); setIsBookingModalOpen(true) }}>Rent</button> : <p className="rental-detail-unavailable">This listing is not currently available.</p>}
          {notice && <p className="rental-detail-notice" role="status">{notice}</p>}
        </section>
      </div>
    </main>
    {isBookingModalOpen && <div role="dialog" aria-modal="true" aria-labelledby="rental-booking-title" style={{ position: 'fixed', inset: 0, zIndex: 20, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(15, 23, 42, 0.45)' }}>
      <form onSubmit={handleCreateBooking} style={{ width: 'min(100%, 460px)', display: 'grid', gap: 14, padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 20px 60px rgba(15, 23, 42, 0.22)' }}>
        <h2 id="rental-booking-title" style={{ margin: 0 }}>Request this rental</h2>
        <label>Start time<input type="datetime-local" value={startDatetime} onChange={(event) => setStartDatetime(event.target.value)} required /></label>
        <label>End time<input type="datetime-local" value={endDatetime} onChange={(event) => setEndDatetime(event.target.value)} required /></label>
        <label>Meeting location<input value={meetingLocation} onChange={(event) => setMeetingLocation(event.target.value)} placeholder="Optional handoff location" /></label>
        {bookingError && <p className="rental-detail-notice" role="alert">{bookingError}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={() => setIsBookingModalOpen(false)} disabled={submittingBooking}>Cancel</button>
          <button type="submit" className="rental-detail-rent" disabled={submittingBooking}>{submittingBooking ? 'Sending...' : 'Send request'}</button>
        </div>
      </form>
    </div>}
    <Footer />
  </div>
}
