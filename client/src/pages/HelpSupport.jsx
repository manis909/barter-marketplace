import { useState, useMemo } from 'react'
import {
  Search,
  X,
  User,
  ArrowLeftRight,
  Package,
  MessageSquare,
  Bell,
  ShieldCheck,
  Wrench,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  Mail,
  LifeBuoy,
  Send,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Lock,
  FileText,
  Heart,
  Camera,
  Handshake,
  Sparkles,
  HelpCircle,
} from 'lucide-react'
import './HelpSupport.css'

const CATEGORIES = [
  {
    id: 'account',
    title: 'Account & Profile',
    desc: 'Manage your settings, update credentials, and customize your profile.',
    icon: User,
  },
  {
    id: 'trading',
    title: 'Trading & Bartering',
    desc: 'Learn how to propose swaps, negotiate items, and complete trades.',
    icon: ArrowLeftRight,
  },
  {
    id: 'listings',
    title: 'Listing Items',
    desc: 'Tips for uploading photos, setting swap preferences, and listing items.',
    icon: Package,
  },
  {
    id: 'messaging',
    title: 'Messaging',
    desc: 'Communicate safely with other community members before exchanging.',
    icon: MessageSquare,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    desc: 'Configure alert preferences for trade offers, messages, and updates.',
    icon: Bell,
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    desc: 'Protect your account, personal details, and data privacy.',
    icon: ShieldCheck,
  },
  {
    id: 'technical',
    title: 'Technical Issues',
    desc: 'Troubleshoot app crashes, loading glitches, or display errors.',
    icon: Wrench,
  },
  {
    id: 'reporting',
    title: 'Report a User',
    desc: 'Flag suspicious activity, inappropriate behavior, or fake listings.',
    icon: AlertTriangle,
  },
  {
    id: 'guidelines',
    title: 'Community Guidelines',
    desc: 'Review community standards, barter rules, and fair swap policies.',
    icon: BookOpen,
  },
]

const FAQS = [
  {
    id: 1,
    category: 'listings',
    question: 'How do I list an item for trade?',
    answer:
      'Go to the "Add Item" or "My Listings" section, upload high-quality photos, write an honest description of item condition, select your swap preferences, and publish it to the community marketplace.',
  },
  {
    id: 2,
    category: 'trading',
    question: 'How do I request a trade?',
    answer:
      'Browse items on the Explore page, tap on an item you like, select an item from your own listings that you want to offer in exchange, and click "Propose Trade" to send your offer to the owner.',
  },
  {
    id: 3,
    category: 'account',
    question: 'How do I edit my profile?',
    answer:
      'Navigate to Profile from the navigation menu or profile avatar drawer. Tap "Edit Profile" to update your display name, bio, profile photo, location, and contact preferences.',
  },
  {
    id: 4,
    category: 'trading',
    question: 'How do I cancel a trade?',
    answer:
      'Open "My Trades", find the trade request you wish to cancel, and click "Cancel Trade". Once a trade is completed by both parties, it cannot be undone.',
  },
  {
    id: 5,
    category: 'reporting',
    question: 'How do I report inappropriate content or suspicious users?',
    answer:
      'Click the "Report a Problem" button in the Contact Support section or use the flag icon on any listing or user profile page. Our safety team reviews all reports within 24 hours.',
  },
  {
    id: 6,
    category: 'account',
    question: "Why can't I log in to my account?",
    answer:
      'Ensure your email address and password are typed correctly. If you forgot your password, use the "Forgot Password" link on the login page or contact support if your account is locked.',
  },
  {
    id: 7,
    category: 'security',
    question: 'How do I change my password?',
    answer:
      'Go to Profile > Account Settings > Security. Enter your current password followed by your new password, then click "Save Password".',
  },
  {
    id: 8,
    category: 'notifications',
    question: 'How do notifications work?',
    answer:
      'Notifications alert you instantly whenever someone proposes a trade, accepts your offer, or sends you a chat message. You can view notifications by clicking the Bell icon in the top navbar.',
  },
]

const SAFETY_TIPS = [
  {
    title: 'Meet in safe public places',
    desc: 'Always arrange local exchanges in well-lit, busy public places such as cafes or shopping hubs.',
    icon: MapPin,
  },
  {
    title: 'Verify item condition before trading',
    desc: 'Inspect items thoroughly in person before confirming the swap completion.',
    icon: CheckCircle2,
  },
  {
    title: 'Never share sensitive information',
    desc: 'Keep financial details, passwords, and private home addresses off public chat channels.',
    icon: Lock,
  },
  {
    title: 'Report suspicious users immediately',
    desc: 'If anyone asks for upfront wire payments or behaves aggressively, flag them to support right away.',
    icon: AlertTriangle,
  },
  {
    title: 'Follow community safety policies',
    desc: 'Review our safety guidelines periodically to stay informed about safe bartering practices.',
    icon: FileText,
  },
]

const COMMUNITY_RULES = [
  {
    title: 'Be Respectful',
    desc: 'Treat every community member with kindness, courtesy, and fairness.',
    icon: Heart,
  },
  {
    title: 'Upload Genuine Photos',
    desc: 'Only post real, recent photos of items in your personal possession.',
    icon: Camera,
  },
  {
    title: 'Describe Items Honestly',
    desc: 'Disclose any wear, flaws, or imperfections clearly in item descriptions.',
    icon: CheckCircle2,
  },
  {
    title: 'Avoid Prohibited Items',
    desc: 'Illegal items, dangerous goods, weapons, and counterfeit items are strictly banned.',
    icon: ShieldCheck,
  },
  {
    title: 'Complete Trades Responsibly',
    desc: 'Honor your commitments once both parties agree on a barter exchange.',
    icon: Handshake,
  },
]

export default function HelpSupport() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [openFaqId, setOpenFaqId] = useState(null)
  const [ticketRequested, setTicketRequested] = useState(false)
  const [problemReported, setProblemReported] = useState(false)

  // Filter FAQs based on search and category
  const filteredFaqs = useMemo(() => {
    return FAQS.filter((faq) => {
      const matchesCategory =
        selectedCategory === 'all' || faq.category === selectedCategory
      const query = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !query ||
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [searchQuery, selectedCategory])

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return CATEGORIES
    return CATEGORIES.filter(
      (cat) =>
        cat.title.toLowerCase().includes(query) ||
        cat.desc.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const toggleFaq = (id) => {
    setOpenFaqId(openFaqId === id ? null : id)
  }

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
  }

  return (
    <div className="help-page-wrapper">
      {/* Floating Glassmorphic Ambient Orbs */}
      <div className="glass-ambient-orb orb-1" />
      <div className="glass-ambient-orb orb-2" />
      <div className="glass-ambient-orb orb-3" />

      <div className="help-container">
        {/* Hero & Search Header */}
        <header className="help-hero">
          <div className="header-badge">
            <Sparkles size={15} className="badge-icon" />
            <span>Help Center</span>
          </div>
          <h1 className="hero-title">How can we help you?</h1>
          <p className="hero-subtitle">
            We're here to help you have the best trading experience possible.
          </p>

          {/* Large Glassmorphism Search Bar */}
          <div className="glass-search-box">
            <Search size={22} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search for help articles, FAQs, safety tips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </header>

        {/* Quick Help Categories Grid */}
        <section className="help-section">
          <div className="section-title-row">
            <HelpCircle size={22} className="section-icon" />
            <h2>Quick Help Categories</h2>
          </div>

          <div className="categories-grid">
            {filteredCategories.map((cat) => {
              const IconComp = cat.icon
              const isSelected = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`glass-card category-card ${
                    isSelected ? 'selected' : ''
                  }`}
                  onClick={() =>
                    setSelectedCategory(isSelected ? 'all' : cat.id)
                  }
                >
                  <div className="category-icon-wrapper">
                    <IconComp size={24} className="category-icon" />
                  </div>
                  <h3 className="category-title">{cat.title}</h3>
                  <p className="category-desc">{cat.desc}</p>
                </button>
              )
            })}
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section className="help-section">
          <div className="section-title-row">
            <BookOpen size={22} className="section-icon" />
            <h2>Frequently Asked Questions</h2>
            {selectedCategory !== 'all' && (
              <button
                type="button"
                className="filter-reset-pill"
                onClick={() => setSelectedCategory('all')}
              >
                Category Filter Active <X size={14} />
              </button>
            )}
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="glass-card empty-search-card">
              <AlertCircle size={48} className="empty-icon" />
              <h3>No help articles found</h3>
              <p>We couldn't find any results matching "{searchQuery}". Try searching with different keywords.</p>
              <button
                type="button"
                className="btn-lime"
                onClick={resetFilters}
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div className="faq-accordion-list">
              {filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id
                return (
                  <div
                    key={faq.id}
                    className={`glass-card faq-accordion-item ${
                      isOpen ? 'open' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="faq-question-btn"
                      onClick={() => toggleFaq(faq.id)}
                      aria-expanded={isOpen}
                    >
                      <span className="faq-question-text">{faq.question}</span>
                      <ChevronDown
                        size={20}
                        className={`faq-chevron ${isOpen ? 'rotated' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="faq-answer-content">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Contact Support Section */}
        <section className="help-section">
          <div className="glass-card contact-support-card">
            <div className="contact-header">
              <div className="contact-icon-badge">
                <LifeBuoy size={28} className="contact-badge-icon" />
              </div>
              <div>
                <h2 className="contact-title">Still Need Help?</h2>
                <p className="contact-subtitle">
                  Can't find what you're looking for? Reach out directly to our support team.
                </p>
              </div>
            </div>

            <div className="contact-options-grid">
              <div className="contact-option-item">
                <Mail size={22} className="option-icon" />
                <div className="option-info">
                  <h4>Email Support</h4>
                  <p>Get answers within 24 hours</p>
                </div>
                <a href="mailto:support@barter.com" className="btn-secondary-glass">
                  Email Us
                </a>
              </div>

              <div className="contact-option-item">
                <LifeBuoy size={22} className="option-icon" />
                <div className="option-info">
                  <h4>Support Ticket</h4>
                  <p>Open a tracked support case</p>
                </div>
                <button
                  type="button"
                  className="btn-lime"
                  onClick={() => {
                    setTicketRequested(true)
                    setProblemReported(false)
                  }}
                >
                  Create Ticket
                </button>
              </div>

              <div className="contact-option-item">
                <AlertCircle size={22} className="option-icon" />
                <div className="option-info">
                  <h4>Report a Problem</h4>
                  <p>Report safety issues or bugs</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary-glass"
                  onClick={() => {
                    setProblemReported(true)
                    setTicketRequested(false)
                  }}
                >
                  Report Problem
                </button>
              </div>

              <div className="contact-option-item">
                <Send size={22} className="option-icon" />
                <div className="option-info">
                  <h4>Contact Team</h4>
                  <p>Feedback & general inquiries</p>
                </div>
                <a href="mailto:feedback@barter.com" className="btn-secondary-glass">
                  Contact Team
                </a>
              </div>
            </div>

            {ticketRequested && (
              <div className="support-status-banner success">
                <CheckCircle2 size={20} />
                <span>Support ticket created. Our team will follow up with you by email shortly.</span>
              </div>
            )}

            {problemReported && (
              <div className="support-status-banner warning">
                <AlertTriangle size={20} />
                <span>Thank you. Your problem report has been logged and escalated to safety support.</span>
              </div>
            )}
          </div>
        </section>

        {/* Safety Tips Section */}
        <section className="help-section">
          <div className="section-title-row">
            <ShieldCheck size={22} className="section-icon" />
            <h2>Safety Tips</h2>
          </div>

          <div className="safety-grid">
            {SAFETY_TIPS.map((tip) => {
              const IconComp = tip.icon
              return (
                <div key={tip.title} className="glass-card safety-card">
                  <div className="safety-icon-wrapper">
                    <IconComp size={22} className="safety-icon" />
                  </div>
                  <h3>{tip.title}</h3>
                  <p>{tip.desc}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Community Guidelines Section */}
        <section className="help-section">
          <div className="section-title-row">
            <Heart size={22} className="section-icon" />
            <h2>Community Guidelines</h2>
          </div>

          <div className="rules-grid">
            {COMMUNITY_RULES.map((rule) => {
              const IconComp = rule.icon
              return (
                <div key={rule.title} className="glass-card rule-card">
                  <div className="rule-header">
                    <IconComp size={20} className="rule-icon" />
                    <h3>{rule.title}</h3>
                  </div>
                  <p>{rule.desc}</p>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
