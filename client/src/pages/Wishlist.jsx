import { useState, useEffect, useCallback } from 'react';
import { getWishlist, removeWishlist } from '../services/tradeService';
import { getErrorMessage } from '../utils/helpers';
import { useAuth } from '../features/auth/AuthContext';

const REMOVE_ENDPOINT_READY = true;

// Shimmer animation — same as MyTrades
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
        background: 'var(--social-bg)',
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

// Capitalize each word, replace underscores with spaces
function prettifyCondition(raw) {
  if (!raw) return '';
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function Wishlist() {
  const { currentUser, loading: authLoading } = useAuth();

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getWishlist();
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

  const handleRemove = useCallback(async (itemId) => {
    await removeWishlist(itemId);
    setWishlist(prev => prev.filter(item => item.id !== itemId));
  }, []);


  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!authLoading && !currentUser) {
    return (
      <div style={pageStyle}>
        <PageHeader count={0} />
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
        <PageHeader count={0} />
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
        <PageHeader count={0} />
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
      <PageHeader count={wishlist.length} />

      {wishlist.length === 0 ? (
        <div style={infoBoxStyle}>
          <span style={{ fontSize: 36 }} aria-hidden="true">🔖</span>
          <p style={{ margin: '10px 0 4px', fontWeight: 600, color: 'var(--text-h)', fontSize: 16 }}>
            Your wishlist is empty
          </p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', maxWidth: 300 }}>
            Browse items and save the ones you want to trade for.
          </p>
        </div>
      ) : (
        <ul
          role="list"
          aria-label="Wishlist items"
          style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          {wishlist.map(item => (
            <li key={item.wishlist_id}>
              <WishlistCard
                item={item}
                onRemove={() => handleRemove(item.id)}
                removeEnabled={REMOVE_ENDPOINT_READY}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Page header ───────────────────────────────────────────────────────────────
function PageHeader({ count }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>My Wishlist</h2>
        {count > 0 && (
          <span
            aria-label={`${count} item${count !== 1 ? 's' : ''}`}
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--accent)',
              background: 'var(--accent-bg)',
              borderRadius: 20,
              padding: '2px 10px',
            }}
          >
            {count}
          </span>
        )}
      </div>
      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text)' }}>
        Items you've saved to trade for
      </p>
    </div>
  );
}

// ── Internal card component ───────────────────────────────────────────────────
function WishlistCard({ item, onRemove, removeEnabled }) {
  const [removing, setRemoving]       = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [hovered, setHovered]         = useState(false);
  const FALLBACK_IMG = 'https://placehold.co/64x64?text=?';

  const isUnavailable = item.status !== 'available';

  async function handleRemoveClick() {
    if (!removeEnabled) return;
    setRemoving(true);
    setRemoveError('');
    try {
      await onRemove();
    } catch (err) {
      setRemoveError(getErrorMessage(err));
      setRemoving(false);
    }
  }

  const metaParts = [
    item.category,
    prettifyCondition(item.item_condition),
    item.estimated_value ? `~$${item.estimated_value}` : null,
  ].filter(Boolean);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '14px 16px',
        background: 'var(--social-bg)',
        opacity: isUnavailable ? 0.65 : 1,
        boxShadow: hovered ? 'var(--shadow)' : '0 1px 3px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'box-shadow 0.18s, transform 0.18s, opacity 0.2s',
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Thumbnail */}
        <img
          src={item.image_urls?.[0] ?? FALLBACK_IMG}
          alt={item.title}
          width={64}
          height={64}
          onError={e => { e.currentTarget.src = FALLBACK_IMG; }}
          style={{
            borderRadius: 8,
            objectFit: 'cover',
            flexShrink: 0,
            border: '1px solid var(--border)',
            background: 'var(--border)',
          }}
        />

        {/* Info */}
        <div style={{ flex: '1 1 160px' }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: 'var(--text-h)', lineHeight: 1.4 }}>
            {item.title}
            {isUnavailable && (
              <span
                aria-label={`Status: ${item.status}`}
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#dc2626',
                  background: 'rgba(239,68,68,0.1)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderRadius: 4,
                  padding: '2px 6px',
                }}
              >
                {item.status}
              </span>
            )}
          </p>
          <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
            {metaParts.join(' · ')}
          </p>
        </div>

        {/* Remove button */}
        <button
          type="button"
          disabled={!removeEnabled || removing}
          onClick={handleRemoveClick}
          aria-label={
            removeEnabled
              ? `Remove ${item.title} from wishlist`
              : `Remove not yet available for ${item.title}`
          }
          aria-busy={removing}
          title={removeEnabled ? undefined : 'Coming soon'}
          style={{
            alignSelf: 'center',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 7,
            padding: '6px 14px',
            cursor: (!removeEnabled || removing) ? 'not-allowed' : 'pointer',
            color: (!removeEnabled || removing) ? 'var(--text)' : '#dc2626',
            fontSize: 13,
            fontWeight: 500,
            flexShrink: 0,
            opacity: (!removeEnabled || removing) ? 0.4 : 1,
            outline: 'none',
            transition: 'background 0.15s, opacity 0.15s',
          }}
          onMouseEnter={e => { if (removeEnabled && !removing) e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; }}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          onFocus={e => { if (removeEnabled && !removing) e.currentTarget.style.outline = '2px solid var(--accent)'; }}
          onBlur={e => (e.currentTarget.style.outline = 'none')}
        >
          {!removeEnabled && <span aria-hidden="true">🔒</span>}
          {removing ? 'Removing…' : 'Remove'}
        </button>
      </div>

      {removeError && (
        <p role="alert" style={{ margin: '10px 0 0', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
          ⚠ {removeError}
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
};

const infoBoxStyle = {
  textAlign: 'center',
  padding: '48px 24px',
  border: '1px dashed var(--border)',
  borderRadius: 10,
  color: 'var(--text)',
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
