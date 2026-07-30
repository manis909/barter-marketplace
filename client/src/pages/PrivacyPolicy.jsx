import './HelpSupport.css'

const sections = [
  {
    title: 'Introduction',
    body: 'Welcome to Barter. This Privacy Policy explains how we collect, use, and protect your information when you use our platform to discover, list, and exchange items with other users.',
  },
  {
    title: 'Information We Collect',
    body: 'We may collect account details, profile information, listing data, communications, and technical information such as device and browser data to support account creation and platform functionality.',
  },
  {
    title: 'How We Use Your Information',
    body: 'We use your information to create and manage your account, improve the marketplace experience, facilitate trades, provide support, and maintain the security of the platform.',
  },
  {
    title: 'Data Security',
    body: 'We take reasonable measures to safeguard your information, but no digital service can guarantee absolute security. Please protect your password and report any unauthorized activity promptly.',
  },
  {
    title: 'Information Sharing',
    body: 'We may share limited information with service providers that help operate the platform or with authorities when required by law or to protect community safety.',
  },
  {
    title: 'User Content',
    body: 'Any content you post, including item listings and messages, may be visible to other users as needed to support the exchange experience. Please avoid sharing sensitive personal information publicly.',
  },
  {
    title: 'Cookies',
    body: 'We may use cookies and similar technologies to remember your preferences, maintain session state, and analyze how the platform is used.',
  },
  {
    title: 'Contact',
    body: 'If you have questions about this Privacy Policy, contact us at support@barter.com.',
  },
]

export default function PrivacyPolicyPage() {
  return (
    <main className="help-page">
      <div className="section-header">
        <p className="section-label">Legal</p>
        <h1>Privacy Policy</h1>
        <p className="section-copy">
          We are committed to protecting your privacy while keeping Barter a safe and useful exchange platform.
        </p>
      </div>

      <div className="help-grid help-secondary-grid">
        <section className="help-card" style={{ gridColumn: '1 / -1' }}>
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
