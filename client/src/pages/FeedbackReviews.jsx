import { useMemo, useState } from 'react'
import './FeedbackReviews.css'

const reviews = [
  {
    user: 'Riya',
    date: 'May 2, 2026',
    rating: 5,
    comment: 'Fast trade and friendly communication. Loved the experience!',
  },
  {
    user: 'Jordan',
    date: 'Apr 28, 2026',
    rating: 4,
    comment: 'Item arrived as described and the swap was smooth.',
  },
  {
    user: 'Mina',
    date: 'Apr 16, 2026',
    rating: 5,
    comment: 'Great platform for local exchanges. I will swap again.',
  },
]

export default function FeedbackReviews() {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const averageRating = useMemo(() => {
    const total = reviews.reduce((sum, review) => sum + review.rating, 0)
    return (total / reviews.length).toFixed(1)
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    setComment('')
    setRating(5)
  }

  return (
    <main className="feedback-page">
      <div className="section-header">
        <p className="section-label">Feedback & Reviews</p>
        <h1>See what traders are saying</h1>
        <p className="section-copy">
          Member reviews help the community trust one another and discover great trades.
        </p>
      </div>

      <div className="feedback-grid">
        <section className="feedback-summary">
          <div className="review-score">
            <span className="score-value">{averageRating}</span>
            <span className="score-meta">/ 5.0 average rating</span>
          </div>
          <p className="summary-copy">{reviews.length * 28} ratings · {reviews.length} reviews · Trusted by local makers</p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setShowForm(true)
              setSubmitted(false)
            }}
          >
            Write Feedback
          </button>
        </section>

        <section className="review-list">
          {reviews.map((review) => (
            <article key={review.date + review.user} className="review-card">
              <div className="review-header">
                <strong>{review.user}</strong>
                <span>{review.date}</span>
              </div>
              <div className="review-rating">{Array(review.rating).fill('★').join('')}</div>
              <p>{review.comment}</p>
            </article>
          ))}
        </section>
      </div>

      <section className="review-form-section">
        <div className="review-form-header">
          <div>
            <h2>Share your experience</h2>
            <p className="section-copy">
              Leave a rating and comment to help other traders know what to expect.
            </p>
          </div>
        </div>
        {showForm ? (
          <form className="review-form" onSubmit={handleSubmit}>
            <fieldset>
              <legend>Rating</legend>
              <div className="rating-control">
                {[5, 4, 3, 2, 1].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={value === rating ? 'rating-star selected' : 'rating-star'}
                    onClick={() => setRating(value)}
                  >
                    {value} ★
                  </button>
                ))}
              </div>
            </fieldset>

            <label>
              Comment
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share what worked well and what could improve."
                rows={4}
                required
              />
            </label>
            <button type="submit" className="button-primary">
              Submit review
            </button>
            {submitted && <p className="form-note">Thank you! Your feedback is now pending review.</p>}
          </form>
        ) : (
          <div className="review-form-prompt">
            <p>Ready to add your own feedback? Tap the button above to get started.</p>
          </div>
        )}
      </section>
    </main>
  )
}
