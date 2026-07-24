import { Link } from 'react-router-dom';
import { Repeat } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        background: '#060911',
        padding: '60px 24px 40px',
        color: '#9CA3AF',
        fontSize: 14,
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 24,
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #A855F7 0%, #6366F1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Repeat size={16} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            Barter<span style={{ color: '#A855F7' }}>.</span>
          </span>
        </div>

        {/* Operational Status Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 20,
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#10B981',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 8px #10B981',
            }}
          />
          <span>All Systems Operational</span>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/explore" style={{ color: '#9CA3AF', textDecoration: 'none' }}>
            Explore
          </Link>
          <Link to="/login" style={{ color: '#9CA3AF', textDecoration: 'none' }}>
            Log In
          </Link>
          <Link to="/signup" style={{ color: '#9CA3AF', textDecoration: 'none' }}>
            Sign Up
          </Link>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1240,
          margin: '30px auto 0',
          paddingTop: 24,
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
          color: '#6B7280',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>© {new Date().getFullYear()} Barter Marketplace Inc. All rights reserved.</div>
        <div>Built for Next-Gen Campus Trading.</div>
      </div>
    </footer>
  );
}
