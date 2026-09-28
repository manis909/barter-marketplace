import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Package, ArrowLeft, Trash2, User, ChevronRight } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { getRentalWishlist, removeRentalWishlist } from '../services/rentalWishlistService'
import Footer from '../components/Footer'

const CSS = `
.rw-page {
  min-height: 100vh;
  background: #f8f7f2;
  color: #10241c;
  font-family: 'Inter', sans-serif;
  padding: 32px 20px 64px;
}
.rw-container {
  max-width: 960px;
  margin: 0 auto;
}
.rw-back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(15,61,46,0.15);
  background: #ffffff;
  color: #0f3d2e;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  margin-bottom: 24px;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.rw-back:hover {
  background: #f0f4f1;
  border-color: rgba(15,61,46,0.25);
}
.rw-header {
  margin-bottom: 28px;
}
.rw-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.rw-title {
  font-family: 'Fraunces', serif;
  font-size: 32px;
  font-weight: 700;
  color: #0f3d2e;
  margin: 0;
  letter-spacing: -0.02em;
}
.rw-count-badge {
  font-size: 13px;
  font-weight: 700;
  background: rgba(198,233,48,0.25);
  color: #0f3d2e;
  border: 1px solid rgba(198,233,48,0.6);
  padding: 4px 12px;
  border-radius: 999px;
}
.rw-subtitle {
  font-size: 14.5px;
  color: #5d7067;
  margin: 8px 0 0;
  max-width: 580px;
  line-height: 1.5;
}

.rw-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.rw-card {
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid rgba(15,61,46,0.08);
  box-shadow: 0 4px 16px rgba(15,61,46,0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.rw-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(15,61,46,0.08);
}
.rw-card-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #f4f3ed;
  overflow: hidden;
  display: grid;
  place-items: center;
}
.rw-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.rw-remove-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #ffffff;
  color: #ef4444;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  transition: all 0.15s;
}
.rw-remove-btn:hover {
  background: #fef2f2;
  transform: scale(1.08);
}
.rw-card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 10px;
}
.rw-card-badges {
  display: flex;
  align-items: center;
  gap: 6px;
}
.rw-category-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(15,61,46,0.08);
  color: #0f3d2e;
}
.rw-card-title {
  font-family: 'Fraunces', serif;
  font-size: 17px;
  font-weight: 700;
  color: #10241c;
  margin: 0;
  line-height: 1.3;
}
.rw-card-owner {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: #647167;
}
.rw-card-owner a {
  color: #0f3d2e;
  font-weight: 600;
  text-decoration: none;
}
.rw-card-owner a:hover {
  text-decoration: underline;
}
.rw-card-rate {
  margin-top: auto;
  font-size: 16px;
  font-weight: 800;
  color: #0f3d2e;
}
.rw-card-rate small {
  font-size: 12px;
  font-weight: 600;
  color: #647167;
}
.rw-card-actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
}
.rw-rent-btn {
  flex: 1;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  border: 0;
  background: #0f3d2e;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s;
}
.rw-rent-btn:hover {
  background: #1b4d3e;
}

.rw-empty {
  text-align: center;
  padding: 64px 20px;
  background: #ffffff;
  border-radius: 24px;
  border: 1px solid rgba(15,61,46,0.08);
  box-shadow: 0 4px 20px rgba(15,61,46,0.04);
}
.rw-empty-icon {
  width: 60px;
  height: 60px;
  border-radius: 20px;
  background: rgba(15,61,46,0.06);
  color: #0f3d2e;
  display: grid;
  place-items: center;
  margin: 0 auto 18px;
}
.rw-empty h3 {
  font-family: 'Fraunces', serif;
  font-size: 22px;
  color: #0f3d2e;
  margin: 0 0 8px;
}
.rw-empty p {
  font-size: 14px;
  color: #647167;
  max-width: 360px;
  margin: 0 auto 22px;
  line-height: 1.5;
}
.rw-explore-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 14px;
  background: #c6e930;
  color: #0f3d2e;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 6px 18px rgba(198,233,48,0.35);
  transition: transform 0.15s;
}
.rw-explore-btn:hover {
  transform: translateY(-2px);
}
`

export default function RentalWishlist() {
  const { currentUser, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchWishlist = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getRentalWishlist()
      setWishlist(Array.isArray(data.wishlist) ? data.wishlist : [])
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load your rental wishlist.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!currentUser) {
      setLoading(false)
      return
    }
    fetchWishlist()
  }, [authLoading, currentUser, fetchWishlist])

  const handleRemove = async (rentalListingId) => {
    try {
      await removeRentalWishlist(rentalListingId)
      setWishlist((prev) => prev.filter((item) => item.id !== rentalListingId))
    } catch (err) {
      console.error('Failed to remove from rental wishlist:', err)
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="rw-page">
        <div className="rw-container">
          <Link to="/renter" className="rw-back">
            <ArrowLeft size={15} /> Back to Rentals
          </Link>

          <header className="rw-header">
            <div className="rw-title-row">
              <h1 className="rw-title">Rental Wishlist</h1>
              {wishlist.length > 0 && (
                <span className="rw-count-badge">
                  {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}
                </span>
              )}
            </div>
            <p className="rw-subtitle">
              Items you&apos;ve saved to rent. Keep an eye on availability or book whenever you&apos;re ready.
            </p>
          </header>

          {loading ? (
            <p style={{ color: '#5d7067', fontSize: 14 }}>Loading saved rentals…</p>
          ) : error ? (
            <div className="rw-empty">
              <h3>Could not load wishlist</h3>
              <p>{error}</p>
              <button
                type="button"
                onClick={fetchWishlist}
                className="rw-explore-btn"
                style={{ cursor: 'pointer', border: 0 }}
              >
                Try Again
              </button>
            </div>
          ) : wishlist.length === 0 ? (
            <div className="rw-empty">
              <div className="rw-empty-icon">
                <Heart size={28} />
              </div>
              <h3>Your rental wishlist is empty</h3>
              <p>Explore tools, gear, and items in the rental catalog to save them for later.</p>
              <Link to="/renter" className="rw-explore-btn">
                Browse Rental Items <ChevronRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="rw-grid">
              {wishlist.map((item) => {
                const image = Array.isArray(item.image_urls) && item.image_urls.length ? item.image_urls[0] : ''
                return (
                  <article key={item.id} className="rw-card">
                    <div className="rw-card-media">
                      {image ? (
                        <img src={image} alt={item.item_name} className="rw-card-img" />
                      ) : (
                        <Package size={40} color="#7a8c84" />
                      )}
                      <button
                        type="button"
                        className="rw-remove-btn"
                        onClick={() => handleRemove(item.id)}
                        aria-label="Remove from wishlist"
                        title="Remove from wishlist"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="rw-card-body">
                      <div className="rw-card-badges">
                        <span className="rw-category-badge">{item.category || 'Rental'}</span>
                      </div>
                      <h2 className="rw-card-title">{item.item_name}</h2>
                      <div className="rw-card-owner">
                        <User size={13} />
                        <span>
                          From <Link to={`/rental/profile/${item.owner_id}`}>{item.owner_name || item.owner_username || 'Owner'}</Link>
                        </span>
                      </div>
                      <div className="rw-card-rate">
                        ₹{Number(item.rate_amount).toLocaleString('en-IN')}{' '}
                        <small>/ {item.rate_type === 'hourly' ? 'hour' : 'day'}</small>
                      </div>
                      <div className="rw-card-actions">
                        <Link to={`/rental/${item.id}`} className="rw-rent-btn">
                          View & Rent
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
