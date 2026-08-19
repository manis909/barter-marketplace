import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, ShieldQuestion, ShieldX, X } from 'lucide-react'
import './VerificationRequiredModal.css'

const STATUS_CONFIG = {
  unverified: {
    icon: ShieldAlert,
    iconClass: 'vrm-icon--unverified',
    title: 'Verification Required',
  },
  pending: {
    icon: ShieldQuestion,
    iconClass: 'vrm-icon--pending',
    title: 'Verification Under Review',
  },
  rejected: {
    icon: ShieldX,
    iconClass: 'vrm-icon--rejected',
    title: 'Verification Rejected',
  },
}

const MESSAGES = {
  unverified: 'Verification required. Please complete your verification before performing this action.',
  pending: 'Your verification is currently under review. You can explore the marketplace, but you need to be verified before performing this action.',
  rejected: 'Your verification was rejected.',
}

export default function VerificationRequiredModal({ status, rejectionReason, onClose }) {
  const navigate = useNavigate()
  const cancelBtnRef = useRef(null)

  useEffect(() => {
    cancelBtnRef.current?.focus()
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unverified
  const Icon = config.icon

  function handleGoToProfile() {
    onClose()
    navigate('/profile')
  }

  return (
    <div className="vrm-backdrop" onClick={onClose} role="presentation">
      <div
        className="vrm-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="vrm-title"
        aria-describedby="vrm-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="vrm-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className={`vrm-icon ${config.iconClass}`}>
          <Icon size={24} />
        </div>

        <h2 className="vrm-title" id="vrm-title">{config.title}</h2>

        <p className="vrm-message" id="vrm-desc">
          {MESSAGES[status] || MESSAGES.unverified}
        </p>

        {status === 'rejected' && rejectionReason && (
          <>
            <p className="vrm-reason-label">Reason</p>
            <p className="vrm-reason">{rejectionReason}</p>
          </>
        )}

        <div className="vrm-actions">
          <button
            type="button"
            ref={cancelBtnRef}
            className="vrm-btn vrm-btn--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          {status !== 'pending' && (
            <button
              type="button"
              className="vrm-btn vrm-btn--primary"
              onClick={handleGoToProfile}
            >
              {status === 'rejected' ? 'Resubmit Verification' : 'Complete Verification'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
