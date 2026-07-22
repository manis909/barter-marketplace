import { useState, useEffect, useCallback } from 'react';
import { getWishlist } from '../services/tradeService';
import { getErrorMessage } from '../utils/helpers';
import { useAuth } from '../features/auth/AuthContext';

// TODO (Member 3 — next sprint): implement DELETE /api/trades/wishlist/:itemId
// on the backend, then add removeWishlist(itemId) to tradeService.js and
// wire it to the Remove button below. Until that endpoint exists the
// Remove button is intentionally disabled.
const REMOVE_ENDPOINT_READY = false;

// Pulse keyframe injected once — used by skeleton loaders
const PULSE_CSS = `@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }`;

export default function Wishlist() {
  const { currentUser, loading: authLoading } = useAuth();

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // ── Fetch ─────────────────────────────────────────────────────────────────
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
    if (!currentUser) {
      setLoading(false);
      return;
    }
    fetchWishlist();
  }, [authLoading, currentUser, fetchWishlist]);

  // ── Remove (disabled until DELETE endpoint exists) ─────────────────────────
  // TODO: replace this stub with a real API call once the DELETE endpoint is ready.
  // When REMOVE_ENDPOINT_READY is true, import removeWishlist from tradeService
  // and call: await removeWishlist(item.id)
  // Then remove the item from local state on success.
  function handleRemove(_itemId) {
    // intentionally a no-op until backend endpoint is implemented
    return Promise.resolve();
  }

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!authLoading && !currentUser) {
    return (
      <div style={pageStyle}>
        <h2 style={{ marginTop: 0 }}>My Wishlist</h2>
        <p style={{ color: 'var(--text)' }}>Please log in to view your wishlist.</p>
      </div>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading || authLoading) {
    return (
      <div style={pageStyle} aria-busy="true" aria-label="Loading wishlist">
        <h2 style={{ marginTop: 0 }}>My Wishlist</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(n => (
            <div
              key={n}
              aria-hidden="true"
              style={{
                height: 80,
                borderRadius: 8,
                background: 'var(--border)',
                animation: 'pulse 1.4s ease-in-out infinite',
                opacity: 1 - n * 0.15,
              }}
            />
          ))}
        </div>
        <style>{PULSE_CSS}</style>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={pageStyle}>
        <h2 style={{ marginTop: 0 }}>My Wishlist</h2>
        <div
          role="alert"
          style={{
            padding: '20px 24px',
            borderRadius: 8,
            border: '1px solid #ef4444',
            background: 'rgba(239,68,68,0.08)',
            color: '#ef4444',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: '0 0 12px', fontWeight: 500 }}>
            Could not load your wishlist
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 14 }}>{error}</p>
          <button
            type="button"
            onClick={fetchWishlist}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: '1px solid #ef4444',
              background: 'transparent',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Normal state ──────────────────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <h2 style={{ marginTop: 0 }}>
        My Wishlist
        {wishlist.length > 0 && (
          <span
            aria-label={`${wishlist.length} item${wishlist.length !== 1 ? 's' : ''}`}
            style={{
              marginLeft: 10,
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text)',
              verticalAlign: 'middle',
            }}
          >
            ({wishlist.length})
          </span>
        )}
      </h2>

      {/* Empty state */}
      {wishlist.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            border: '1px dashed var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
          }}
        >
          <p style={{ fontSize: 32, margin: '0 0 8px' }} aria-hidden="true">🔖</p>
          <p style={{ margin: '0 0 4px', fontWeight: 500, color: 'var(--text-h)' }}>
            Your wishlist is empty
          </p>
          <p style={{ margin: 0, fontSize: 14 }}>
            Browse items and save the ones you want to trade for.
          </p>
        </div>
      ) : (
        <ul
          role="list"
          aria-label="Wishlist items"
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
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

// ── Internal card component ───────────────────────────────────────────────────
// Props:
//   item          – WishlistItem shape (joined wishlists + items, see TRADE_API.md)
//   onRemove      – () => Promise<void>  called when Remove is clicked
//   removeEnabled – false until DELETE /api/trades/wishlist/:itemId is implemented
function WishlistCard({ item, onRemove, removeEnabled }) {
  const [removing, setRemoving]       = useState(false);
  const [removeError, setRemoveError] = useState('');
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

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '14px 16px',
        background: 'var(--social-bg)',
        opacity: isUnavailable ? 0.65 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        {/* Thumbnail */}
        <img
          src={item.image_urls?.[0] ?? FALLBACK_IMG}
          alt={item.title}
          width={64}
          height={64}
          onError={e => { e.currentTarget.src = FALLBACK_IMG; }}
          style={{
            borderRadius: 6,
            objectFit: 'cover',
            flexShrink: 0,
            background: 'var(--border)',
          }}
        />

        {/* Info */}
        <div style={{ flex: '1 1 160px' }}>
          <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-h)', lineHeight: 1.4 }}>
            {item.title}
            {isUnavailable && (
              <span
                aria-label={`Status: ${item.status}`}
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  color: '#ef4444',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  background: 'rgba(239,68,68,0.1)',
                  borderRadius: 4,
                  padding: '1px 5px',
                }}
              >
                {item.status}
              </span>
            )}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text)' }}>
            {[
              item.category,
              item.item_condition?.replace(/_/g, ' '),
              item.estimated_value ? `~$${item.estimated_value}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        {/* Remove button
            Disabled with tooltip until DELETE endpoint is implemented.
            TODO: set REMOVE_ENDPOINT_READY = true once backend is ready. */}
        <button
          type="button"
          disabled={!removeEnabled || removing}
          onClick={handleRemoveClick}
          aria-label={
            removeEnabled
              ? `Remove ${item.title} from wishlist`
              : `Remove ${item.title} — not yet available`
          }
          aria-busy={removing}
          title={removeEnabled ? undefined : 'Coming soon'}
          style={{
            alignSelf: 'center',
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '5px 14px',
            cursor: (!removeEnabled || removing) ? 'not-allowed' : 'pointer',
            color: (!removeEnabled || removing) ? 'var(--text)' : '#ef4444',
            fontSize: 13,
            fontWeight: 500,
            flexShrink: 0,
            opacity: (!removeEnabled || removing) ? 0.4 : 1,
            outline: 'none',
            transition: 'opacity 0.15s',
          }}
          onFocus={e => {
            if (removeEnabled && !removing)
              e.currentTarget.style.outline = '2px solid var(--accent)';
          }}
          onBlur={e => (e.currentTarget.style.outline = 'none')}
        >
          {removing ? 'Removing…' : 'Remove'}
        </button>
      </div>

      {/* Inline remove error */}
      {removeError && (
        <p
          role="alert"
          style={{ margin: '8px 0 0', fontSize: 13, color: '#ef4444' }}
        >
          {removeError}
        </p>
      )}
    </div>
  );
}

const pageStyle = {
  padding: '32px 24px',
  maxWidth: 720,
  margin: '0 auto',
  textAlign: 'left',
  boxSizing: 'border-box',
};
