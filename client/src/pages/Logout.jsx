import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import AuthBackground from '../features/auth/AuthBackground'
import '../features/auth/AuthPages.css'

export default function Logout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/explore', { replace: true })
  }

  function handleCancel() {
    navigate('/explore', { replace: true })
  }

  return (
    <div className="auth-page">
      <AuthBackground />
      <div className="auth-card">
        <h2>Are you sure you want to logout?</h2>

        <div className="logout-actions">
          <button type="button" className="auth-submit auth-submit-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button type="button" className="auth-submit" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}