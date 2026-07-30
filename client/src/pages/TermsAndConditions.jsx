import './HelpSupport.css'

const sections = [
  {
    title: 'Acceptance of Terms',
    body: 'By using Barter, you agree to follow these Terms & Conditions and any additional rules posted on the platform.',
  },
  {
    title: 'User Responsibilities',
    body: 'You are responsible for providing accurate information, maintaining a secure account, and communicating clearly with other users about item condition and trade expectations.',
  },
  {
    title: 'Prohibited Items',
    body: 'Do not list or trade prohibited, unsafe, illegal, counterfeit, or restricted items. Barter may remove listings that violate community standards or applicable law.',
  },
  {
    title: 'Trades and User Responsibility',
    body: 'All exchanges are arranged directly between users. Barter is not responsible for the outcome of individual trades, negotiations, or disputes beyond the platform services we provide.',
  },
  {
    title: 'User Conduct',
    body: 'Please keep interactions respectful and lawful. Harassment, fraud, spam, and deceptive practices are not permitted.',
  },
  {
    title: 'Account Suspension',
    body: 'We may suspend or remove accounts that repeatedly violate these terms, misuse the platform, or create risk for other users.',
  },
  {
    title: 'Changes to Terms',
    body: 'We may update these terms from time to time. Continued use of the platform after changes are posted means you accept the revised terms.',
  },
  {
    title: 'Contact',
    body: 'If you have questions about these terms, contact us at support@barter.com.',
  },
]

export default function TermsAndConditionsPage() {
  return (
    <main className="help-page">
      <div className="section-header">
        <p className="section-label">Legal</p>
        <h1>Terms & Conditions</h1>
        <p className="section-copy">
          These terms outline how users can responsibly use Barter and complete exchanges in a safe, fair way.
        </p>
      </div>

      <div className="help-grid help-secondary-grid">
        <section className="help-card" style={{ gridColumn: '1 / -1' }}>
          <p className="support-note" style={{ marginTop: 0 }}>
            <strong>Disclaimer:</strong> Barter is a platform that connects users for exchanging items. We do not verify, inspect, or guarantee the quality, authenticity, safety, or condition of items listed by users. Users are responsible for communicating, verifying item details, and completing trades at their own discretion.
          </p>

          {sections.map((section) => (
            <div key={section.title} className="faq-item" style={{ marginBottom: 16 }}>
              <strong>{section.title}</strong>
              <p>{section.body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
