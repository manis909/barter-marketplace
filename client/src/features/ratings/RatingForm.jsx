import { useState } from 'react';

const API_URL = 'http://localhost:5000';

const T = {
  bg:        '#F6F5F0',
  surface:   '#FFFFFF',
  text:      '#24231F',
  muted:     '#5F5B52',
  border:    '#E4E2D9',
  accent:    '#3D6E63',
  accentStrong: '#2F5B4D',
  danger:    '#dc2626',
  radiusCard: '14px',
  radiusCtrl: '9px',
};

export default function RatingForm({ tradeOfferId, revieweeId, onSubmitted }) {
  const [rating,     setRating]     = useState(0);
  const [review,     setReview]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      setError('Please select a star rating before submitting.');
      return;
    }
    setSubmitting(true);
    setError('');

    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ trade_offer_id: tradeOfferId, reviewee_id: revieweeId, rating, review }),
    });

    setSubmitting(false);

    if (res.status === 409) {
      // Already rated — treat as success so the UI moves forward
      if (onSubmitted) onSubmitted();
      return;
    }
    if (!res.ok) {
      setError('Something went wrong. Please try again.');
      return;
    }
    if (onSubmitted) onSubmitted();
  };

  return (
    <div style={{
      padding: '14px 16px',
      background: T.surface,
      borderRadius: T.radiusCtrl,
      border: `1px solid ${T.border}`,
      fontFamily: 'Manrope, sans-serif',
      boxSizing: 'border-box',
      width: '100%',
    }}>
      <p style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 600, color: T.text }}>
        Rate your trade experience
      </p>

      {/* Star selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 28, padding: 0, lineHeight: 1,
              color: star <= rating ? '#f59e0b' : T.border,
              transition: 'color 0.12s',
            }}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>

      {/* Optional comment */}
      <textarea
        placeholder="Optional comment…"
        value={review}
        onChange={e => setReview(e.target.value)}
        rows={2}
        style={{
          width: '100%', boxSizing: 'border-box',
          borderRadius: T.radiusCtrl, border: `1px solid ${T.border}`,
          padding: '8px 10px', resize: 'vertical',
          fontFamily: 'Manrope, sans-serif', fontSize: 13, color: T.text,
          background: T.bg, marginBottom: 10, display: 'block',
        }}
      />

      {error && (
        <p style={{ color: T.danger, fontSize: 12.5, margin: '0 0 8px' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          style={{
            padding: '7px 20px',
            borderRadius: T.radiusCtrl,
            border: 'none',
            background: rating === 0 ? T.border : T.accent,
            color: rating === 0 ? T.muted : '#fff',
            fontWeight: 600, fontSize: 13,
            cursor: rating === 0 ? 'default' : 'pointer',
            fontFamily: 'Manrope, sans-serif',
            transition: 'background 0.15s',
          }}
        >
          {submitting ? 'Submitting…' : 'Submit Rating'}
        </button>
      </div>
    </div>
  );
}
