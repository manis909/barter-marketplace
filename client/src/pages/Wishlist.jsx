import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Package, ArrowLeft, Trash2, Tag, ArrowLeftRight, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { getWishlist, removeWishlist, addWishlist } from '../services/tradeService';
import { getErrorMessage } from '../utils/helpers';
import { useAuth } from '../features/auth/AuthContext';
import api from '../services/api';
import Footer from '../components/Footer';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');

.bw-page {
  min-height: 100vh;
  background: #f8f7f2;
  color: #10241c;
  font-family: 'Inter', sans-serif;
  padding: 32px 20px 64px;
}
.bw-container {
  max-width: 960px;
  margin: 0 auto;
}
.bw-back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(15,61,46,0.15);
  background: #ffffff;
  color: #0f3d2e;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  margin-bottom: 24px;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.bw-back:hover {
  background: #f0f4f1;
  border-color: rgba(15,61,46,0.25);
}
.bw-header {
  margin-bottom: 28px;
}
.bw-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.bw-title {
  font-family: 'Fraunces', serif;
  font-size: 32px;
  font-weight: 700;
  color: #0f3d2e;
  margin: 0;
  letter-spacing: -0.02em;
}
.bw-count-badge {
  font-size: 13px;
  font-weight: 700;
  background: rgba(198,233,48,0.25);
  color: #0f3d2e;
  border: 1px solid rgba(198,233,48,0.6);
  padding: 4px 12px;
  border-radius: 999px;
}
.bw-subtitle {
  font-size: 14.5px;
  color: #5d7067;
  margin: 8px 0 0;
  max-width: 580px;
  line-height: 1.5;
}

.bw-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.bw-card {
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid rgba(15,61,46,0.08);
  box-shadow: 0 4px 16px rgba(15,61,46,0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.bw-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(15,61,46,0.08);
}
.bw-card-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #f4f3ed;
  overflow: hidden;
  display: grid;
  place-items: center;
}
.bw-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.bw-remove-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #ffffff;
  color: #ef4444;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  transition: all 0.15s;
}
.bw-remove-btn:hover {
  background: #fef2f2;
  transform: scale(1.08);
}
.bw-card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 10px;
}
.bw-card-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.bw-category-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(15,61,46,0.08);
  color: #0f3d2e;
}
.bw-condition-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
}
.bw-unavailable-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fee2e2;
  color: #991b1b;
}
.bw-card-title {
  font-family: 'Fraunces', serif;
  font-size: 17px;
  font-weight: 700;
  color: #10241c;
  margin: 0;
  line-height: 1.3;
}
.bw-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: #647167;
}
.bw-card-value {
  margin-top: auto;
  font-size: 16px;
  font-weight: 800;
  color: #0f3d2e;
}
.bw-card-value small {
  font-size: 12px;
  font-weight: 600;
  color: #647167;
}
.bw-card-actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
}
.bw-trade-btn {
  flex: 1;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  border: 0;
  background: #0f3d2e;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s;
}
.bw-trade-btn:hover {
  background: #1b4d3e;
}
.bw-view-btn {
  height: 38px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid rgba(15,61,46,0.15);
  background: #ffffff;
  color: #0f3d2e;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
}
.bw-view-btn:hover {
  background: #f0f4f1;
}

.bw-empty {
  text-align: center;
  padding: 64px 20px;
  background: #ffffff;
  border-radius: 24px;
  border: 1px solid rgba(15,61,46,0.08);
  box-shadow: 0 4px 20px rgba(15,61,46,0.04);
}
.bw-empty-icon {
  width: 60px;
  height: 60px;
  border-radius: 20px;
  background: rgba(15,61,46,0.06);
  color: #0f3d2e;
  display: grid;
  place-items: center;
  margin: 0 auto 18px;
}
.bw-empty h3 {
  font-family: 'Fraunces', serif;
  font-size: 22px;
  color: #0f3d2e;
  margin: 0 0 8px;
}
.bw-empty p {
  font-size: 14px;
  color: #647167;
  max-width: 360px;
  margin: 0 auto 22px;
  line-height: 1.5;
}
.bw-explore-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 14px;
  background: #c6e930;
  color: #0f3d2e;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 6px 18px rgba(198,233,48,0.35);
  transition: transform 0.15s;
}
.bw-explore-btn:hover {
  transform: translateY(-2px);
}

.bw-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #0f3d2e;
  color: #ffffff;
  padding: 10px 20px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 10px 30px rgba(15,61,46,0.25);
  z-index: 1300;
  font-size: 14px;
  font-weight: 500;
}
.bw-toast-undo {
  background: #c6e930;
  color: #0f3d2e;
  border: none;
  border-radius: 16px;
  padding: 3px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
`;

function prettifyCondition(raw) {
  if (!raw) return '';
  return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function Wishlist() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [wishlist, setWishlist]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [removedToast, setRemovedToast] = useState(null);

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

  useEffect(() => {
    if (!removedToast) return;
    const timer = setTimeout(() => setRemovedToast(null), 6000);
    return () => clearTimeout(timer);
  }, [removedToast]);

  return (
    <>
      <style>{CSS}</style>
      <div className="bw-page">
        <div className="bw-container">
          <Link to="/explore" className="bw-back">
            <ArrowLeft size={15} /> Back to Explore
          </Link>

          <header className="bw-header">
            <div className="bw-title-row">
              <h1 className="bw-title">My Wishlist</h1>
              {wishlist.length > 0 && (
                <span className="bw-count-badge">
                  {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}
                </span>
              )}
            </div>
            <p className="bw-subtitle">
              Save items you want to trade for, then make an offer when availability is right.
            </p>
          </header>

          {!authLoading && !currentUser ? (
            <div className="bw-empty">
              <div className="bw-empty-icon">🔐</div>
              <h3>You're not logged in</h3>
              <p>Please log in to view and manage your barter wishlist.</p>
              <Link to="/login" className="bw-explore-btn">
                Log In <ChevronRight size={16} />
              </Link>
            </div>
          ) : loading ? (
            <p style={{ color: '#5d7067', fontSize: 14 }}>Loading your wishlist…</p>
          ) : error ? (
            <div className="bw-empty">
              <h3>Could not load wishlist</h3>
              <p>{error}</p>
              <button
                type="button"
                onClick={fetchWishlist}
                className="bw-explore-btn"
                style={{ cursor: 'pointer', border: 0 }}
              >
                Try Again
              </button>
            </div>
          ) : wishlist.length === 0 ? (
            <div className="bw-empty">
              <div className="bw-empty-icon">
                <Heart size={28} />
              </div>
              <h3>Your wishlist is empty</h3>
              <p>Browse items and save the ones you want to trade for.</p>
              <Link to="/explore" className="bw-explore-btn">
                Explore Items <ChevronRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="bw-grid">
              {wishlist.map(item => (
                <WishlistCard
                  key={item.wishlist_id || item.id}
                  item={item}
                  onRemove={() => handleRemove(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {removedToast && (
        <div className="bw-toast" role="status" aria-live="polite">
          <span>✓ Removed <strong>{removedToast.title}</strong> from wishlist</span>
          <button type="button" onClick={handleUndo} className="bw-toast-undo">
            Undo
          </button>
        </div>
      )}
      <Footer />
    </>
  );
}

function WishlistCard({ item, onRemove }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [myItems, setMyItems]               = useState([]);
  const [loadingItems, setLoadingItems]     = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [tradeMessage, setTradeMessage]     = useState('');
  const [submitting, setSubmitting]         = useState(false);
  const [tradeError, setTradeError]         = useState('');

  const image = Array.isArray(item.image_urls) && item.image_urls.length ? item.image_urls[0] : '';
  const isUnavailable = item.status && item.status !== 'available';

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

  return (
    <>
      <article className="bw-card">
        <div className="bw-card-media">
          {image ? (
            <img src={image} alt={item.title} className="bw-card-img" />
          ) : (
            <Package size={40} color="#7a8c84" />
          )}
          <button
            type="button"
            className="bw-remove-btn"
            onClick={onRemove}
            aria-label="Remove from wishlist"
            title="Remove from wishlist"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="bw-card-body">
          <div className="bw-card-badges">
            <span className="bw-category-badge">{item.category || 'Item'}</span>
            {item.item_condition && (
              <span className="bw-condition-badge">{prettifyCondition(item.item_condition)}</span>
            )}
            {isUnavailable && (
              <span className="bw-unavailable-badge">Unavailable</span>
            )}
          </div>

          <h2 className="bw-card-title">{item.title}</h2>

          <div className="bw-card-value">
            {item.estimated_value ? (
              <>
                ${item.estimated_value} <small>Est. Value</small>
              </>
            ) : (
              <small style={{ color: '#0f3d2e', fontWeight: 700 }}>Open Barter</small>
            )}
          </div>

          <div className="bw-card-actions">
            {!isUnavailable ? (
              <button
                type="button"
                className="bw-trade-btn"
                onClick={handleOfferTrade}
              >
                <ArrowLeftRight size={14} /> Propose Trade
              </button>
            ) : (
              <span style={{ fontSize: 12, color: '#991b1b', fontWeight: 600, padding: '8px 0' }}>
                Currently unavailable
              </span>
            )}
            <Link to={`/item/${item.id}`} className="bw-view-btn">
              View
            </Link>
          </div>
        </div>
      </article>

      {/* Trade Proposal Modal */}
      {tradeModalOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,61,46,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1400, padding: 20,
        }}>
          <div style={{
            background: '#ffffff', borderRadius: 20, padding: 28,
            maxWidth: 480, width: '100%',
            boxShadow: '0 20px 50px rgba(15,61,46,0.2)',
          }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: '#0f3d2e' }}>
              Propose a Trade
            </h2>
            <p style={{ fontSize: 13.5, color: '#5d7067', margin: '0 0 18px' }}>
              Select an item from your inventory to trade for <strong>{item.title}</strong>.
            </p>

            {tradeError && (
              <div style={{
                background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b',
                padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14,
              }}>
                {tradeError}
              </div>
            )}

            {loadingItems ? (
              <p style={{ fontSize: 13.5, color: '#5d7067' }}>Loading your items…</p>
            ) : myItems.length === 0 ? (
              <div>
                <p style={{ fontSize: 13.5, color: '#991b1b', marginBottom: 16 }}>
                  You don't have any available items to trade! Please list an item first.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setTradeModalOpen(false)}
                    className="bw-view-btn"
                  >
                    Cancel
                  </button>
                  <Link to="/add-item" className="bw-trade-btn" style={{ textDecoration: 'none', padding: '0 16px' }}>
                    + Add Item
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitTrade}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f3d2e', marginBottom: 6 }}>
                    Select Your Offered Item:
                  </label>
                  <select
                    value={selectedItemId}
                    onChange={e => setSelectedItemId(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: '1px solid rgba(15,61,46,0.18)', fontSize: 13.5, background: '#f8f7f2',
                    }}
                  >
                    {myItems.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.title} (Est. ${i.estimated_value || '0'})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f3d2e', marginBottom: 6 }}>
                    Message to Owner (Optional):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Hi! I'd love to swap my item for yours..."
                    value={tradeMessage}
                    onChange={e => setTradeMessage(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: '1px solid rgba(15,61,46,0.18)', fontSize: 13.5, background: '#f8f7f2', resize: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setTradeModalOpen(false)}
                    className="bw-view-btn"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bw-trade-btn"
                    style={{ padding: '0 18px' }}
                    disabled={submitting}
                  >
                    {submitting ? 'Sending Proposal…' : 'Send Trade Offer'}
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