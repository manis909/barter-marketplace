import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import SearchBar from './SearchBar'
import ProfileDrawer from './ProfileDrawer'
import { User } from 'lucide-react'
import './Navbar.css'

const navItems = [
  { label: 'Explore', path: '/explore' }
]

export default function Navbar() {
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')

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
          </nav>
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
