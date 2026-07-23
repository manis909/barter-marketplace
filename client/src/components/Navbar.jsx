import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import SearchBar from './SearchBar'
import ProfileDrawer from './ProfileDrawer'
import NotificationBell from '../features/notifications/NotificationBell'
import { User } from 'lucide-react'
import './Navbar.css'

const navItems = [
  { label: 'Explore', path: '/explore' }
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') || '')

  useEffect(() => {
    setSearch(new URLSearchParams(location.search).get('search') || '')
  }, [location.search])

  const handleSearchChange = (event) => {
    const nextValue = event.target.value
    setSearch(nextValue)

    const params = new URLSearchParams(location.search)

    if (nextValue.trim()) {
      params.set('search', nextValue.trim())
    } else {
      params.delete('search')
    }

    navigate({ pathname: '/explore', search: params.toString() ? `?${params.toString()}` : '' })
  }

  return (
    <>
      <header className="navbar">
        <div className="navbar-left">
          <Link to="/explore" className="navbar-brand">
            <div className="navbar-mark">⇄</div>
            <div>
              <p className="navbar-logo">Barter</p>
            </div>
          </Link>
        </div>
        <div className="navbar-center">
          <SearchBar
            placeholder="Search items to trade..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        <div className="navbar-right">
          <nav className="navbar-links">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={
                  location.pathname === item.path ? 'navbar-link active' : 'navbar-link'
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <NotificationBell />
          <button
            type="button"
            className="profile-button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open profile drawer"
          >
            <User className="profile-icon" size={20} />
          </button>
        </div>
      </header>
      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
