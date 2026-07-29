import "./FeedbackReviews.css";

export default function FeedbackReviews() {
  return (
    <div className="feedback-page">
      <div className="feedback-card">
        <h1>⭐ Feedback & Reviews</h1>

        <p className="subtitle">
          We value your feedback! Help us improve Barter by sharing your
          experience.
        </p>

        <textarea
          placeholder="Write your feedback here..."
          rows="6"
        ></textarea>

        <button className="submit-btn">
          Submit Feedback
        </button>

        <hr />

        <h2>Community Reviews</h2>

        <div className="review-card">
          <h4>⭐⭐⭐⭐⭐ Rahul</h4>
          <p>Great platform for trading books and gadgets.</p>
        </div>

        <div className="review-card">
          <h4>⭐⭐⭐⭐ Priya</h4>
          <p>Easy to use and the UI looks clean.</p>
        </div>

        <div className="review-card">
          <h4>⭐⭐⭐⭐⭐ Arjun</h4>
          <p>Looking forward to more features in future updates.</p>
        </div>
      </div>
    </div>
  );
}