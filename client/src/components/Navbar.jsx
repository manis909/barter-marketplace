import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import SearchBar from './SearchBar'
import ProfileDrawer from './ProfileDrawer'
import NotificationBell from '../features/notifications/NotificationBell'
import { User } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') || '')
  const { currentUser } = useAuth()

  useEffect(() => {
    setSearch(new URLSearchParams(location.search).get('search') || '')
  }, [location.search])

  const handleSearchChange = (event) => {
    setSearch(event.target.value)
  }

  // Called when the user presses Enter or clicks the search icon
  const handleSearch = (query) => {
    const params = new URLSearchParams(location.search)
    if (query) {
      params.set('search', query)
    } else {
      params.delete('search')
    }
    navigate({ pathname: '/explore', search: params.toString() ? `?${params.toString()}` : '' })
  }

  // Called when the user clicks a suggestion row
  const handleSelect = (item) => {
    navigate(`/item/${item.id}`)
  }

  return (
    <>
      <header className="navbar">
        <div className="navbar-left">
          <Link to="/explore" className="navbar-brand">
            <div className="navbar-mark">⇄</div>
            <p className="navbar-logo">Barter</p>
          </Link>
        </div>

        <div className="navbar-center">
          <SearchBar
            placeholder="Search items to trade..."
            value={search}
            onChange={handleSearchChange}
            onSearch={handleSearch}
            onSelect={handleSelect}
          />
        </div>

        <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {currentUser ? (
            <button
              type="button"
              className="profile-button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open profile drawer"
            >
              <User className="profile-icon" size={20} />
            </button>
          ) : (
            <Link to="/signup" className="navbar-link">signup</Link>
          )}

          <Link to="/explore" className="navbar-link">Explore</Link>

          {currentUser && <NotificationBell />}
        </div>
      </header>

      {currentUser && <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
    </>
  )
}