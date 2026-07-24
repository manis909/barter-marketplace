import { Link } from 'react-router-dom';
import { Repeat } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(224, 122, 95, 0.12)',
        background: '#FAF6F0',
        padding: '40px 24px 30px',
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
          gap: 20,
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: 'linear-gradient(135deg, #E07A5F 0%, #C8624B 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Repeat size={15} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#1C1917', letterSpacing: '-0.02em' }}>
            Barter<span style={{ color: '#E07A5F' }}>.</span>
          </span>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
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
          margin: '20px auto 0',
          paddingTop: 18,
          borderTop: '1px solid rgba(224, 122, 95, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: '#A8A29A',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>© {new Date().getFullYear()} Barter Marketplace. Peer-to-peer campus exchange.</div>
      </div>
    </footer>
  );
}
