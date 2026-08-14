import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSkillWishlist, removeSkillWishlist, addSkillWishlist } from '../services/skillWishlistService';
import { createSkillBooking } from '../services/skillBookingService';
import { getErrorMessage } from '../utils/helpers';
import { useAuth } from '../features/auth/AuthContext';

// ── Brand tokens (matches login page: dark green + lime accent) ─────────────
const BRAND_GREEN = '#1F4D3D';      // deep forest green
const BRAND_GREEN_DARK = '#163A2E'; // for hover states
const BRAND_LIME = '#C6F24E';       // lime-green
const BRAND_LIME_TEXT = '#163A2E';  // dark text that sits on lime buttons

// Shimmer animation
const SHIMMER_CSS = `
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
.skeleton {
  background: linear-gradient(
    90deg,
    var(--border) 25%,
    var(--code-bg) 50%,
    var(--border) 75%
  );
  background-size: 600px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 8px;
}
`;

function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '14px 16px',
        background: '#fff',
        display: 'flex',
        gap: 14,
        alignItems: 'center',
      }}
    >
      <div className="skeleton" style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 8 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 15, width: '60%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: '40%' }} />
      </div>
      <div className="skeleton" style={{ height: 32, width: 72, borderRadius: 7 }} />
    </div>
  );
}

export default function SkilterWishlist() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [wishlist, setWishlist]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [removedToast, setRemovedToast]       = useState(null); // { skill }

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSkillWishlist();
      setWishlist(data.wishlist ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { setLoading(false); return; }
    fetchWishlist();
  }, [authLoading, currentUser, fetchWishlist]);

  const handleRemove = useCallback(async (skillId) => {
    const itemToRemove = wishlist.find(i => i.id === skillId);
    await removeSkillWishlist(skillId);
    setWishlist(prev => prev.filter(item => item.id !== skillId));
    if (itemToRemove) {
      setRemovedToast(itemToRemove);
    }
  }, [wishlist]);

  const handleUndo = useCallback(async () => {
    if (!removedToast) return;
    try {
      await addSkillWishlist(removedToast.id);
      setWishlist(prev => [removedToast, ...prev]);
    } catch (err) {
      console.error('Failed to undo wishlist removal:', err);
    } finally {
      setRemovedToast(null);
    }
  }, [removedToast]);

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (!removedToast) return;
    const timer = setTimeout(() => setRemovedToast(null), 6000);
    return () => clearTimeout(timer);
  }, [removedToast]);

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!authLoading && !currentUser) {
    return (
      <div style={pageStyle}>
        <PageHeader count={0} onBack={() => navigate(-1)} />
        <div style={infoBoxStyle}>
          <span style={{ fontSize: 28 }} aria-hidden="true">🔐</span>
          <p style={{ margin: '8px 0 0', fontWeight: 500, color: 'var(--text-h)' }}>
            You're not logged in
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text)' }}>
            Please log in to view your wishlist.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading || authLoading) {
    return (
      <div style={pageStyle} aria-busy="true" aria-label="Loading wishlist">
        <style>{SHIMMER_CSS}</style>
        <PageHeader count={0} onBack={() => navigate(-1)} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={pageStyle}>
        <PageHeader count={0} onBack={() => navigate(-1)} />
        <div
          role="alert"
          style={{
            padding: '24px',
            borderRadius: 10,
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.06)',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 28 }} aria-hidden="true">⚠️</span>
          <p style={{ margin: '8px 0 4px', fontWeight: 600, color: '#dc2626' }}>
            Could not load your wishlist
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text)' }}>{error}</p>
          <button
            type="button"
            onClick={fetchWishlist}
            style={retryBtnStyle}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            onFocus={e => (e.currentTarget.style.outline = '2px solid #dc2626')}
            onBlur={e => (e.currentTarget.style.outline = 'none')}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Normal ────────────────────────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <PageHeader count={wishlist.length} onBack={() => navigate(-1)} />

      {wishlist.length === 0 ? (
        <div style={infoBoxStyle}>
          <span style={{ fontSize: 36 }} aria-hidden="true">🔖</span>
          <p style={{ margin: '10px 0 4px', fontWeight: 600, color: 'var(--text-h)', fontSize: 16 }}>
            Your wishlist is empty
          </p>
          <p style={{ margin: '0 auto 16px', fontSize: 14, color: 'var(--text)', maxWidth: 320 }}>
            Browse skills and save the ones you want to learn.
          </p>
          <button
            type="button"
            onClick={() => navigate('/skilter/explore')}
            style={{
              padding: '12px 24px',
              borderRadius: 16,
              border: 'none',
              background: BRAND_LIME,
              color: BRAND_LIME_TEXT,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
              boxShadow: `0 12px 28px rgba(31,77,61,0.22)`,
            }}
          >
            Explore Skills
          </button>
        </div>
      ) : (
        <ul
          role="list"
          aria-label="Wishlist skills"
          style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 18 }}
        >
          {wishlist.map(skill => (
            <li key={skill.wishlist_id}>
              <WishlistCard
                skill={skill}
                onRemove={() => handleRemove(skill.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Floating Undo Toast Banner */}
      {removedToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: BRAND_GREEN,
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            zIndex: 1300,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <span>✓ Removed <strong>{removedToast.skill_name}</strong> from wishlist</span>
          <button
            type="button"
            onClick={handleUndo}
            style={{
              background: BRAND_LIME,
              color: BRAND_LIME_TEXT,
              border: 'none',
              borderRadius: 16,
              padding: '3px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page header ───────────────────────────────────────────────────────────────
function PageHeader({ count, onBack }) {
  return (
    <div style={{ marginBottom: 28, padding: '26px 24px', borderRadius: 24, background: '#ffffff', border: `1px solid rgba(31,77,61,0.16)`, boxShadow: `0 22px 50px rgba(31,77,61,0.10)` }}>
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 38, height: 38, borderRadius: 12,
          border: `1.5px solid rgba(31,77,61,0.20)`, background: 'transparent',
          color: BRAND_GREEN, cursor: 'pointer', fontSize: 18,
          marginBottom: 16, transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(31,77,61,0.07)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        ←
      </button>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--text-h)' }}>My Skilter Wishlist</h1>
        {count > 0 && (
          <span
            aria-label={`${count} skill${count !== 1 ? 's' : ''}`}
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: BRAND_GREEN,
              background: 'rgba(31,77,61,0.10)',
              borderRadius: 999,
              padding: '6px 14px',
            }}
          >
            {count}
          </span>
        )}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 15, color: 'var(--text)', maxWidth: 620 }}>
        Save skills you want to learn, and book a session when you're ready.
      </p>
    </div>
  );
}

// ── Internal card component ───────────────────────────────────────────────────
function WishlistCard({ skill, onRemove }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [removing, setRemoving]       = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [hovered, setHovered]         = useState(false);
  const [booking, setBooking]         = useState({ loading: false, error: '', success: false });

  const FALLBACK_IMG = 'https://via.placeholder.com/300x220?text=Skill';
  const isOwner = currentUser && currentUser.id === skill.teacher_id;

  async function handleRemoveClick() {
    setRemoving(true);
    setRemoveError('');
    try {
      await onRemove();
    } catch (err) {
      setRemoveError(getErrorMessage(err));
      setRemoving(false);
    }
  }

  async function handleBookSession() {
    if (!currentUser) { navigate('/login'); return; }
    setBooking({ loading: true, error: '', success: false });
    try {
      await createSkillBooking(skill.id);
      setBooking({ loading: false, error: '', success: true });
      setTimeout(() => navigate('/skilter/learning'), 1200);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Something went wrong. Please try again.';
      setBooking({ loading: false, error: msg, success: false });
    }
  }

  const metaParts = [
    skill.category || 'General',
    skill.session_type === 'one_on_one' ? 'One-on-One' : 'Group',
    skill.price_type // raw price_type displayed as-is per requirements
  ].filter(Boolean);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 24,
        border: `1px solid rgba(31,77,61,0.16)`,
        padding: '20px',
        background: '#ffffff',
        boxShadow: hovered ? `0 22px 50px rgba(31,77,61,0.14)` : `0 12px 28px rgba(31,77,61,0.08)`,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 0.2s, box-shadow 0.2s, opacity 0.2s',
      }}
    >
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <img
          src={skill.image_urls?.[0] ?? FALLBACK_IMG}
          alt={skill.skill_name}
          width={88}
          height={88}
          onError={e => { e.currentTarget.src = FALLBACK_IMG; }}
          style={{
            borderRadius: 20,
            objectFit: 'cover',
            flexShrink: 0,
            border: `1px solid rgba(31,77,61,0.16)`,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--text-h)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {skill.skill_name}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-h)', fontWeight: 500 }}>
            Teacher: {skill.teacher_name || 'Teacher'}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            {metaParts.join(' · ')}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <Link
          to={`/skilter/skill/${skill.id}`}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '10px 18px', borderRadius: 16, fontSize: 13, fontWeight: 700,
            background: BRAND_GREEN, color: '#fff', textDecoration: 'none',
            minWidth: 100,
          }}
        >
          View Details
        </Link>

        {!isOwner && (
          <button
            type="button"
            disabled={booking.loading || booking.success}
            onClick={handleBookSession}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '10px 18px', borderRadius: 16, fontSize: 13, fontWeight: 700,
              background: 'transparent', border: `1px solid rgba(31,77,61,0.3)`,
              color: BRAND_GREEN, cursor: 'pointer', minWidth: 120,
            }}
          >
            {booking.loading
              ? 'Booking…'
              : booking.success
              ? '✓ Booked!'
              : 'Book Session'}
          </button>
        )}

        <button
          type="button"
          disabled={removing}
          onClick={handleRemoveClick}
          aria-label={`Remove ${skill.skill_name} from wishlist`}
          aria-busy={removing}
          style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '10px 18px', borderRadius: 16, fontSize: 13, fontWeight: 700,
            background: 'transparent', border: '1px solid rgba(220,38,38,0.22)',
            color: removing ? 'var(--muted)' : '#dc2626',
            cursor: removing ? 'not-allowed' : 'pointer',
            minWidth: 110,
          }}
        >
          {removing ? 'Removing…' : 'Remove'}
        </button>
      </div>

      {removeError && (
        <p role="alert" style={{ margin: '14px 0 0', fontSize: 13, color: '#B91C1C', fontWeight: 600 }}>
          ⚠ {removeError}
        </p>
      )}

      {booking.error && (
        <p role="alert" style={{ margin: '14px 0 0', fontSize: 13, color: '#B91C1C', fontWeight: 600 }}>
          ⚠ {booking.error}
        </p>
      )}
    </div>
  );
}

const pageStyle = {
  padding: '32px 24px',
  maxWidth: 740,
  margin: '0 auto',
  textAlign: 'left',
  boxSizing: 'border-box',
  background: '#ffffff',
};

const infoBoxStyle = {
  textAlign: 'center',
  padding: '48px 24px',
  border: '1px dashed rgba(31,77,61,0.25)',
  borderRadius: 10,
  color: 'var(--text)',
  background: '#ffffff',
};

const retryBtnStyle = {
  padding: '7px 20px',
  borderRadius: 7,
  border: '1px solid rgba(239,68,68,0.4)',
  background: 'transparent',
  color: '#dc2626',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  transition: 'background 0.15s',
  outline: 'none',
};
