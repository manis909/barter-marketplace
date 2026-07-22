import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-widgets">
        <div className="footer-col">
          <p className="footer-logo">Barter</p>
          <p className="footer-copy">Trade smarter. Exchange sustainably.</p>
        </div>

        <div className="footer-col">
          <p className="footer-heading">Quick Links</p>
          <nav className="footer-nav">
            <Link to="/explore">Home</Link>
            <Link to="/explore">Explore</Link>
            <Link to="/explore">Categories</Link>
            <Link to="/my-listings">My Listings</Link>
          </nav>
        </div>

        <div className="footer-col">
          <p className="footer-heading">Support</p>
          <nav className="footer-nav">
            <Link to="/help">Help Center</Link>
            <a href="mailto:support@barter.com">Contact Us</a>
            <Link to="/help">FAQs</Link>
            <Link to="/help">Report an Issue</Link>
          </nav>
        </div>

        <div className="footer-col">
          <p className="footer-heading">Legal</p>
          <nav className="footer-nav">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms & Conditions</a>
            <Link to="/help">Community Guidelines</Link>
          </nav>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 Barter. All Rights Reserved.</p>
        <div className="footer-socials">
          <a href="#" aria-label="Instagram">IG</a>
          <a href="#" aria-label="Facebook">FB</a>
          <a href="#" aria-label="LinkedIn">LI</a>
          <a href="#" aria-label="Twitter">TW</a>
        </div>
      </div>
    </footer>
  )
}
