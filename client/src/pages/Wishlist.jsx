import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getWishlist, removeWishlist, addWishlist } from '../services/tradeService';
import { getErrorMessage } from '../utils/helpers';
import { useAuth } from '../features/auth/AuthContext';
import api from '../services/api';

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
  const navigate = useNavigate();

  const [wishlist, setWishlist]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [removedToast, setRemovedToast]       = useState(null); // { item }

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
    const itemToRemove = wishlist.find(i => i.id === itemId);
    await removeWishlist(itemId);
    setWishlist(prev => prev.filter(item => item.id !== itemId));
    if (itemToRemove) {
      setRemovedToast(itemToRemove);
    }
  }, [wishlist]);

  const handleUndo = useCallback(async () => {
    if (!removedToast) return;
    try {
      await addWishlist(removedToast.id);
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
          <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text)', maxWidth: 320 }}>
            Browse items and save the ones you want to trade for.
          </p>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Explore Items
          </button>
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
            background: 'var(--text-h)',
            color: 'var(--bg)',
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
          <span>✓ Removed <strong>{removedToast.title}</strong> from wishlist</span>
          <button
            type="button"
            onClick={handleUndo}
            style={{
              background: 'var(--accent)',
              color: '#fff',
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
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [removing, setRemoving]       = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [hovered, setHovered]         = useState(false);

  // Inline trade modal state
  const [tradeModalOpen, setTradeModalOpen]   = useState(false);
  const [myItems, setMyItems]                 = useState([]);
  const [loadingItems, setLoadingItems]       = useState(false);
  const [selectedItemId, setSelectedItemId]   = useState('');
  const [tradeMessage, setTradeMessage]       = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [tradeError, setTradeError]           = useState('');

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

  async function handleOfferTrade() {
    if (!currentUser) { navigate('/login'); return; }
    setTradeError('');
    setTradeModalOpen(true);
    setLoadingItems(true);
    try {
      const res = await api.get('/items/mine');
      const available = (res.data.items || []).filter(i => i.status === 'available');
      setMyItems(available);
      if (available.length > 0) setSelectedItemId(available[0].id);
    } catch {
      setTradeError('Could not load your items.');
    } finally {
      setLoadingItems(false);
    }
  }

  async function handleSubmitTrade(e) {
    e.preventDefault();
    if (!selectedItemId) { setTradeError('Please select an item to offer.'); return; }
    setSubmitting(true);
    setTradeError('');
    try {
      await api.post('/trades', {
        offered_item_id: selectedItemId,
        requested_item_id: item.id,
        message: tradeMessage,
      });
      setTradeModalOpen(false);
      navigate('/my-trades');
    } catch (err) {
      setTradeError(err.response?.data?.error || 'Failed to send trade offer.');
    } finally {
      setSubmitting(false);
    }
  }

  const metaParts = [
    item.category,
    prettifyCondition(item.item_condition),
    item.estimated_value ? `~$${item.estimated_value}` : null,
  ].filter(Boolean);

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '14px 16px',
          background: 'var(--social-bg)',
          opacity: isUnavailable ? 0.7 : 1,
          boxShadow: hovered ? 'var(--shadow)' : '0 1px 3px rgba(0,0,0,0.06)',
          transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
          transition: 'box-shadow 0.18s, transform 0.18s, opacity 0.2s',
        }}
      >
        {/* Top row: image + info */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <img
            src={item.image_urls?.[0] ?? FALLBACK_IMG}
            alt={item.title}
            width={72}
            height={72}
            onError={e => { e.currentTarget.src = FALLBACK_IMG; }}
            style={{
              borderRadius: 8,
              objectFit: 'cover',
              flexShrink: 0,
              border: '1px solid var(--border)',
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: 'var(--text-h)', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.title}
              {isUnavailable && (
                <span
                  aria-label={`Status: ${item.status}`}
                  style={{
                    marginLeft: 8, fontSize: 11, fontWeight: 700,
                    color: '#dc2626', background: 'rgba(239,68,68,0.1)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    borderRadius: 4, padding: '2px 6px',
                  }}
                >
                  {item.status}
                </span>
              )}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text)' }}>
              {metaParts.join(' · ')}
            </p>
          </div>
        </div>

        {/* Bottom row: action buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {/* View Item */}
          <Link
            to={`/item/${item.id}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600,
              background: 'var(--accent)', color: '#fff', textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            View Item
          </Link>

          {/* Offer Trade — only when item is available */}
          {!isUnavailable && (
            <button
              type="button"
              onClick={handleOfferTrade}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                background: 'none', border: '1px solid var(--accent)',
                color: 'var(--accent)', cursor: 'pointer', flexShrink: 0,
              }}
            >
              Offer Trade
            </button>
          )}

          {/* Remove */}
          <button
            type="button"
            disabled={!removeEnabled || removing}
            onClick={handleRemoveClick}
            aria-label={removeEnabled ? `Remove ${item.title} from wishlist` : `Remove not yet available`}
            aria-busy={removing}
            style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'none', border: '1px solid var(--border)', borderRadius: 7,
              padding: '6px 14px', cursor: (!removeEnabled || removing) ? 'not-allowed' : 'pointer',
              color: (!removeEnabled || removing) ? 'var(--text)' : '#dc2626',
              fontSize: 13, fontWeight: 500, flexShrink: 0,
              opacity: (!removeEnabled || removing) ? 0.4 : 1,
              transition: 'background 0.15s',
            }}
          >
            {removing ? 'Removing…' : 'Remove'}
          </button>
        </div>

        {removeError && (
          <p role="alert" style={{ margin: '8px 0 0', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
            ⚠ {removeError}
          </p>
        )}
      </div>

      {/* Inline Trade Modal */}
      {tradeModalOpen && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: 20,
          }}
          onClick={() => setTradeModalOpen(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 18, padding: 28,
              maxWidth: 460, width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: '#1C1917' }}>
              Propose a Trade
            </h2>
            <p style={{ fontSize: 13, color: '#57534E', margin: '0 0 18px' }}>
              Offer one of your items in exchange for <strong>{item.title}</strong>.
            </p>

            {tradeError && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FCA5A5',
                color: '#991B1B', padding: '9px 13px', borderRadius: 8,
                fontSize: 13, marginBottom: 14,
              }}>
                {tradeError}
              </div>
            )}

            {loadingItems ? (
              <p style={{ fontSize: 14, color: '#57534E' }}>Loading your items...</p>
            ) : myItems.length === 0 ? (
              <>
                <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 16 }}>
                  You have no available items to trade. List one first!
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid #E4E2D9', background: 'none', cursor: 'pointer', fontSize: 13 }} onClick={() => setTradeModalOpen(false)}>Cancel</button>
                  <Link to="/add-item" style={{ padding: '7px 16px', borderRadius: 7, background: 'var(--accent)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }} onClick={() => setTradeModalOpen(false)}>+ Add Item</Link>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmitTrade}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C1917', marginBottom: 5 }}>
                  Your Item to Offer:
                </label>
                <select
                  value={selectedItemId}
                  onChange={e => setSelectedItemId(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E4E2D9', fontSize: 14, marginBottom: 14, background: '#F9F8F6' }}
                >
                  {myItems.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.title}{i.estimated_value ? ` (Est. $${i.estimated_value})` : ''}
                    </option>
                  ))}
                </select>

                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C1917', marginBottom: 5 }}>
                  Message (Optional):
                </label>
                <textarea
                  rows={3}
                  placeholder="Hi! I'd love to swap my item..."
                  value={tradeMessage}
                  onChange={e => setTradeMessage(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E4E2D9', fontSize: 14, marginBottom: 18, background: '#F9F8F6', resize: 'none' }}
                />

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid #E4E2D9', background: 'none', cursor: 'pointer', fontSize: 13 }} onClick={() => setTradeModalOpen(false)} disabled={submitting}>Cancel</button>
                  <button type="submit" style={{ padding: '7px 18px', borderRadius: 7, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }} disabled={submitting}>
                    {submitting ? 'Sending...' : 'Send Trade Offer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
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
