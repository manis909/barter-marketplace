import { useState } from 'react'
import './HelpSupport.css'

const faqs = [
  {
    question: 'How do I list an item for trade?',
    answer: 'Go to My Listings, add an item with clear photos and a fair description, then publish it to the community.',
  },
  {
    question: 'How can I contact a trader before swapping?',
    answer: 'Use the chat option on the item detail page to discuss the exchange. Keep messages polite and focused on the trade.',
  },
  {
    question: 'What should I do if an item isn’t as described?',
    answer: 'Report the issue immediately from Help & Support so we can review the case and protect both traders.',
  },
]

const communityGuidelines = [
  'Be honest about item condition and your trade expectations.',
  'Keep conversations respectful and transparent.',
  'Meet in public spaces when arranging local exchanges.',
]

const safetyTips = [
  'Verify the item before completing the trade.',
  'Bring a friend or meet in a safe, well-lit area.',
  'Never share payment details outside the app.',
]

export default function HelpSupport() {
  const [ticketRequested, setTicketRequested] = useState(false)
  const [problemReported, setProblemReported] = useState(false)

  return (
    <main className="help-page">
      <div className="section-header">
        <p className="section-label">Help & Support</p>
        <h1>Need assistance?</h1>
        <p className="section-copy">
          We’re here to help with trades, safety, and the community marketplace.
        </p>
      </div>

      <div className="help-grid">
        <section className="help-card">
          <h2>Contact support</h2>
          <p>Reach out by email and we’ll answer within 24 hours.</p>
          <a href="mailto:support@barter.com" className="button-primary">
            Email support
          </a>
        </section>

        <section className="help-card">
          <h2>Raise a support ticket</h2>
          <p>Report a listing concern, payment question, or community issue securely.</p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setTicketRequested(true)
              setProblemReported(false)
            }}
          >
            Create ticket
          </button>
          {ticketRequested && (
            <p className="support-note">Support ticket created. Our team will follow up by email.</p>
          )}
        </section>

        <section className="help-card">
          <h2>Report a problem</h2>
          <p>If you encounter unsafe behavior or have a critical issue, let us know right away.</p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setProblemReported(true)
              setTicketRequested(false)
            }}
          >
            Report a problem
          </button>
          {problemReported && (
            <p className="support-note">Thank you. A problem report has been logged and sent to support.</p>
          )}
        </section>

        <section className="help-card help-faqs">
          <h2>FAQs</h2>
          <div className="faq-list">
            {faqs.map((faq) => (
              <div key={faq.question} className="faq-item">
                <strong>{faq.question}</strong>
                <p>{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="help-grid help-secondary-grid">
        <section className="help-card">
          <h2>Community guidelines</h2>
          <ul className="support-list">
            {communityGuidelines.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="help-card">
          <h2>Safety tips</h2>
          <ul className="support-list">
            {safetyTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
