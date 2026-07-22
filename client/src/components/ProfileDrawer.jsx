import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import {
  User,
  Box,
  Repeat,
  FileText,
  MessageCircle,
  Heart,
  CreditCard,
  Star,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react'
import './ProfileDrawer.css'

const primaryItems = [
  { label: 'My Profile', icon: User, path: '/profile' },
  { label: 'My Listings', icon: Box, path: '/my-listings' },
  { label: 'My Trades', icon: Repeat, path: '/my-trades' },
  { label: 'Trade Requests', icon: FileText },
  { label: 'Chats', icon: MessageCircle },
  { label: 'Wishlist', icon: Heart, path: '/wishlist' },
  { label: 'Wallet', icon: CreditCard },
  { label: 'Feedback & Reviews', icon: Star, path: '/feedback' },
]

const secondaryItems = [
  { label: 'Settings', icon: Settings },
  { label: 'Help & Support', icon: HelpCircle, path: '/help' },
]

export default function ProfileDrawer({ open, onClose, onLogout }) {
  const [activeItem, setActiveItem] = useState('My Profile')
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser } = useAuth()

  const userName = useMemo(
    () =>
      currentUser?.full_name ||
      currentUser?.name ||
      currentUser?.username ||
      'Trader',
    [currentUser]
  )

  const userEmail = currentUser?.email || 'you@example.com'
  const userAvatar =
    currentUser?.avatar ||
    'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=facearea&facepad=3&w=128&h=128&q=80'

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && open) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!location.pathname) return

    const active = primaryItems
      .concat(secondaryItems)
      .find((item) => item.path === location.pathname)
    if (active) {
      setActiveItem(active.label)
    }
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  function handleItemClick(item) {
    setActiveItem(item.label)
    if (item.path) {
      navigate(item.path)
      onClose()
      return
    }

    onClose()
  }

  function handleLogout() {
    if (typeof onLogout === 'function') {
      onLogout()
    } else {
      navigate('/logout')
    }
    onClose()
  }

  return (
    <div
      className={open ? 'drawer-backdrop active' : 'drawer-backdrop'}
      onClick={(event) => {
        if (event.target.classList.contains('drawer-backdrop')) {
          onClose()
        }
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
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close drawer">
            ×
          </button>
        </div>

        <nav className="drawer-menu" aria-label="Profile navigation">
          <div className="drawer-group">
            {primaryItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  type="button"
                  key={item.label}
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
            {secondaryItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  type="button"
                  key={item.label}
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
