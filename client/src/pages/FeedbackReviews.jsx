import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Star,
  Upload,
  X,
  Check,
  ChevronRight,
  ThumbsUp,
  MessageSquare,
} from 'lucide-react'
import './FeedbackReviews.css'

// ── Static data ────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Bug Report',
  'Feature Request',
  'User Experience',
  'Performance',
  'General Feedback',
]

const STATIC_REVIEWS = [
  {
    id: 1,
    name: 'Rahul M.',
    initials: 'RM',
    rating: 5,
    text: 'Great platform for trading books and gadgets. The trade flow is smooth and the UI looks really clean.',
    date: 'Jul 18, 2026',
    helpful: 12,
  },
  {
    id: 2,
    name: 'Priya S.',
    initials: 'PS',
    rating: 4,
    text: 'Easy to use and well-designed. Would love to see more category filters in the Explore page.',
    date: 'Jul 10, 2026',
    helpful: 8,
  },
  {
    id: 3,
    name: 'Arjun K.',
    initials: 'AK',
    rating: 5,
    text: 'Looking forward to more features in future updates. The verification system gives me confidence in other traders.',
    date: 'Jun 29, 2026',
    helpful: 15,
  },
  {
    id: 4,
    name: 'Meera D.',
    initials: 'MD',
    rating: 4,
    text: 'The chat feature works great. Wish there was a way to share multiple images during a trade negotiation.',
    date: 'Jun 14, 2026',
    helpful: 6,
  },
]

const RATING_DIST = [
  { stars: 5, count: 68 },
  { stars: 4, count: 22 },
  { stars: 3, count: 7 },
  { stars: 2, count: 2 },
  { stars: 1, count: 1 },
]
const TOTAL_REVIEWS = RATING_DIST.reduce((s, r) => s + r.count, 0)
const AVG_RATING = (
  RATING_DIST.reduce((s, r) => s + r.stars * r.count, 0) / TOTAL_REVIEWS
).toFixed(1)

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

  // form state
  const [rating, setRating] = useState(0)
  const [category, setCategory] = useState('')
  const [feedback, setFeedback] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [screenshot, setScreenshot] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // reviews state
  const [reviews, setReviews] = useState(STATIC_REVIEWS)
  const [helpfulVoted, setHelpfulVoted] = useState(new Set())

  const fileInputRef = useRef(null)
  const MAX_CHARS = 1000

  // ── handlers ───────────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setScreenshot(file)
    setScreenshotPreview(URL.createObjectURL(file))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const removeScreenshot = () => {
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview)
    setScreenshot(null)
    setScreenshotPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0 || !feedback.trim()) return
    setSubmitting(true)
    // Simulate async submit
    await new Promise((r) => setTimeout(r, 900))
    setSubmitting(false)
    setSubmitted(true)
    // Add the new review to the local list (optimistic)
    const newReview = {
      id: Date.now(),
      name: anonymous ? 'Anonymous' : 'You',
      initials: anonymous ? 'AN' : 'YO',
      rating,
      text: feedback.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      helpful: 0,
    }
    setReviews((prev) => [newReview, ...prev])
  }

  const handleHelpful = (id) => {
    if (helpfulVoted.has(id)) return
    setHelpfulVoted((prev) => new Set([...prev, id]))
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, helpful: r.helpful + 1 } : r))
    )
  }

  const resetForm = () => {
    setRating(0)
    setCategory('')
    setFeedback('')
    setAnonymous(false)
    removeScreenshot()
    setSubmitted(false)
  }

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
                <span className="fr-avg__number">{AVG_RATING}</span>
                <div className="fr-avg__right">
                  <StarRating value={Math.round(parseFloat(AVG_RATING))} readonly size={16} />
                  <span className="fr-avg__count">{TOTAL_REVIEWS} reviews</span>
                </div>
              </div>

              <div className="fr-dist">
                {RATING_DIST.map(({ stars, count }) => (
                  <div key={stars} className="fr-dist__row">
                    <span className="fr-dist__label">{stars}</span>
                    <Star size={11} className="fr-dist__star" />
                    <div className="fr-dist__bar">
                      <div
                        className="fr-dist__fill"
                        style={{ width: `${(count / TOTAL_REVIEWS) * 100}%` }}
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
            {reviews.length === 0 ? (
              <div className="fr-empty">
                <div className="fr-empty__icon">
                  <MessageSquare size={28} />
                </div>
                <h3>No reviews yet</h3>
                <p>Be the first to share your experience with the community.</p>
              </div>
            ) : (
              <div className="fr-review-list">
                {reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} onHelpful={handleHelpful} />
                ))}
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
