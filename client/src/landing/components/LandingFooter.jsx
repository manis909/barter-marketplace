import { Link } from 'react-router-dom';
import { Repeat, Leaf } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(224, 122, 95, 0.12)',
        background: '#FAF6F0',
        padding: '60px 24px 40px',
        color: '#57534E',
        fontSize: 14,
      }}
    >
      <div
        style={{
          maxWidth: 1220,
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
              background: 'linear-gradient(135deg, #E07A5F 0%, #C8624B 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Repeat size={16} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1C1917', letterSpacing: '-0.025em' }}>
            Barter<span style={{ color: '#E07A5F' }}>.</span>
          </span>
        </div>

        {/* Operational Status & Sustainability Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 20,
              background: 'rgba(224, 122, 95, 0.08)',
              border: '1px solid rgba(224, 122, 95, 0.2)',
              color: '#E07A5F',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Leaf size={12} color="#E07A5F" />
            <span>Sustainable Campus Trading</span>
          </div>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/explore" style={{ color: '#57534E', textDecoration: 'none' }}>
            Explore
          </Link>
          <Link to="/login" style={{ color: '#57534E', textDecoration: 'none' }}>
            Sign In
          </Link>
          <Link to="/signup" style={{ color: '#57534E', textDecoration: 'none' }}>
            Sign Up
          </Link>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1220,
          margin: '30px auto 0',
          paddingTop: 24,
          borderTop: '1px solid rgba(224, 122, 95, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
          color: '#A8A29A',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>© {new Date().getFullYear()} Barter Marketplace. Built for zero-cash campus trading.</div>
        <div>Crafted with care for student communities.</div>
      </div>
    </footer>
  );
}
