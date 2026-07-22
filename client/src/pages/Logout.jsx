import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import './Logout.css'

export default function Logout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function handleCancel() {
    navigate('/profile', { replace: true })
  }

  return (
    <main className="logout-page">
      <div className="logout-card">
        <p className="section-label">Confirm Logout</p>
        <h1>Are you sure you want to logout?</h1>
        <p className="section-copy">
          You will be returned to the login screen and your current session will end.
        </p>

        <div className="logout-actions">
          <button type="button" className="button-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button type="button" className="button-primary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </main>
  )
}
