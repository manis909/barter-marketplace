import { useState } from 'react'
import { X } from 'lucide-react'
import api from '../services/api'
import './SkillProviderBookingModal.css'

export default function SkillProviderBookingModal({ skill, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    preferred_date: '',
    preferred_time: '',
    teaching_mode: skill?.teaching_mode || 'online',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const teachingModesAvailable = skill?.teaching_mode
    ? skill.teaching_mode.toLowerCase() === 'online & in-person'
      ? ['Online', 'In-Person']
      : [skill.teaching_mode]
    : ['Online']

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!formData.preferred_date) {
        throw new Error('Preferred date is required')
      }

      const response = await api.post('/skill-provider-requests', {
        skill_application_id: skill.id,
        preferred_date: formData.preferred_date,
        preferred_time: formData.preferred_time || null,
        teaching_mode: formData.teaching_mode,
        message: formData.message
      })

      if (response.data.success) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 1500)
      } else {
        throw new Error(response.data.error || 'Failed to create booking request')
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Failed to create booking request'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleInputChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const skillName = skill?.skill_name || 'Skill'
  const providerName = skill?.teacher_name || 'Provider'
  const minDate = new Date().toISOString().split('T')[0]

  return (
    <div className="booking-modal-backdrop" onClick={onClose} aria-hidden={success ? true : undefined}>
      <div className="booking-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="booking-modal__header">
          <div>
            <h2>Book a Session</h2>
            <p className="booking-modal__subtitle">{skillName} with {providerName}</p>
          </div>
          <button
            type="button"
            className="booking-modal__close"
            onClick={onClose}
            aria-label="Close booking modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="booking-modal__success">
            <div className="success-icon">✓</div>
            <h3>Request Sent!</h3>
            <p>{providerName} will review your request and get back to you soon.</p>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="booking-modal__form">
            {/* Skill Info */}
            <div className="booking-form-section">
              <h3 className="booking-form-section__title">Skill Details</h3>
              <div className="booking-form-row">
                <div className="booking-form-field">
                  <label>Skill Name</label>
                  <input type="text" value={skillName} disabled className="booking-form-input disabled" />
                </div>
                <div className="booking-form-field">
                  <label>Provider</label>
                  <input type="text" value={providerName} disabled className="booking-form-input disabled" />
                </div>
              </div>
              {skill?.experience_level && (
                <div className="booking-form-field">
                  <label>Level</label>
                  <input
                    type="text"
                    value={skill.experience_level}
                    disabled
                    className="booking-form-input disabled"
                  />
                </div>
              )}
            </div>

            {/* Scheduling */}
            <div className="booking-form-section">
              <h3 className="booking-form-section__title">Preferred Schedule</h3>
              <div className="booking-form-row">
                <div className="booking-form-field">
                  <label htmlFor="preferred_date">Date *</label>
                  <input
                    type="date"
                    id="preferred_date"
                    name="preferred_date"
                    value={formData.preferred_date}
                    onChange={handleInputChange}
                    min={minDate}
                    className="booking-form-input"
                    required
                  />
                </div>
                <div className="booking-form-field">
                  <label htmlFor="preferred_time">Time (Optional)</label>
                  <input
                    type="time"
                    id="preferred_time"
                    name="preferred_time"
                    value={formData.preferred_time}
                    onChange={handleInputChange}
                    className="booking-form-input"
                  />
                </div>
              </div>
            </div>

            {/* Teaching Mode */}
            {teachingModesAvailable.length > 1 && (
              <div className="booking-form-section">
                <h3 className="booking-form-section__title">Teaching Mode</h3>
                <div className="booking-form-modes">
                  {teachingModesAvailable.map(mode => (
                    <label key={mode} className="booking-form-mode-option">
                      <input
                        type="radio"
                        name="teaching_mode"
                        value={mode.toLowerCase()}
                        checked={formData.teaching_mode === mode.toLowerCase()}
                        onChange={handleInputChange}
                      />
                      <span>{mode}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Message */}
            <div className="booking-form-section">
              <h3 className="booking-form-section__title">Message to Provider (Optional)</h3>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Share any details about your learning goals or availability..."
                className="booking-form-textarea"
                rows={3}
              />
            </div>

            {/* Error */}
            {error && <div className="booking-form-error">{error}</div>}

            {/* Actions */}
            <div className="booking-modal__actions">
              <button
                type="button"
                className="secondary-button"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={loading}
              >
                {loading ? 'Sending Request...' : 'Send Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
