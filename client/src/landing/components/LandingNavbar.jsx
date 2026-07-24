import { Link } from 'react-router-dom';
import { ArrowRight, Repeat } from 'lucide-react';

export default function LandingNavbar() {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '16px 24px',
        background: 'rgba(9, 13, 22, 0.75)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/landing"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            color: '#FFFFFF',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #A855F7 0%, #6366F1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)',
            }}
          >
            <Repeat size={20} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Barter<span style={{ color: '#A855F7' }}>.</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="lp-nav-links">
          <a
            href="#why-barter"
            style={{
              color: '#9CA3AF',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F9FAFB')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
          >
            Why Barter
          </a>
          <a
            href="#how-it-works"
            style={{
              color: '#9CA3AF',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F9FAFB')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
          >
            How It Works
          </a>
          <a
            href="#marketplace"
            style={{
              color: '#9CA3AF',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F9FAFB')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
          >
            Explore Items
          </a>
        </nav>

        {/* Auth Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link
            to="/login"
            style={{
              color: '#F9FAFB',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
              padding: '8px 18px',
              borderRadius: 30,
              transition: 'background 0.2s',
            }}
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="lp-btn-primary"
            style={{ padding: '9px 22px', fontSize: 14 }}
          >
            <span>Get Started</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </header>
  );
}
