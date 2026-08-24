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
          {rental.status === 'available' ? <button type="button" className="rental-detail-rent" onClick={() => setNotice('Rental requests are not available yet. Please check back soon.')}>Rent</button> : <p className="rental-detail-unavailable">This listing is not currently available.</p>}
          {notice && <p className="rental-detail-notice" role="status">{notice}</p>}
        </section>
      </div>
    </main>
    <Footer />
  </div>
}
