import { useMemo, useState } from 'react'
import {
  Star,
  MessageSquare,
  Send,
  PlusCircle,
  CheckCircle2,
  Sparkles,
  Filter,
  AlertCircle,
  X,
  UserCheck,
} from 'lucide-react'
import './FeedbackReviews.css'

// Mock initial data structured to mirror future backend API schemas
const INITIAL_REVIEWS = [
  {
    id: 1,
    user: 'Riya Sharma',
    avatar: 'RS',
    date: 'May 2, 2026',
    rating: 5,
    comment: 'Fast trade and super friendly communication. Loved the swap experience!',
    verified: true,
  },
  {
    id: 2,
    user: 'Jordan Lee',
    avatar: 'JL',
    date: 'Apr 28, 2026',
    rating: 4,
    comment: 'Item arrived exactly as described and the swap process was seamlessly smooth.',
    verified: true,
  },
  {
    id: 3,
    user: 'Mina Patel',
    avatar: 'MP',
    date: 'Apr 16, 2026',
    rating: 5,
    comment: 'Great platform for local exchanges! Met an awesome community member and swapped camera gear.',
    verified: true,
  },
  {
    id: 4,
    user: 'Alex Rivera',
    avatar: 'AR',
    date: 'Apr 10, 2026',
    rating: 5,
    comment: 'The glassmorphic design and transaction safety make bartering feel so modern.',
    verified: false,
  },
]

export default function FeedbackReviews() {
  const [reviews, setReviews] = useState(INITIAL_REVIEWS)
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | '5' | '4' | '3' | '2' | '1'

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [userName, setUserName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const MAX_CHARS = 500

  // Calculate rating statistics dynamically
  const stats = useMemo(() => {
    const totalCount = reviews.length
    if (totalCount === 0) {
      return {
        average: '0.0',
        totalCount: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      }
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
    const average = (sum / totalCount).toFixed(1)

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews.forEach((r) => {
      if (distribution[r.rating] !== undefined) {
        distribution[r.rating]++
      }
    })

    const percentages = {}
    for (let i = 1; i <= 5; i++) {
      percentages[i] = Math.round((distribution[i] / totalCount) * 100)
    }

    return { average, totalCount, distribution, percentages }
  }, [reviews])

  // Filter reviews by rating star
  const filteredReviews = useMemo(() => {
    if (activeFilter === 'all') return reviews
    const starNum = parseInt(activeFilter, 10)
    return reviews.filter((r) => r.rating === starNum)
  }, [reviews, activeFilter])

  // Form submission handler
  const handleSubmit = (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!comment.trim()) {
      setErrorMessage('Please write a comment before submitting.')
      return
    }
    if (comment.trim().length < 10) {
      setErrorMessage('Feedback comment must be at least 10 characters long.')
      return
    }

    const nameToUse = userName.trim() || 'Community Member'
    const initials = nameToUse
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()

    const newReview = {
      id: Date.now(),
      user: nameToUse,
      avatar: initials || 'CM',
      date: 'Just now',
      rating: rating,
      comment: comment.trim(),
      verified: true,
    }

    setReviews([newReview, ...reviews])
    setSubmitted(true)
    setComment('')
    setUserName('')
    setRating(5)
  }

  return (
    <div className="feedback-page-wrapper">
      {/* Ambient Glassmorphic Background Orbs */}
      <div className="glass-ambient-orb orb-1" />
      <div className="glass-ambient-orb orb-2" />
      <div className="glass-ambient-orb orb-3" />

      <div className="feedback-container">
        {/* Header Banner */}
        <header className="feedback-header">
          <div className="header-badge">
            <Sparkles className="badge-icon" size={15} />
            <span>Community Feedback</span>
          </div>
          <h1 className="header-title">See what traders are saying</h1>
          <p className="header-subtitle">
            Member reviews build trust, foster local connections, and help every barter run smoothly.
          </p>
        </header>

        {/* Statistics & Breakdown Cards Grid */}
        <div className="stats-overview-grid">
          {/* Main Average Rating Score Card */}
          <div className="glass-card stat-card-main">
            <div className="stat-score-wrapper">
              <span className="stat-score-value">{stats.average}</span>
              <div className="stat-stars-column">
                <div className="stat-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={22}
                      className={
                        star <= Math.round(Number(stats.average))
                          ? 'star-icon filled'
                          : 'star-icon empty'
                      }
                    />
                  ))}
                </div>
                <span className="stat-meta">
                  out of 5.0 rating
                </span>
              </div>
            </div>
            <p className="stat-summary-copy">
              Based on <strong>{stats.totalCount}</strong> verified community reviews
            </p>
            <div className="stat-badge-row">
              <span className="trust-badge">
                <UserCheck size={14} /> 100% Trusted Members
              </span>
            </div>
            <button
              type="button"
              className="btn-lime btn-write-trigger"
              onClick={() => {
                setShowForm(!showForm)
                setSubmitted(false)
                setErrorMessage('')
              }}
            >
              {showForm ? (
                <>
                  <X size={18} /> Close Form
                </>
              ) : (
                <>
                  <PlusCircle size={18} /> Write Feedback
                </>
              )}
            </button>
          </div>

          {/* Visual Rating Breakdown Card */}
          <div className="glass-card stat-card-distribution">
            <h3 className="distribution-title">Rating Summary</h3>
            <div className="distribution-bars">
              {[5, 4, 3, 2, 1].map((starCount) => {
                const count = stats.distribution[starCount] || 0
                const percent = stats.percentages[starCount] || 0
                return (
                  <div key={starCount} className="dist-row">
                    <span className="dist-label">
                      {starCount} <Star size={12} className="star-icon inline-star" />
                    </span>
                    <div className="dist-track">
                      <div
                        className="dist-fill"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="dist-count">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Feedback Form Panel (Collapsible Glass Card) */}
        {showForm && (
          <section className="glass-card form-section-card">
            <div className="form-header">
              <h2>Share your experience</h2>
              <p className="form-subtitle">
                Leave a rating and honest feedback to guide fellow community members.
              </p>
            </div>

            {submitted ? (
              <div className="success-confirmation">
                <CheckCircle2 size={44} className="success-icon" />
                <h3>Thank you for your feedback!</h3>
                <p>Your review has been successfully posted to the community feed.</p>
                <button
                  type="button"
                  className="btn-secondary-glass"
                  onClick={() => setSubmitted(false)}
                >
                  Write Another Review
                </button>
              </div>
            ) : (
              <form className="feedback-form" onSubmit={handleSubmit}>
                {errorMessage && (
                  <div className="error-banner">
                    <AlertCircle size={18} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="user-name-input">
                    Your Name or Handle (Optional)
                  </label>
                  <input
                    id="user-name-input"
                    type="text"
                    className="glass-input"
                    placeholder="e.g. Alex Rivera"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Your Rating</label>
                  <div className="interactive-star-rating">
                    {[1, 2, 3, 4, 5].map((starVal) => {
                      const active = starVal <= (hoverRating || rating)
                      return (
                        <button
                          key={starVal}
                          type="button"
                          className={`star-btn ${active ? 'active' : ''}`}
                          onMouseEnter={() => setHoverRating(starVal)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(starVal)}
                          aria-label={`Rate ${starVal} out of 5 stars`}
                        >
                          <Star
                            size={28}
                            className={active ? 'star-icon filled' : 'star-icon empty'}
                          />
                        </button>
                      )
                    })}
                    <span className="rating-text-hint">
                      {hoverRating || rating} / 5 Stars
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <div className="label-with-counter">
                    <label className="form-label" htmlFor="review-comment-textarea">
                      Your Comment
                    </label>
                    <span
                      className={`char-counter ${
                        comment.length >= MAX_CHARS ? 'limit-reached' : ''
                      }`}
                    >
                      {comment.length} / {MAX_CHARS}
                    </span>
                  </div>
                  <textarea
                    id="review-comment-textarea"
                    className="glass-textarea"
                    rows={4}
                    maxLength={MAX_CHARS}
                    placeholder="Share what worked well, item condition, communication, and overall experience..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-lime btn-submit">
                    <Send size={16} /> Submit Review
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* Community Reviews Feed */}
        <section className="reviews-feed-section">
          <div className="feed-header-bar">
            <div className="feed-title-wrapper">
              <MessageSquare size={22} className="feed-icon" />
              <h2>Community Reviews ({filteredReviews.length})</h2>
            </div>

            {/* Filter Pills */}
            <div className="filter-pills">
              <span className="filter-label">
                <Filter size={14} /> Filter:
              </span>
              {['all', '5', '4', '3', '2', '1'].map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`filter-pill ${activeFilter === f ? 'active' : ''}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f === 'all' ? 'All' : `${f}★`}
                </button>
              ))}
            </div>
          </div>

          {/* Review List / Polished Empty State */}
          {filteredReviews.length === 0 ? (
            <div className="glass-card empty-state-card">
              <div className="empty-icon-wrapper">
                <MessageSquare size={44} className="empty-icon" />
              </div>
              <h3>No community reviews yet</h3>
              <p>Be the first to share your experience with the community!</p>
              <button
                type="button"
                className="btn-lime"
                onClick={() => {
                  setShowForm(true)
                  setActiveFilter('all')
                }}
              >
                <PlusCircle size={16} /> Write Feedback
              </button>
            </div>
          ) : (
            <div className="reviews-grid">
              {filteredReviews.map((review) => (
                <article key={review.id} className="glass-card review-card">
                  <div className="card-top">
                    <div className="user-profile">
                      <div className="avatar-circle">{review.avatar}</div>
                      <div className="user-details">
                        <div className="user-name-row">
                          <span className="user-name">{review.user}</span>
                          {review.verified && (
                            <span className="verified-badge">
                              <CheckCircle2 size={12} /> Verified
                            </span>
                          )}
                        </div>
                        <span className="review-date">{review.date}</span>
                      </div>
                    </div>
                    <div className="card-rating-stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          className={
                            star <= review.rating
                              ? 'star-icon filled'
                              : 'star-icon empty'
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <p className="review-comment-body">{review.comment}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
