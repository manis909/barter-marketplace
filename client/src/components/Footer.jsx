import { Link } from 'react-router-dom'
import { FaInstagram, FaFacebookF, FaLinkedinIn, FaXTwitter } from 'react-icons/fa6'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-widgets">

        {/* Brand column — logo matches Navbar exactly */}
        <div className="footer-col">
          <Link to="/explore" className="footer-brand">
            <div className="footer-mark">⇄</div>
            <span className="footer-logo">Barter</span>
          </Link>
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
            <a href="#">Terms &amp; Conditions</a>
            <Link to="/help">Community Guidelines</Link>
          </nav>
        </div>

      </div>

      <div className="footer-bottom">
        <p>© 2026 Barter. All Rights Reserved.</p>
        <div className="footer-socials">
          <a href="#" aria-label="Instagram"><FaInstagram size={16} /></a>
          <a href="#" aria-label="Facebook"><FaFacebookF size={16} /></a>
          <a href="#" aria-label="LinkedIn"><FaLinkedinIn size={16} /></a>
          <a href="#" aria-label="X"><FaXTwitter size={16} /></a>
        </div>
      </div>
    </footer>
  )
}