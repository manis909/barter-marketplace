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
              padding: '12px 24px',
              borderRadius: 16,
              border: 'none',
              background: '#C8624B',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
              boxShadow: '0 12px 28px rgba(200,98,75,0.22)',
            }}
          >
            Explore Items
          </button>
        </div>
      ) : (
        <ul
          role="list"
          aria-label="Wishlist items"
          style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 18 }}
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
    <div style={{ marginBottom: 28, padding: '26px 24px', borderRadius: 24, background: 'rgba(255,255,255,0.94)', border: '1px solid rgba(224,122,95,0.18)', boxShadow: '0 22px 50px rgba(208,150,120,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--text-h)' }}>My Wishlist</h1>
        {count > 0 && (
          <span
            aria-label={`${count} item${count !== 1 ? 's' : ''}`}
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#C8624B',
              background: 'rgba(200,98,75,0.12)',
              borderRadius: 999,
              padding: '6px 14px',
            }}
          >
            {count}
          </span>
        )}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 15, color: 'var(--text)', maxWidth: 620 }}>
        Save items you want to trade for, then make an offer when availability is right.
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
        className={`glass curved-card ${hovered ? 'hovered' : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          border: '1px solid rgba(224,122,95,0.18)',
          padding: '20px',
          opacity: isUnavailable ? 0.75 : 1,
          boxShadow: hovered ? '0 22px 50px rgba(208,150,120,0.16)' : '0 12px 28px rgba(208,150,120,0.10)',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'transform 0.2s, box-shadow 0.2s, opacity 0.2s',
        }}
      >
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <img
            src={item.image_urls?.[0] ?? FALLBACK_IMG}
            alt={item.title}
            width={88}
            height={88}
            onError={e => { e.currentTarget.src = FALLBACK_IMG; }}
            style={{
              borderRadius: 20,
              objectFit: 'cover',
              flexShrink: 0,
              border: '1px solid rgba(224,122,95,0.18)',
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--text-h)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.title}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              {metaParts.join(' · ')}
            </p>
          </div>
          {isUnavailable && (
            <span style={{
              padding: '6px 14px', borderRadius: 999,
              background: 'rgba(239,68,68,0.12)', color: '#B91C1C',
              fontSize: 12, fontWeight: 700,
            }}>
              {item.status}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <Link
            to={`/item/${item.id}`}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '10px 18px', borderRadius: 16, fontSize: 13, fontWeight: 700,
              background: '#C8624B', color: '#fff', textDecoration: 'none',
              minWidth: 100,
            }}
          >
            View Item
          </Link>

          {!isUnavailable && (
            <button
              type="button"
              onClick={handleOfferTrade}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '10px 18px', borderRadius: 16, fontSize: 13, fontWeight: 700,
                background: 'transparent', border: '1px solid rgba(37,99,235,0.22)',
                color: '#2563EB', cursor: 'pointer', minWidth: 120,
              }}
            >
              Offer Trade
            </button>
          )}

          <button
            type="button"
            disabled={!removeEnabled || removing}
            onClick={handleRemoveClick}
            aria-label={removeEnabled ? `Remove ${item.title} from wishlist` : `Remove not yet available`}
            aria-busy={removing}
            style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              gap: 4, padding: '10px 18px', borderRadius: 16, fontSize: 13, fontWeight: 700,
              background: 'transparent', border: '1px solid rgba(220,38,38,0.22)',
              color: (!removeEnabled || removing) ? 'var(--muted)' : '#dc2626',
              cursor: (!removeEnabled || removing) ? 'not-allowed' : 'pointer',
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
