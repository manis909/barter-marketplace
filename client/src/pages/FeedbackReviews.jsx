import { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { fmtDate } from '../utils/helpers';
import './FeedbackReviews.css';

const RATING_LABELS = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

const CATEGORIES = [
  'General Experience',
  'Trading & Swapping',
  'UI & Usability',
  'Feature Suggestion',
  'Bug Report',
];

export default function FeedbackReviews() {
  const { currentUser } = useAuth();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [reviewText, setReviewText] = useState('');
  const [reviews, setReviews] = useState([]);
  const [submittedMessage, setSubmittedMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!rating || rating < 1) {
      setErrorMessage('Please select a star rating.');
      return;
    }

    if (!reviewText.trim()) {
      setErrorMessage('Please write your feedback message.');
      return;
    }

    const newReview = {
      id: Date.now(),
      username: currentUser?.full_name || currentUser?.username || 'Trader',
      avatar: currentUser?.profile_image || null,
      rating,
      category,
      reviewText: reviewText.trim(),
      date: new Date().toISOString(),
    };

    setReviews((prev) => [newReview, ...prev]);
    setSubmittedMessage(true);
    setReviewText('');
    setRating(5);
    setCategory(CATEGORIES[0]);

    setTimeout(() => {
      setSubmittedMessage(false);
    }, 4000);
  };

  const getInitial = (name) => (name || '?').trim().charAt(0).toUpperCase();

  return (
    <main className="fr-page">
      {/* Header Section */}
      <header className="fr-header">
        <span className="fr-pill-badge">
          <span className="fr-badge-icon">⭐</span> Community Feedback
        </span>
        <h1 className="fr-title">Feedback & Reviews</h1>
        <p className="fr-subtitle">
          We value your feedback! Help us improve Barter by sharing your experience, suggestions, or review.
        </p>
      </header>

      {/* Main Container */}
      <div className="fr-container">
        {/* Feedback Submission Card */}
        <section className="fr-card fr-form-card">
          <div className="fr-card-header">
            <h2>Share Your Experience</h2>
            <p>Your review helps make trading safer and better for everyone.</p>
          </div>

          {submittedMessage && (
            <div className="fr-alert fr-alert-success" role="alert">
              <span className="fr-alert-icon">✓</span>
              <span>Thank you for your feedback! Your review has been shared.</span>
            </div>
          )}

          {errorMessage && (
            <div className="fr-alert fr-alert-error" role="alert">
              <span className="fr-alert-icon">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="fr-form">
            {/* Rating Stars Input */}
            <div className="fr-field">
              <label className="fr-label">
                Overall Rating <span className="fr-required">*</span>
              </label>
              <div className="fr-star-picker">
                <div className="fr-stars-row">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (hoverRating || rating);
                    return (
                      <button
                        key={star}
                        type="button"
                        className={`fr-star-btn ${active ? 'active' : ''}`}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
                <span className="fr-rating-hint">
                  {RATING_LABELS[hoverRating || rating] || 'Select Rating'}
                </span>
              </div>
            </div>

            {/* Category Field */}
            <div className="fr-field">
              <label htmlFor="fr-category" className="fr-label">
                Category
              </label>
              <select
                id="fr-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="fr-select"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Feedback Text Area */}
            <div className="fr-field">
              <label htmlFor="fr-feedback" className="fr-label">
                Your Feedback <span className="fr-required">*</span>
              </label>
              <textarea
                id="fr-feedback"
                className="fr-textarea"
                placeholder="Write your feedback here... What did you enjoy about trading on Barter, or what can we improve?"
                rows={4}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                maxLength={800}
              />
            </div>

            {/* Submit Button */}
            <button type="submit" className="fr-submit-btn">
              <span>Submit Feedback</span>
              <span className="fr-btn-arrow">→</span>
            </button>
          </form>
        </section>

        {/* Reviews Listing Section */}
        <section className="fr-reviews-section">
          <div className="fr-section-title-row">
            <h2>Community Reviews</h2>
            {reviews.length > 0 && (
              <span className="fr-reviews-count">{reviews.length}</span>
            )}
          </div>

          {reviews.length === 0 ? (
            /* Empty State */
            <div className="fr-empty-state">
              <div className="fr-empty-icon-wrap">
                <span className="fr-empty-icon">💬</span>
              </div>
              <h3>No feedback yet</h3>
              <p>Be the first to share your experience!</p>
            </div>
          ) : (
            /* Reviews Grid */
            <div className="fr-reviews-list">
              {reviews.map((item) => (
                <div key={item.id} className="fr-review-card">
                  <div className="fr-review-header">
                    <div className="fr-user-info">
                      <span className="fr-avatar">
                        {item.avatar ? (
                          <img src={item.avatar} alt={item.username} />
                        ) : (
                          getInitial(item.username)
                        )}
                      </span>
                      <div>
                        <h4 className="fr-username">{item.username}</h4>
                        <span className="fr-date">{fmtDate(item.date)}</span>
                      </div>
                    </div>

                    {item.category && (
                      <span className="fr-category-tag">{item.category}</span>
                    )}
                  </div>

                  <div className="fr-stars-display" aria-label={`Rated ${item.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className={`fr-star-icon ${s <= item.rating ? 'filled' : 'empty'}`}>
                        ★
                      </span>
                    ))}
                  </div>

                  <p className="fr-review-text">{item.reviewText}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}