import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from '../features/auth/AuthContext'
import { useParams, useNavigate } from 'react-router-dom'
import './AdminApplicationReview.css'

export default function AdminApplicationReviewPage() {
  const { currentUser, token } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()

  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionInProgress, setActionInProgress] = useState(false)
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [actionType, setActionType] = useState(null) // 'changes' or 'reject'
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')

  useEffect(() => {
    fetchApplication()
  }, [id, token])

  async function fetchApplication() {
    if (!token || !id) return

    setLoading(true)
    setError('')

    try {
      const response = await api.get(`/skill-provider-applications/admin/${id}`)
      setApplication(response.data.application)
    } catch (err) {
      console.error('Error fetching application:', err)
      if (err.response?.status === 404) {
        setError('Application not found')
      } else if (err.response?.status === 403) {
        setError('You do not have permission to access this application.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load application')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    if (!token || !id) return

    setActionInProgress(true)
    try {
      const response = await api.post(`/skill-provider-applications/admin/${id}/approve`)
      setApplication(response.data.application)
      setError('')
      setTimeout(() => {
        navigate('/admin/payment-review')
      }, 1000)
    } catch (err) {
      console.error('Error approving application:', err)
      setError(err.response?.data?.error || err.message || 'Failed to approve application')
      setActionInProgress(false)
    }
  }

  async function handleRequestChanges() {
    if (!token || !id) return

    setReasonError('')
    if (!reason.trim()) {
      setReasonError('Please provide a reason for the changes')
      return
    }

    setActionInProgress(true)
    try {
      const response = await api.post(`/skill-provider-applications/admin/${id}/request-changes`, {
        reason: reason.trim(),
      })
      setApplication(response.data.application)
      setShowReasonModal(false)
      setReason('')
      setError('')
      setTimeout(() => {
        navigate('/admin/payment-review')
      }, 1000)
    } catch (err) {
      console.error('Error requesting changes:', err)
      setReasonError(err.response?.data?.error || err.message || 'Failed to request changes')
      setActionInProgress(false)
    }
  }

  async function handleReject() {
    if (!token || !id) return

    setReasonError('')
    if (!reason.trim()) {
      setReasonError('Please provide a reason for rejection')
      return
    }

    setActionInProgress(true)
    try {
      const response = await api.post(`/skill-provider-applications/admin/${id}/reject`, {
        reason: reason.trim(),
      })
      setApplication(response.data.application)
      setShowReasonModal(false)
      setReason('')
      setError('')
      setTimeout(() => {
        navigate('/admin/payment-review')
      }, 1000)
    } catch (err) {
      console.error('Error rejecting application:', err)
      setReasonError(err.response?.data?.error || err.message || 'Failed to reject application')
      setActionInProgress(false)
    }
  }

  function openReasonModal(type) {
    setActionType(type)
    setReason('')
    setReasonError('')
    setShowReasonModal(true)
  }

  function closeReasonModal() {
    setShowReasonModal(false)
    setActionType(null)
    setReason('')
    setReasonError('')
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!currentUser || !token) {
    return (
      <div className="review-page">
        <div className="error-message">
          Please log in to access the admin panel.
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="review-page">
        <div className="loading-state">Loading application...</div>
      </div>
    )
  }

  if (error && !application) {
    return (
      <div className="review-page">
        <div className="error-message">{error}</div>
        <button className="back-btn" onClick={() => navigate('/admin/payment-review')}>
          Back to Applications
        </button>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="review-page">
        <div className="error-message">Application not found</div>
      </div>
    )
  }

  return (
    <div className="review-page">
      <div className="review-container">
        {/* Header */}
        <div className="review-header">
          <button className="back-btn" onClick={() => navigate('/admin/payment-review')}>
            ← Back to Applications
          </button>
          <h1>Application Review</h1>
          <div className="status-badge" style={{
            background: application.status === 'under_review' ? '#fef3c7' : '#d1fae5',
            color: application.status === 'under_review' ? '#92400e' : '#065f46'
          }}>
            {application.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </div>
        </div>

        {error && (
          <div className="error-banner">{error}</div>
        )}

        <div className="review-grid">
          {/* Left Column */}
          <div className="review-column">
            {/* Applicant Section */}
            <section className="review-section">
              <h2 className="section-title">Applicant</h2>
              <div className="info-grid">
                <div className="info-item">
                  <label>Name</label>
                  <p>{application.full_name || '—'}</p>
                </div>
                <div className="info-item">
                  <label>Email</label>
                  <p>{application.email || '—'}</p>
                </div>
                <div className="info-item">
                  <label>College/Institution</label>
                  <p>{application.college || '—'}</p>
                </div>
                <div className="info-item">
                  <label>Verification Status</label>
                  <p className={`verification-status verification-status--${application.verification_status}`}>
                    {(application.verification_status || 'unverified').charAt(0).toUpperCase() +
                     (application.verification_status || 'unverified').slice(1)}
                  </p>
                </div>
              </div>
            </section>

            {/* Skill Section */}
            <section className="review-section">
              <h2 className="section-title">Skill Details</h2>
              <div className="info-grid">
                <div className="info-item">
                  <label>Skill Name</label>
                  <p>{application.skill_name || '—'}</p>
                </div>
                <div className="info-item">
                  <label>Category</label>
                  <p>{application.category || '—'}</p>
                </div>
                <div className="info-item">
                  <label>Experience Level</label>
                  <p>{application.experience_level || '—'}</p>
                </div>
                <div className="info-item full-width">
                  <label>About You</label>
                  <p>{application.about_you || '—'}</p>
                </div>
                <div className="info-item full-width">
                  <label>Skill Description</label>
                  <p>{application.skill_description || '—'}</p>
                </div>
              </div>
            </section>

            {/* Teaching Details Section */}
            <section className="review-section">
              <h2 className="section-title">Teaching Details</h2>
              <div className="info-grid">
                <div className="info-item">
                  <label>Teaching Mode</label>
                  <p>{application.teaching_mode || '—'}</p>
                </div>
                <div className="info-item">
                  <label>Language</label>
                  <p>{application.teaching_language || '—'}</p>
                </div>
                <div className="info-item">
                  <label>Session Duration</label>
                  <p>{application.session_duration || '—'}</p>
                </div>
                <div className="info-item full-width">
                  <label>Teaching Description</label>
                  <p>{application.teaching_description || '—'}</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="review-column">
            {/* Skill Demonstration Section */}
            <section className="review-section">
              <h2 className="section-title">Skill Demonstration</h2>
              {application.demo_video_url ? (
                <div className="demo-video-container">
                  <video
                    controls
                    width="100%"
                    style={{
                      borderRadius: '12px',
                      backgroundColor: '#000'
                    }}
                  >
                    <source src={application.demo_video_url} type={application.demo_video_mime || 'video/mp4'} />
                    Your browser does not support the video tag.
                  </video>
                  <div className="video-info">
                    <p><strong>File:</strong> {application.demo_video_name}</p>
                    {application.demo_video_duration && (
                      <p><strong>Duration:</strong> {Math.round(application.demo_video_duration)} seconds</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="missing-content">
                  <p>📹 No demo video uploaded</p>
                </div>
              )}
            </section>

            {/* Certificates Section */}
            <section className="review-section">
              <h2 className="section-title">Certificates & Achievements</h2>
              <p className="section-note">This section is optional</p>
              {application.certificates && application.certificates.length > 0 ? (
                <div className="certificates-list">
                  {application.certificates.map((cert, idx) => (
                    <div key={idx} className="certificate-item">
                      <span className="cert-icon">📄</span>
                      <div className="cert-info">
                        <p className="cert-name">{cert.name}</p>
                        <p className="cert-meta">
                          {cert.size && `${(cert.size / 1024).toFixed(0)}KB`}
                          {cert.uploadedAt && ` • ${new Date(cert.uploadedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <a href={cert.signedUrl} target="_blank" rel="noopener noreferrer" className="preview-btn">
                        Preview
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="missing-content">
                  <p>No certificates uploaded</p>
                </div>
              )}
            </section>

            {/* Agreement Section */}
            <section className="review-section">
              <h2 className="section-title">Agreement</h2>
              <div className="agreement-info">
                <div className="agreement-status">
                  <span className="status-icon">✓</span>
                  <p>Agreement Accepted: <strong>{application.agreement_accepted ? 'Yes' : 'No'}</strong></p>
                </div>
                {application.submitted_at && (
                  <p className="agreement-date">Submitted: {formatDate(application.submitted_at)}</p>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Admin Actions */}
        {application.status === 'under_review' && (
          <div className="review-actions">
            <button
              className="action-btn action-btn--approve"
              onClick={handleApprove}
              disabled={actionInProgress}
            >
              {actionInProgress ? 'Processing...' : '✓ Approve'}
            </button>
            <button
              className="action-btn action-btn--changes"
              onClick={() => openReasonModal('changes')}
              disabled={actionInProgress}
            >
              ⚠ Request Changes
            </button>
            <button
              className="action-btn action-btn--reject"
              onClick={() => openReasonModal('reject')}
              disabled={actionInProgress}
            >
              ✕ Reject
            </button>
          </div>
        )}

        {application.status !== 'under_review' && (
          <div className="review-actions-disabled">
            <p>This application has already been reviewed.</p>
          </div>
        )}
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">
              {actionType === 'changes' ? 'Request Changes' : 'Reject Application'}
            </h3>
            <p className="modal-description">
              {actionType === 'changes'
                ? 'Please specify what needs to be improved or changed.'
                : 'Please provide a clear reason for rejection.'}
            </p>
            <textarea
              className="reason-textarea"
              placeholder="Enter your reason here..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              disabled={actionInProgress}
            />
            {reasonError && <div className="error-message">{reasonError}</div>}
            <div className="modal-buttons">
              <button
                className="btn-cancel"
                onClick={closeReasonModal}
                disabled={actionInProgress}
              >
                Cancel
              </button>
              <button
                className={`btn-submit ${actionType === 'reject' ? 'btn-submit--danger' : ''}`}
                onClick={actionType === 'changes' ? handleRequestChanges : handleReject}
                disabled={actionInProgress || !reason.trim()}
              >
                {actionInProgress ? 'Processing...' : (actionType === 'changes' ? 'Request Changes' : 'Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
