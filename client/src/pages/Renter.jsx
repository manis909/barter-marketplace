import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Package, User } from 'lucide-react'
import Footer from '../components/Footer'
import CategoryFilter from '../components/CategoryFilter'
import api from '../services/api'
import { CATEGORY_META, normalizeCategory } from '../data/categories'
import './Renter.css'

export default function Renter() {
  const location = useLocation()
  const navigate = useNavigate()
  const [rentals, setRentals] = useState([])
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') || '')
  const [category, setCategory] = useState(() => normalizeCategory(new URLSearchParams(location.search).get('category')) || 'All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadRentals = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/rentals')
      setRentals(Array.isArray(response.data.rentals) ? response.data.rentals : [])
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load rental listings right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRentals() }, [])

  const visibleRentals = useMemo(() => rentals.filter((rental) => {
    if (category !== 'All' && normalizeCategory(rental.category).toLowerCase() !== category.toLowerCase()) return false
    const query = search.trim().toLowerCase()
    return !query || [rental.item_name, rental.category, rental.description, rental.owner_name]
      .some((value) => String(value || '').toLowerCase().includes(query))
  }), [category, rentals, search])

  const handleRent = () => setNotice('Rental requests are not available yet. Please check back soon.')
  const handleCategorySelect = (nextCategory) => {
    const params = new URLSearchParams(location.search)
    const normalized = nextCategory || 'All'
    setCategory(normalized)
    if (normalized === 'All') params.delete('category')
    else params.set('category', normalized)
    navigate({ pathname: '/renter', search: params.toString() ? `?${params.toString()}` : '' })
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearch(params.get('search') || '')
    setCategory(normalizeCategory(params.get('category')) || 'All')
  }, [location.search])

  return <div className="renter-page">
    <main className="renter-content">
      <CategoryFilter activeCategory={category} onSelect={handleCategorySelect} categories={CATEGORY_META} heading="Browse rental categories" />
      {notice && <div className="renter-notice"><p>{notice}</p></div>}
      {loading ? <div className="renter-state"><div className="renter-spinner" /><h2>Loading rental listings</h2></div> : error ? <div className="renter-state renter-error"><Package size={35} /><h2>We could not load rentals</h2><p>{error}</p><button className="renter-retry" type="button" onClick={loadRentals}>Try again</button></div> : visibleRentals.length === 0 ? <div className="renter-state"><Package size={35} /><h2>{rentals.length ? 'No matching rentals' : 'No rentals available yet'}</h2><p>{rentals.length ? 'Try another search or category.' : 'Check back soon for items shared by your community.'}</p></div> : <><p className="renter-results">{visibleRentals.length} available {visibleRentals.length === 1 ? 'rental' : 'rentals'}</p><div className="renter-grid">{visibleRentals.map((rental) => {
        const image = Array.isArray(rental.image_urls) && rental.image_urls.length ? rental.image_urls[0] : ''
        return <article className="rental-market-card" key={rental.id}><div className="rental-market-media">{image && <div className="rental-market-backdrop" style={{ backgroundImage: `url(${image})` }} />} {image ? <img className="rental-market-image" src={image} alt={rental.item_name} /> : <Package size={35} />}</div><div className="rental-market-body"><div className="rental-market-badges"><span className="rental-market-badge">{rental.category || 'Other'}</span><span className="rental-market-status">Available</span></div><h2 className="rental-market-title">{rental.item_name}</h2><div className="rental-market-owner"><User size={12} /><span>{rental.owner_name || 'Owner'}</span></div><div className="rental-market-rate">INR {Number(rental.rate_amount).toLocaleString('en-IN')} <small>/ {rental.rate_type === 'hourly' ? 'hour' : 'day'}</small></div><div className="rental-market-actions"><Link className="rental-market-details" to={`/rental/${rental.id}`}>View Details</Link><button className="rental-market-rent" type="button" onClick={handleRent}>Rent</button></div></div></article>
      })}</div></>}
    </main>
    <Footer />
  </div>
}
