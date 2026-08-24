import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FaInstagram, FaXTwitter } from 'react-icons/fa6'
import { Compass, Package, LifeBuoy, MessageCircleMore, ShieldCheck, FileText, ChevronDown } from 'lucide-react'
import './Footer.css'

const barterQuickLinks = [
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/my-listings', label: 'My Listings', icon: Package },
]

const skilterQuickLinks = [
  { to: '/skilter/explore', label: 'Explore', icon: Compass },
  { to: '/skilter/skills', label: 'My Skills', icon: Package },
]

const supportLinks = [
  { to: '/help', label: 'Help', icon: LifeBuoy },
  { to: '/feedback', label: 'Feedback', icon: MessageCircleMore },
]

const legalLinks = [
  { to: '/privacy', label: 'Privacy Policy', icon: ShieldCheck },
  { to: '/terms', label: 'Terms & Conditions', icon: FileText },
]

export default function Footer() {
  const location = useLocation()
  const navigate = useNavigate()

  // Determine if we're in the Skilter section
  const isSkilterSection = location.pathname.startsWith('/skilter') || location.pathname.startsWith('/skills')
  
  // Choose the appropriate navigation links based on current section
  const quickLinks = isSkilterSection ? skilterQuickLinks : barterQuickLinks
  const explorePath = isSkilterSection ? '/skilter/explore' : '/explore'
  const [openSections, setOpenSections] = useState({})

  function toggleSection(section) {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }))
  }

  function jumpToExploreTop() {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }

  function handleExploreClick(e) {
    e.preventDefault()

    // Check if we're already on the appropriate explore page
    if (location.pathname === explorePath || 
        (isSkilterSection && location.pathname === '/skilter')) {
      jumpToExploreTop()
      return
    }

    navigate(explorePath)
    window.setTimeout(() => {
      jumpToExploreTop()
    }, 220)
  }

  return (
    <footer className="site-footer">
      <div className="footer-mobile-header">
        <Link to={explorePath} className="footer-brand">
          <div className="footer-mark">⇄</div>
          <div className="footer-brand-text">
            <span className="footer-logo">{isSkilterSection ? 'Skilter' : 'Barter'}</span>
            <p className="footer-copy">
              {isSkilterSection ? 'Learn smarter. Share skills.' : 'Trade smarter. Exchange sustainably.'}
            </p>
          </div>
        </Link>

        <div className="footer-socials footer-socials-inline">
          <a href="#" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
            <FaInstagram size={15} />
          </a>
          <a href="#" aria-label="X" target="_blank" rel="noopener noreferrer">
            <FaXTwitter size={15} />
          </a>
        </div>
      </div>

      <div className="footer-widgets">
        <div className="footer-col footer-brand-col">
          <Link to={explorePath} className="footer-brand footer-brand-desktop">
            <div className="footer-mark">⇄</div>
            <span className="footer-logo">{isSkilterSection ? 'Skilter' : 'Barter'}</span>
          </Link>
          <p className="footer-copy footer-copy-desktop">
            {isSkilterSection ? 'Learn smarter. Share skills.' : 'Trade smarter. Exchange sustainably.'}
          </p>
        </div>

        <div className={`footer-col footer-section ${openSections.navigation ? 'is-open' : ''}`}>
          <button type="button" className="footer-heading" aria-expanded={Boolean(openSections.navigation)} onClick={() => toggleSection('navigation')}>
            <span>Navigation</span><ChevronDown size={17} aria-hidden="true" />
          </button>
          <nav className="footer-nav footer-nav-grid">
            {quickLinks.map(({ to, label, icon: Icon }) => {
              if (label === 'Explore') {
                return (
                  <button
                    key={label}
                    type="button"
                    className="footer-link-item"
                    onClick={handleExploreClick}
                  >
                    <Icon size={15} />
                    <span>{label}</span>
                  </button>
                )
              }

              return (
                <Link key={label} to={to} className="footer-link-item">
                  <Icon size={15} />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className={`footer-col footer-section ${openSections.support ? 'is-open' : ''}`}>
          <button type="button" className="footer-heading" aria-expanded={Boolean(openSections.support)} onClick={() => toggleSection('support')}>
            <span>Support</span><ChevronDown size={17} aria-hidden="true" />
          </button>
          <nav className="footer-nav footer-nav-inline">
            {supportLinks.map(({ to, label, icon: Icon }) => (
              <Link key={label} to={to} className="footer-link-item footer-link-inline">
                <Icon size={14} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className={`footer-col footer-section ${openSections.legal ? 'is-open' : ''}`}>
          <button type="button" className="footer-heading" aria-expanded={Boolean(openSections.legal)} onClick={() => toggleSection('legal')}>
            <span>Legal</span><ChevronDown size={17} aria-hidden="true" />
          </button>
          <nav className="footer-nav footer-nav-inline">
            {legalLinks.map(({ to, label, icon: Icon }) => (
              <Link key={label} to={to} className="footer-link-item footer-link-inline">
                <Icon size={14} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 {isSkilterSection ? 'Skilter' : 'Barter'}. All Rights Reserved.</p>
        <div className="footer-socials footer-socials-bottom">
          <a href="#" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
            <FaInstagram size={15} />
          </a>
          <a href="#" aria-label="X" target="_blank" rel="noopener noreferrer">
            <FaXTwitter size={15} />
          </a>
        </div>
      </div>
    </footer>
  )
}
