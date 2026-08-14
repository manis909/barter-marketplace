/**
 * SkilterDrawer
 *
 * Side panel for Skilter mode. Reuses every ProfileDrawer CSS class so
 * the visual design is identical — no duplicate styles needed.
 *
 * Shared with Barter (not duplicated):
 *   • My Profile  → /profile          (same ProfilePage component)
 *   • Feedback    → /feedback          (same FeedbackReviews component)
 *   • Log Out     → useAuth().logout() (same auth logic)
 *
 * Skilter-specific nav items (placeholder routes for now):
 *   • My Skills       → /skilter/skills
 *   • My Learning     → /skilter/learning
 *   • My Teaching     → /skilter/teaching
 *   • Requests        → /skilter/requests
 *   • Wishlist        → /skilter/wishlist  (independent from Barter wishlist)
 *   • Chat            → /skilter/chat      (independent from Barter chat)
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import {
  User,
  Lightbulb,
  BookOpen,
  GraduationCap,
  Heart,
  MessageCircle,
  Star,
  LogOut,
  Shield,
} from 'lucide-react'
// Reuse ProfileDrawer's CSS — no new stylesheet needed
import './ProfileDrawer.css'

const primaryItems = [
  { label: 'My Profile',   icon: User,          path: '/profile' },
  { label: 'My Skills',    icon: Lightbulb,     path: '/skilter/skills' },
  { label: 'My Learning',  icon: BookOpen,      path: '/skilter/learning' },
  { label: 'My Teaching',  icon: GraduationCap, path: '/skilter/teaching' },
  { label: 'Wishlist',     icon: Heart,         path: '/skilter/wishlist' },
  { label: 'Chat',         icon: MessageCircle, path: '/skilter/chat' },
  { label: 'Feedback',     icon: Star,          path: '/feedback' },
]

export default function SkilterDrawer({ open, onClose }) {
  const [activeItem, setActiveItem] = useState('My Profile')
  const navigate  = useNavigate()
  const location  = useLocation()
  const { currentUser, logout } = useAuth()

  const userName = useMemo(
    () =>
      currentUser?.full_name ||
      currentUser?.name      ||
      currentUser?.username  ||
      'Trader',
    [currentUser]
  )
  const userEmail = currentUser?.email || 'you@example.com'

  // Highlight the active item based on current URL
  useEffect(() => {
    if (!location.pathname) return
    const active = primaryItems.find((item) => item.path === location.pathname)
    if (active) setActiveItem(active.label)
  }, [location.pathname])

  // Keyboard close
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape' && open) onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function handleItemClick(item) {
    setActiveItem(item.label)
    if (item.path) {
      navigate(item.path)
      onClose()
    } else {
      onClose()
    }
  }

  function handleLogout() {
    logout()
    navigate('/skilter/explore', { replace: true })
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

        {/* Header */}
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
            aria-label="Close Skilter drawer"
          >
            ×
          </button>
        </div>

        {/* Nav */}
        <nav className="drawer-menu" aria-label="Skilter navigation">

          {/* Primary items */}
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

          {currentUser?.is_admin && (
            <>
              <div className="drawer-divider" />
              <div className="drawer-group">
                <p className="drawer-group-title" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 14px 4px', margin: 0 }}>
                  Admin Controls
                </p>
                <button
                  type="button"
                  className={location.pathname === '/admin/verification' ? 'drawer-item active' : 'drawer-item'}
                  onClick={() => {
                    navigate('/admin/verification')
                    onClose()
                  }}
                >
                  <span className="drawer-icon" aria-hidden="true">
                    <Shield size={18} />
                  </span>
                  <span>Trade Verification</span>
                </button>
                <button
                  type="button"
                  className={location.pathname === '/admin/payment-review' ? 'drawer-item active' : 'drawer-item'}
                  onClick={() => {
                    navigate('/admin/payment-review')
                    onClose()
                  }}
                >
                  <span className="drawer-icon" aria-hidden="true">
                    <Shield size={18} />
                  </span>
                  <span>Payment Review</span>
                </button>
              </div>
            </>
          )}

          <div className="drawer-divider" />

          {/* Logout — shared logic, not duplicated */}
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
