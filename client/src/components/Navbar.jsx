import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import SearchBar from './SearchBar'
import ProfileDrawer from './ProfileDrawer'
import NotificationBell from '../features/notifications/NotificationBell'
import { User } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import './Navbar.css'

const navItems = [
  { label: 'Explore', path: '/explore' }
]

export default function Navbar() {
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { currentUser } = useAuth()

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
            onChange={(event) => setSearch(event.target.value)}
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
            {currentUser ? (
              <>
                <Link
                  to="/profile"
                  className={
                    location.pathname === '/profile' ? 'navbar-link active' : 'navbar-link'
                  }
                >
                  Profile
                </Link>
                <Link
                  to="/logout"
                  className={
                    location.pathname === '/logout' ? 'navbar-link active' : 'navbar-link'
                  }
                >
                  Logout
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={
                    location.pathname === '/login' ? 'navbar-link active' : 'navbar-link'
                  }
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className={
                    location.pathname === '/signup' ? 'navbar-link active' : 'navbar-link'
                  }
                >
                  Sign Up
                </Link>
              </>
            )}
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
