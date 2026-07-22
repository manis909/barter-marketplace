import { useState } from 'react';

const API_URL = 'http://localhost:5000';

export default function RatingForm({ tradeOfferId, revieweeId, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      setError('Please select 1 to 5 stars');
      return;
    }
    setSubmitting(true);
    setError('');

    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        trade_offer_id: tradeOfferId,
        reviewee_id: revieweeId,
        rating,
        review
      })
    });

    setSubmitting(false);

    if (res.status === 409) {
      setError('You already rated this trade');
      return;
    }
    if (!res.ok) {
      setError('Something went wrong, try again');
      return;
    }

    if (onSubmitted) onSubmitted();
  };

  return (
    <div style={{ padding: 12, border: '1px solid #ccc', borderRadius: 8, maxWidth: 300 }}>
      <p>Rate this trade</p>
      <div>
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            onClick={() => setRating(star)}
            style={{ cursor: 'pointer', fontSize: 24, color: star <= rating ? 'gold' : '#ccc' }}
          >
            ★
          </span>
        ))}
      </div>
      <textarea
        placeholder="Optional comment"
        value={review}
        onChange={e => setReview(e.target.value)}
        style={{ width: '100%', marginTop: 8 }}
      />
      {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
      <button onClick={handleSubmit} disabled={submitting} style={{ marginTop: 8 }}>
        {submitting ? 'Submitting...' : 'Submit Rating'}
      </button>
    </div>
  );
}