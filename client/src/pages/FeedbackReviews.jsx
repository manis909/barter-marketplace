import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Star,
  Upload,
  X,
  Check,
  ThumbsUp,
  MessageSquare,
} from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../features/auth/AuthContext'
import './FeedbackReviews.css'

// ── Static UI data ─────────────────────────────────────────────────────────
const CATEGORIES = [
  'Bug Report',
  'Feature Request',
  'User Experience',
  'Performance',
  'General Feedback',
]

const IMPROVEMENTS = [
  {
    id: 1,
    title: 'Improved mobile experience',
    desc: 'Responsive layouts rebuilt across all key pages.',
    date: 'Jul 2026',
  },
  {
    id: 2,
    title: 'Faster image uploads',
    desc: 'Supabase storage pipeline optimised — uploads are now 2× faster.',
    date: 'Jun 2026',
  },
  {
    id: 3,
    title: 'Better search performance',
    desc: 'Full-text search now returns results in under 100 ms.',
    date: 'Jun 2026',
  },
  {
    id: 4,
    title: 'Enhanced listing management',
    desc: 'Crop, reorder, and bulk-manage your listing images in one place.',
    date: 'May 2026',
  },
  {
    id: 5,
    title: 'UI refinements across the app',
    desc: 'Consistent spacing, typography, and colour system rolled out site-wide.',
    date: 'Apr 2026',
  },
]

// ── Sub-components ──────────────────────────────────────────────────────────
function StarRating({ value, onChange, readonly = false, size = 22 }) {
  const [hovered, setHovered] = useState(0)
  const display = hovered || value

  return (
    <div
      className={`star-rating ${readonly ? 'star-rating--readonly' : ''}`}
      role={readonly ? 'img' : 'radiogroup'}
      aria-label={readonly ? `${value} out of 5 stars` : 'Rate your experience'}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star-btn ${n <= display ? 'star-btn--filled' : ''}`}
          style={{ width: size + 4, height: size + 4 }}
          onMouseEnter={() => !readonly && setHovered(n)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => !readonly && onChange && onChange(n)}
          aria-label={`${n} star${n !== 1 ? 's' : ''}`}
          tabIndex={readonly ? -1 : 0}
        >
          <Star size={size} />
        </button>
      ))}
    </div>
  )
}

function ReviewCard({ review, onHelpful }) {
  return (
    <article className="review-card">
      <div className="review-card__header">
        <div className="review-avatar">{review.initials}</div>
        <div className="review-card__meta">
          <span className="review-name">{review.name}</span>
          <span className="review-date">{review.date}</span>
        </div>
        <StarRating value={review.rating} readonly size={14} />
      </div>
      <p className="review-text">{review.text}</p>
      <button
        type="button"
        className="helpful-btn"
        onClick={() => onHelpful(review.id)}
      >
        <ThumbsUp size={13} />
        <span>Helpful ({review.helpful})</span>
      </button>
    </article>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function FeedbackReviews() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  // ── form state ─────────────────────────────────────────────────────────
  const [rating, setRating] = useState(0)
  const [category, setCategory] = useState('')
  const [feedback, setFeedback] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [screenshot, setScreenshot] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // ── reviews state (real data) ───────────────────────────────────────────
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [helpfulVoted, setHelpfulVoted] = useState(new Set())

  // ── rating summary state (real data) ───────────────────────────────────
  // Derived from the reviews array — no separate summary fetch needed.
  // This avoids pg string-coercion issues (AVG returns "5.0" not 5) and
  // keeps the displayed counts always in sync with the visible review list.

  const fileInputRef = useRef(null)
  const MAX_CHARS = 1000

  // ── Helper: derive initials from a display name ─────────────────────────
  function getInitials(name) {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }

  // ── Load reviews on mount ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      setReviewsLoading(true)
      try {
        const reviewsRes = await api.get('/feedback')
        if (cancelled) return
        setReviews(reviewsRes.data.feedback || [])
      } catch (err) {
        if (!cancelled) console.error('Failed to load feedback:', err.message)
      } finally {
        if (!cancelled) setReviewsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // ── file / drag handlers (unchanged) ───────────────────────────────────
  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setScreenshot(file)
    setScreenshotPreview(URL.createObjectURL(file))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const removeScreenshot = () => {
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview)
    setScreenshot(null)
    setScreenshotPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Real submit ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0 || !feedback.trim()) return
    setSubmitting(true)
    setSubmitError('')

    try {
      const res = await api.post('/feedback', {
        rating,
        category: category || null,
        message: feedback.trim(),
        is_anonymous: anonymous,
      })

      const saved = res.data.feedback

      // Build display name for the optimistic card
      const displayName = anonymous
        ? 'Anonymous'
        : (currentUser?.full_name || currentUser?.username || 'You')

      const newReview = {
        id: saved.id,
        rating: saved.rating,
        message: saved.message,
        is_anonymous: saved.is_anonymous,
        created_at: saved.created_at,
        username: anonymous ? null : (currentUser?.username || null),
        full_name: anonymous ? null : (currentUser?.full_name || null),
        // helpers for ReviewCard
        _displayName: displayName,
        _initials: getInitials(displayName),
        helpful: 0,
      }

      // Prepend to list — summary values are derived from reviews automatically
      setReviews((prev) => [newReview, ...prev])

      setSubmitted(true)
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit feedback. Please try again.'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Helpful vote (client-side only) ────────────────────────────────────
  const handleHelpful = (id) => {
    if (helpfulVoted.has(id)) return
    setHelpfulVoted((prev) => new Set([...prev, id]))
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, helpful: (r.helpful || 0) + 1 } : r))
    )
  }

  const resetForm = () => {
    setRating(0)
    setCategory('')
    setFeedback('')
    setAnonymous(false)
    setSubmitError('')
    removeScreenshot()
    setSubmitted(false)
  }

  // ── Derived summary values — computed from real reviews array ─────────
  // All values are numbers from the start; no pg string coercion involved.
  const totalReviews = reviews.length
  const avgRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + Number(r.rating), 0) / totalReviews).toFixed(1)
    : '—'
  const ratingDist = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => Number(r.rating) === stars).length,
  }))

  return (
    <div className="fr-page">
      {/* ── Hero band ─────────────────────────────────────────────── */}
      <div className="fr-hero">
        <button
          type="button"
          className="fr-hero-back"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          ←
        </button>
      </div>

      {/* ── Title card (overlaps hero) ────────────────────────────── */}
      <div className="fr-title-card">
        <div className="fr-title-card__inner">
          <div className="fr-title-card__copy">
            <div className="fr-badge">
              <MessageSquare size={14} />
              <span>FEEDBACK</span>
            </div>
            <h1>Help us improve Barter</h1>
            <p>
              Your suggestions and reviews help us build a better marketplace
              for everyone.
            </p>
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="fr-body">
        <div className="fr-two-col">

          {/* ── LEFT: Submit Feedback ──────────────────────────────── */}
          <section className="fr-section fr-form-section">
            <div className="fr-section__header">
              <h2>Share your feedback</h2>
              <p>Tell us what's working and what could be better.</p>
            </div>

            {submitted ? (
              <div className="fr-success">
                <div className="fr-success__icon">
                  <Check size={28} />
                </div>
                <h3>Thank you for your feedback!</h3>
                <p>
                  Your review has been submitted and will help shape the future
                  of Barter.
                </p>
                <button
                  type="button"
                  className="fr-btn fr-btn--outline"
                  onClick={resetForm}
                >
                  Submit another
                </button>
              </div>
            ) : (
              <form className="fr-form" onSubmit={handleSubmit}>
                {/* Star rating */}
                <div className="fr-field">
                  <label className="fr-label">Overall Rating</label>
                  <StarRating value={rating} onChange={setRating} size={28} />
                  {rating > 0 && (
                    <span className="fr-rating-label">
                      {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                    </span>
                  )}
                </div>

                {/* Category pills */}
                <div className="fr-field">
                  <label className="fr-label">Category</label>
                  <div className="fr-pills">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`fr-pill ${category === cat ? 'fr-pill--active' : ''}`}
                        onClick={() => setCategory(cat === category ? '' : cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <div className="fr-field">
                  <label className="fr-label" htmlFor="feedback-text">
                    Your Feedback
                  </label>
                  <div className="fr-textarea-wrap">
                    <textarea
                      id="feedback-text"
                      className="fr-textarea"
                      rows={6}
                      maxLength={MAX_CHARS}
                      placeholder="Describe your experience in detail. What worked well? What could be improved?"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      required
                    />
                    <span className={`fr-char-count ${feedback.length >= MAX_CHARS * 0.9 ? 'fr-char-count--warn' : ''}`}>
                      {feedback.length} / {MAX_CHARS}
                    </span>
                  </div>
                </div>

                {/* Screenshot upload */}
                <div className="fr-field">
                  <label className="fr-label">Screenshot (optional)</label>
                  {screenshotPreview ? (
                    <div className="fr-screenshot-preview">
                      <img src={screenshotPreview} alt="Screenshot preview" />
                      <button
                        type="button"
                        className="fr-screenshot-remove"
                        onClick={removeScreenshot}
                        aria-label="Remove screenshot"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`fr-upload-area ${isDragging ? 'fr-upload-area--dragging' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                      aria-label="Upload screenshot"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="fr-upload-input"
                        onChange={(e) => handleFile(e.target.files?.[0])}
                      />
                      <div className="fr-upload-icon">
                        <Upload size={18} />
                      </div>
                      <span className="fr-upload-text">
                        Drop image here or <strong>browse</strong>
                      </span>
                      <span className="fr-upload-hint">PNG, JPG, WebP</span>
                    </div>
                  )}
                </div>

                {/* Anonymous toggle */}
                <div className="fr-field fr-field--row">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={anonymous}
                    className={`fr-toggle ${anonymous ? 'fr-toggle--on' : ''}`}
                    onClick={() => setAnonymous((p) => !p)}
                  >
                    <span className="fr-toggle__thumb" />
                  </button>
                  <div>
                    <span className="fr-toggle-label">Submit anonymously</span>
                    <p className="fr-toggle-hint">
                      Your name will not be shown with this review.
                    </p>
                  </div>
                </div>

                {submitError && (
                  <div className="fr-submit-error" role="alert">{submitError}</div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  className="fr-btn fr-btn--primary"
                  disabled={submitting || rating === 0 || !feedback.trim()}
                >
                  {submitting ? (
                    <>
                      <span className="fr-spinner" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <Check size={17} />
                      Submit Feedback
                    </>
                  )}
                </button>
              </form>
            )}
          </section>

          {/* ── RIGHT: Community Reviews ────────────────────────────── */}
          <section className="fr-section fr-reviews-section">
            {/* Rating summary */}
            <div className="fr-rating-summary">
              <div className="fr-avg">
                <span className="fr-avg__number">{avgRating}</span>
                <div className="fr-avg__right">
                  <StarRating value={Math.round(parseFloat(avgRating) || 0)} readonly size={16} />
                  <span className="fr-avg__count">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="fr-dist">
                {ratingDist.map(({ stars, count }) => (
                  <div key={stars} className="fr-dist__row">
                    <span className="fr-dist__label">{stars}</span>
                    <Star size={11} className="fr-dist__star" />
                    <div className="fr-dist__bar">
                      <div
                        className="fr-dist__fill"
                        style={{ width: totalReviews > 0 ? `${(count / totalReviews) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="fr-dist__count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section header */}
            <div className="fr-section__header fr-section__header--mt">
              <h2>Community Reviews</h2>
              <p>What people are saying about Barter.</p>
            </div>

            {/* Review cards */}
            {reviewsLoading ? (
              <div className="fr-reviews-loading">Loading reviews…</div>
            ) : reviews.length === 0 ? (
              <div className="fr-empty">
                <div className="fr-empty__icon">
                  <MessageSquare size={28} />
                </div>
                <h3>No reviews yet</h3>
                <p>Be the first to share your experience with the community.</p>
              </div>
            ) : (
              <div className="fr-review-list">
                {reviews.map((r) => {
                  // Normalise both freshly-submitted (optimistic) and API-loaded rows
                  const displayName = r._displayName
                    || (r.is_anonymous ? 'Anonymous' : (r.full_name || r.username || 'User'))
                  const initials = r._initials || getInitials(displayName)
                  const dateStr = r.created_at
                    ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : ''
                  const adapted = {
                    id: r.id,
                    name: displayName,
                    initials,
                    rating: r.rating,
                    text: r.message,
                    date: dateStr,
                    helpful: r.helpful || 0,
                  }
                  return (
                    <ReviewCard key={r.id} review={adapted} onHelpful={handleHelpful} />
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* ── Recent Improvements ──────────────────────────────────── */}
        <section className="fr-improvements">
          <div className="fr-improvements__header">
            <h2>Recent Improvements Inspired by User Feedback</h2>
            <p>
              Every suggestion counts. Here's what we've shipped recently based
              on what users told us.
            </p>
          </div>
          <div className="fr-timeline">
            {IMPROVEMENTS.map((item, idx) => (
              <div key={item.id} className="fr-timeline__item">
                <div className="fr-timeline__connector">
                  <div className="fr-timeline__dot" />
                  {idx < IMPROVEMENTS.length - 1 && (
                    <div className="fr-timeline__line" />
                  )}
                </div>
                <div className="fr-timeline__card">
                  <div className="fr-timeline__card-top">
                    <h3>{item.title}</h3>
                    <span className="fr-timeline__date">{item.date}</span>
                  </div>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
