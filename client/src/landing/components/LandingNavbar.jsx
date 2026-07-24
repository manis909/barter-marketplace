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
        background: 'rgba(250, 246, 240, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(224, 122, 95, 0.12)',
      }}
    >
      <div
        style={{
          maxWidth: 1220,
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
            color: '#1C1917',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: 'linear-gradient(135deg, #E07A5F 0%, #C8624B 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(224, 122, 95, 0.3)',
            }}
          >
            <Repeat size={18} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.025em' }}>
            Barter<span style={{ color: '#E07A5F' }}>.</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="lp-nav-links">
          <a
            href="#why-barter"
            style={{
              color: '#57534E',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#1C1917')}
            onMouseLeave={e => (e.currentTarget.style.color = '#57534E')}
          >
            Why Barter
          </a>
          <a
            href="#trade-categories"
            style={{
              color: '#57534E',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#1C1917')}
            onMouseLeave={e => (e.currentTarget.style.color = '#57534E')}
          >
            What Can You Trade
          </a>
          <a
            href="#how-it-works"
            style={{
              color: '#57534E',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#1C1917')}
            onMouseLeave={e => (e.currentTarget.style.color = '#57534E')}
          >
            How It Works
          </a>
          <a
            href="#marketplace-preview"
            style={{
              color: '#57534E',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#1C1917')}
            onMouseLeave={e => (e.currentTarget.style.color = '#57534E')}
          >
            Listings
          </a>
        </nav>

        {/* Auth Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/login"
            style={{
              color: '#1C1917',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
              padding: '8px 18px',
              borderRadius: 30,
              transition: 'background 0.2s',
            }}
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="lp-btn-primary"
            style={{ padding: '9px 22px', fontSize: 14 }}
          >
            <span>Start Trading</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </header>
  );
}
