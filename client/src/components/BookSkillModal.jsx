import { useState } from 'react';
import { createSkillBooking } from '../services/skillBookingService';
import './BookSkillModal.css';

export default function BookSkillModal({ skill, onClose, onSuccess }) {
  const [scheduledTime, setScheduledTime] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!skill) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await createSkillBooking(skill.id, scheduledTime, message);
      setSuccess('Booking request sent successfully!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send booking request.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="book-skill-overlay" onClick={onClose}>
      <div className="book-skill-modal" onClick={e => e.stopPropagation()}>
        <div className="book-skill-header">
          <div>
            <h3 className="book-skill-title">Book Skill Session</h3>
            <p className="book-skill-subtitle">
              Requesting <strong>{skill.skill_name}</strong> from @{skill.teacher_username || 'Teacher'}
            </p>
          </div>
          <button className="book-skill-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error && <div className="book-skill-error">{error}</div>}
        {success && <div className="book-skill-success">{success}</div>}

        <form onSubmit={handleSubmit} className="book-skill-form">
          <div className="book-skill-field">
            <label className="book-skill-label">Preferred Date & Time</label>
            <input
              type="datetime-local"
              className="book-skill-input"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
            />
          </div>

          <div className="book-skill-field">
            <label className="book-skill-label">Message / Topics to Cover</label>
            <textarea
              className="book-skill-textarea"
              placeholder="Hi! I'd like to learn..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="book-skill-actions">
            <button type="button" className="book-skill-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="book-skill-btn-submit" disabled={loading}>
              {loading ? 'Sending Request...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
