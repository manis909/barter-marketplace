import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import {
  User,
  Home,
  KeyRound,
  BriefcaseBusiness,
  Bell,
  MessageCircle,
  Heart,
  CreditCard,
  Star,
  LogOut,
} from 'lucide-react'
import './ProfileDrawer.css'

const primaryItems = [
  { label: 'My Profile',               icon: User,             path: '/rental/profile' },
  { label: 'My  Rental Listings',      icon: Home,             path: '/renter/listings' },
  { label: 'My Rentals',               icon: KeyRound,         path: '/renter/my-rentals' },
  { label: 'Rental Requests',          icon: BriefcaseBusiness, path: '/renter/requests' },
  { label: 'Notifications',            icon: Bell,             path: '/notifications' },
  { label: 'Chat',                     icon: MessageCircle,    path: '/chats' },
  { label: 'Wishlist',                 icon: Heart,            path: '/wishlist' },
  { label: 'Payments & Transactions',  icon: CreditCard,       path: '/wallet' },
  { label: 'Feedback',                 icon: Star,             path: '/feedback' },
]

export default function RentalDrawer({ open, onClose }) {
  const [activeItem, setActiveItem] = useState('My Profile')
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, logout } = useAuth()

  const userName = useMemo(
    () =>
      currentUser?.full_name ||
      currentUser?.name ||
      currentUser?.username ||
      'Renter',
    [currentUser]
  )
  const userEmail = currentUser?.email || 'you@example.com'

  useEffect(() => {
    if (!location.pathname) return
    const active = primaryItems.find((item) => item.path === location.pathname)
    if (active) setActiveItem(active.label)
  }, [location.pathname])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  function handleItemClick(item) {
    setActiveItem(item.label)
    if (item.path) {
      if (item.path === '/notifications') {
        navigate('/notifications', { state: { platform: 'rental' } })
      } else {
        navigate(item.path)
      }
      onClose()
    } else {
      onClose()
    }
  }

  function handleLogout() {
    logout()
    navigate('/explore', { replace: true })
    onClose()
  }

  return (
    <div
      className={open ? 'drawer-backdrop active' : 'drawer-backdrop'}
      onClick={(e) => {
        if (e.target.classList.contains('drawer-backdrop')) onClose()
      }}
      aria-hidden={!open}
    >
      <aside className={open ? 'profile-drawer active' : 'profile-drawer'}>
        <div className="drawer-header">
          <div className="drawer-user no-avatar">
            <div>
              <p className="drawer-name">{userName}</p>
              <p className="drawer-email">{userEmail}</p>
            </div>
          </div>
          <button
            type="button"
            className="drawer-close"
            onClick={onClose}
            aria-label="Close Rental drawer"
          >
            ×
          </button>
        </div>

        <nav className="drawer-menu" aria-label="Rental navigation">
          <div className="drawer-group">
            {primaryItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  className={item.label === activeItem ? 'drawer-item active' : 'drawer-item'}
                  onClick={() => handleItemClick(item)}
                >
                  <span className="drawer-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>

          <div className="drawer-divider" />

          <div className="drawer-group">
            <button type="button" className="drawer-item logout" onClick={handleLogout}>
              <span className="drawer-icon logout-icon" aria-hidden="true">
                <LogOut size={18} />
              </span>
              <span>Log Out</span>
            </button>
          </div>
        </nav>
      </aside>
    </div>
  )
}
