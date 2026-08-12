import tradeEmptyImage from '../assets/tradenow.png'
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import TradeCard from '../features/trades/TradeCard';
import { getMyTrades, acceptTrade, declineTrade } from '../services/tradeService';
import { getErrorMessage } from '../utils/helpers';
import { TRADE_STATUS } from '../utils/constants';
import { useAuth } from '../features/auth/AuthContext';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Shimmer animation for skeleton loaders and redesign style tokens
const BARTER_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

:root {
  --dark: #0f3d2e;
  --green: #1b4d3e;
  --light-green: #2f6b52;
  --lime: #c6e930;
  --lime-hover: #b3d426;
  --cream: #f7f5ee;
  --paper: #ffffff;
  --ink: #10241c;
  --muted: #647167;
  --line: rgba(15,61,46,0.12);
  --peach: #fbe8dd;
  --peach-ink: #8a4a2a;
  --sky: #e3eefc;
  --sky-ink: #2a5285;
  --radius: 20px;
}

@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}

.skeleton {
  background: linear-gradient(90deg, var(--line) 25%, rgba(15,61,46,0.06) 50%, var(--line) 75%);
  background-size: 600px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 8px;
}

.mytrades-container {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  background: var(--cream);
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  color: var(--ink);
}

/* narrow screens get a soft shadow to frame the column */
@media (max-width: 1260px) {
  .mytrades-container {
    box-shadow: 0 0 60px rgba(15,61,46,0.08);
  }
}

.mono {
  font-family: 'IBM Plex Mono', monospace;
  letter-spacing: 0.01em;
}

/* ---- Header ---- */
.hero {
  background: linear-gradient(135deg, var(--dark) 0%, var(--green) 42%, var(--light-green) 78%, #4f8a67 100%);
  padding: 40px 24px 80px;
  position: relative;
  overflow: hidden;
}

.hero-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1.5px solid rgba(255,255,255,0.28);
  background: rgba(255,255,255,0.14);
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background 0.18s;
  text-decoration: none;
  font-size: 18px;
  line-height: 1;
}

.hero-back:hover {
  background: rgba(255,255,255,0.26);
}

@media (min-width: 768px) {
  .hero { padding: 52px 40px 90px; }
}

.hero::after {
  content: "";
  position: absolute;
  right: -40px;
  top: -60px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: var(--lime);
  opacity: 0.14;
}

/* ---- Page title card ---- */
.title-card {
  background: var(--paper);
  margin: -40px 16px 0;
  border-radius: 22px;
  padding: 24px 22px;
  position: relative;
  z-index: 2;
  box-shadow: 0 12px 30px rgba(15,61,46,0.10);
}

@media (min-width: 768px) {
  .title-card {
    margin: -44px 32px 0;
    padding: 28px 32px;
    border-radius: 26px;
  }
}

.title-card h1 {
  font-family: 'Fraunces', serif;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--dark);
}

@media (min-width: 768px) {
  .title-card h1 { font-size: 34px; margin-bottom: 16px; }
}

.stat-row {
  display: flex;
  gap: 28px;
}

.stat b {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 22px;
  color: var(--dark);
  display: block;
}

.stat span {
  font-size: 11.5px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ---- Segmented control ---- */
.segment {
  display: flex;
  margin: 28px 16px 4px;
  background: rgba(15,61,46,0.06);
  border-radius: 12px;
  padding: 4px;
}

@media (min-width: 768px) {
  .segment {
    margin: 32px 32px 4px;
  }
}

.segment button {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 0;
  font-family: 'Inter';
  font-weight: 600;
  font-size: 13.5px;
  color: var(--muted);
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.segment button.on {
  background: var(--dark);
  color: #fff;
}

.segment button .count {
  font-family: 'IBM Plex Mono';
  font-size: 11px;
  opacity: 0.7;
  margin-left: 4px;
}

.section-label {
  margin: 20px 16px 10px;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--muted);
  text-transform: uppercase;
  font-weight: 600;
}

@media (min-width: 768px) {
  .section-label { margin: 24px 32px 12px; }
}

/* ---- Responsive card grid ---- */
.cards-grid {
  padding: 0 16px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: start;
}

@media (min-width: 768px) {
  .cards-grid {
    padding: 0 32px;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

@media (min-width: 1400px) {
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.trade-education-banner {
  background: #ffffff;
  border: 1px solid rgba(47, 107, 82, 0.2);
  border-left: 5px solid #2f6b52;
  border-radius: 16px;
  margin: 20px 16px 0;
  padding: 14px 18px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  box-shadow: 0 4px 14px rgba(15, 61, 46, 0.05);
}

@media (min-width: 768px) {
  .trade-education-banner {
    margin: 24px 32px 0;
  }
}

.education-close-btn {
  background: none;
  border: none;
  font-size: 14px;
  color: #647167;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.education-close-btn:hover {
  color: #10241c;
}

.footer-space {
  height: 40px;
}
`;

function SkeletonCard() {
  return (
    <div aria-hidden="true" style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--paper)', marginBottom: 12 }}>
      <div style={{ height: 32, background: 'rgba(0,0,0,0.02)' }} />
      <div style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
          <div>
            <div className="skeleton" style={{ height: 10, width: 70, marginBottom: 5 }} />
            <div className="skeleton" style={{ height: 16, width: 110 }} />
          </div>
          <div>
            <div className="skeleton" style={{ height: 10, width: 70, marginBottom: 5 }} />
            <div className="skeleton" style={{ height: 16, width: 110 }} />
          </div>
        </div>
        <div className="skeleton" style={{ height: 10, width: 80, marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="skeleton" style={{ height: 32, width: 80, borderRadius: 7 }} />
          <div className="skeleton" style={{ height: 32, width: 80, borderRadius: 7 }} />
        </div>
      </div>
    </div>
  );
}

// ── Section component: renders a labelled group of trades ─────────────────
function TradeSection({ title, trades, emptyMessage, currentUserId, onStatusChange }) {
  return (
    <section style={{ marginBottom: 36 }}>
      {trades.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '28px 20px',
          border: '1px dashed var(--line)', borderRadius: 10,
          color: 'var(--muted)', fontSize: 14,
        }}>
          {emptyMessage}
        </div>
      ) : (
        <ul role="list" className="cards-grid" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {trades.map(trade => (
            <li key={trade.id} style={{ margin: 0 }}>
              <TradeCard
                trade={trade}
                currentUserId={currentUserId}
                onStatusChange={onStatusChange}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function MyTrades() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [trades,              setTrades]              = useState([]);
  const [loading,             setLoading]             = useState(true);
  const [error,               setError]               = useState('');
  const [acceptedTradeModal,  setAcceptedTradeModal]  = useState(null);
  const [activeTab,           setActiveTab]           = useState('active');
  const [historyFilter,       setHistoryFilter]       = useState('all'); // 'all' | 'completed' | 'declined'
  const [guideDismissed,      setGuideDismissed]      = useState(() => localStorage.getItem('barter_trade_guide_dismissed') === 'true');

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchTrades = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyTrades();
      setTrades(data.trades ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { setLoading(false); return; }
    fetchTrades();
  }, [authLoading, currentUser, fetchTrades]);

  useEffect(() => {
    if (authLoading || !currentUser) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect_error', (err) => {
      console.warn('Trade socket connect error:', err.message);
    });

    socket.on('tradeUpdated', (trade) => {
      if (trade.sender_id === currentUser.id || trade.receiver_id === currentUser.id) {
        fetchTrades();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [authLoading, currentUser, fetchTrades]);

  // ── Accept / Decline ─────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (tradeId, newStatus) => {
    if (newStatus === 'refresh') {
      await fetchTrades();
      return;
    }
    let updatedData;
    if (newStatus === TRADE_STATUS.ACCEPTED) {
      updatedData = await acceptTrade(tradeId);
    } else if (newStatus === TRADE_STATUS.DECLINED) {
      updatedData = await declineTrade(tradeId);
    } else {
      // All other status changes (proof flow, etc.) are handled by TradeCard directly.
      // Do NOT allow client-side completion — admin controls that.
      throw new Error(`Unsupported status change from client: ${newStatus}`);
    }

    // Re-fetch so the trade sections reflect the latest status.
    await fetchTrades();

    if (newStatus === TRADE_STATUS.ACCEPTED) {
      setAcceptedTradeModal(updatedData.tradeOffer ?? { id: tradeId });
    }
  }, [fetchTrades]);

  // ── Derived splits ────────────────────────────────────────────────────────
  const userId     = currentUser?.id;

  // Active = pending, accepted, and all proof-based in-progress states
  const activeTrades = trades.filter(t =>
    t.status === TRADE_STATUS.PENDING ||
    t.status === TRADE_STATUS.ACCEPTED ||
    t.status === TRADE_STATUS.PROOF_PENDING ||
    t.status === TRADE_STATUS.AWAITING_ADMIN_VERIFICATION
  );

  const pastTrades = trades.filter(t =>
    t.status === TRADE_STATUS.COMPLETED ||
    t.status === TRADE_STATUS.DECLINED  ||
    t.status === TRADE_STATUS.CANCELLED ||
    t.status === TRADE_STATUS.REJECTED
  );

  const filteredPastTrades = historyFilter === 'all'
    ? pastTrades
    : pastTrades.filter(t => {
        if (historyFilter === 'completed')    return t.status === TRADE_STATUS.COMPLETED;
        if (historyFilter === 'declined')     return t.status === TRADE_STATUS.DECLINED || t.status === TRADE_STATUS.CANCELLED;
        if (historyFilter === 'rejected')     return t.status === TRADE_STATUS.REJECTED;
        return true;
      });

  // Pending verification count (for stat display)
  const pendingVerificationCount = trades.filter(t =>
    t.status === TRADE_STATUS.AWAITING_ADMIN_VERIFICATION
  ).length;

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!authLoading && !currentUser) {
    return (
      <div style={{ background: 'var(--cream)', minHeight: '100vh', width: '100%' }}>
        <div className="mytrades-container">
          <style>{BARTER_CSS}</style>
          <div className="hero"><button type="button" className="hero-back" onClick={() => navigate(-1)} aria-label="Go back">?</button></div>
          <div className="title-card">
            <h1>My Trades</h1>
            <p style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 16, margin: '8px 0 4px' }}>You're not logged in</p>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>Please log in to view your trade offers.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading || authLoading) {
    return (
      <div style={{ background: 'var(--cream)', minHeight: '100vh', width: '100%' }}>
        <div className="mytrades-container" aria-busy="true" aria-label="Loading trades">
          <style>{BARTER_CSS}</style>
          <div className="hero"><button type="button" className="hero-back" onClick={() => navigate(-1)} aria-label="Go back">?</button></div>
          <div className="title-card">
            <h1>My Trades</h1>
            <p>Loading your trade offers...</p>
            <div className="skeleton" style={{ height: 20, width: 150, marginTop: 14 }} />
          </div>
          <div style={{ padding: '0 16px', marginTop: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SkeletonCard /><SkeletonCard />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ background: 'var(--cream)', minHeight: '100vh', width: '100%' }}>
        <div className="mytrades-container">
          <style>{BARTER_CSS}</style>
          <div className="hero"><button type="button" className="hero-back" onClick={() => navigate(-1)} aria-label="Go back">?</button></div>
          <div className="title-card">
            <h1>My Trades</h1>
            <p style={{ fontWeight: 600, color: '#dc2626', margin: '8px 0 4px' }}>Could not load your trades</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>{error}</p>
            <button type="button" onClick={fetchTrades} style={retryBtnStyle}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onFocus={e => (e.currentTarget.style.outline = '2px solid #dc2626')}
              onBlur={e => (e.currentTarget.style.outline = 'none')}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh', width: '100%' }}>
      <div className="mytrades-container">
        <style>{BARTER_CSS}</style>

        {/* Header/Hero */}
        <div className="hero"><button type="button" className="hero-back" onClick={() => navigate(-1)} aria-label="Go back">←</button></div>

        {/* Title Card */}
        <div className="title-card">
          <h1>My Trades</h1>
          <div className="stat-row">
            <div className="stat">
              <b>{activeTrades.length}</b>
              <span>Active</span>
            </div>
            <div className="stat">
              <b>{trades.filter(t => t.status === TRADE_STATUS.COMPLETED).length}</b>
              <span>Completed</span>
            </div>
            {pendingVerificationCount > 0 && (
              <div className="stat">
                <b style={{ color: '#2563eb' }}>{pendingVerificationCount}</b>
                <span>Pending Admin</span>
              </div>
            )}
            <div className="stat">
              <b>{trades.filter(t => t.status === TRADE_STATUS.DECLINED || t.status === TRADE_STATUS.CANCELLED).length}</b>
              <span>Declined</span>
            </div>
          </div>
        </div>

        {/* First-time User Education Banner (Point 7) */}
        {!guideDismissed && (
          <div className="trade-education-banner">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 22 }}>🛡️</span>
              <div>
                <strong style={{ color: 'var(--dark)', fontSize: 14 }}>Secure Exchange Guarantee</strong>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                  Proof submission & admin verification protect both sides of every trade. Meet up safely, take handoff photos, and upload them when ready!
                </p>
              </div>
            </div>
            <button
              type="button"
              className="education-close-btn"
              onClick={() => {
                setGuideDismissed(true);
                localStorage.setItem('barter_trade_guide_dismissed', 'true');
              }}
              aria-label="Dismiss guide"
            >
              ✕
            </button>
          </div>
        )}

        {/* Segmented Tab Control */}
        <div className="segment">
          <button
            type="button"
            className={activeTab === 'active' ? 'on' : ''}
            onClick={() => setActiveTab('active')}
          >
            Active <span className="count">{activeTrades.length}</span>
          </button>
          <button
            type="button"
            className={activeTab === 'history' ? 'on' : ''}
            onClick={() => setActiveTab('history')}
          >
            History <span className="count">{pastTrades.length}</span>
          </button>
        </div>

        {activeTab === 'active' ? (
          <>
            {activeTrades.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
                <p style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 16 }}>No active trades yet</p>
                <p style={{ fontSize: 14, color: 'var(--muted)', margin: '4px 0 16px' }}>
                  Send a trade offer or respond to incoming requests to get the swap started.
                </p>
                <button type="button" onClick={() => navigate('/explore')}
                  style={{ padding: '10px 22px', borderRadius: 14, border: 'none', background: 'var(--dark)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                  Explore Items
                </button>
              </div>
            ) : (
              <>
                <div className="section-label">Needs your attention</div>
                <TradeSection
                  trades={activeTrades}
                  emptyMessage="No active outgoing trades right now."
                  currentUserId={userId}
                  onStatusChange={handleStatusChange}
                />
              </>
            )}
          </>
        ) : (
          <>
            {pastTrades.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
                <p style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 16 }}>No history yet</p>
                <p style={{ fontSize: 14, color: 'var(--muted)', margin: '4px 0' }}>
                  You haven't completed or declined any trades yet.
                </p>
              </div>
            ) : (
              <>
                <div className="section-label">History</div>

                {/* History filter chips */}
                <div style={{ display: 'flex', gap: 8, padding: '0 16px', marginBottom: 12, flexWrap: 'wrap' }}>
                  {[
                    { key: 'all',       label: 'All',      count: pastTrades.length },
                    { key: 'completed', label: 'Completed', count: pastTrades.filter(t => t.status === TRADE_STATUS.COMPLETED).length },
                    { key: 'declined',  label: 'Declined',  count: pastTrades.filter(t => t.status === TRADE_STATUS.DECLINED || t.status === TRADE_STATUS.CANCELLED).length },
                    { key: 'rejected',  label: 'Rejected',  count: pastTrades.filter(t => t.status === TRADE_STATUS.REJECTED).length },
                  ].filter(chip => chip.key === 'all' || chip.key === 'completed' || chip.key === 'declined' || chip.count > 0).map(chip => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setHistoryFilter(chip.key)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 20,
                        border: 'none',
                        background: historyFilter === chip.key ? 'var(--dark)' : 'rgba(15,61,46,0.07)',
                        color: historyFilter === chip.key ? '#fff' : 'var(--muted)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                    >
                      {chip.label}
                      {' '}
                      <span style={{ opacity: 0.7, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>
                        {chip.count}
                      </span>
                    </button>
                  ))}
                </div>

                <TradeSection
                  trades={filteredPastTrades}
                  emptyMessage={historyFilter === 'all' ? "You haven't completed or declined any trades yet." : `No ${historyFilter} trades.`}
                  currentUserId={userId}
                  onStatusChange={handleStatusChange}
                />
              </>
            )}
          </>
        )}

        <div className="footer-space" />

        {/* ── Trade Accepted Success Modal ── */}
        {acceptedTradeModal && (
          <div role="dialog" aria-modal="true" aria-label="Trade accepted"
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 16 }}>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 28, maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
              <span style={{ fontSize: 44 }} aria-hidden="true">🎉</span>
              <h3 style={{ margin: '12px 0 6px', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>Trade Accepted!</h3>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
                Your trade is confirmed. Chat with your trade partner to arrange the exchange.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button type="button" onClick={() => setAcceptedTradeModal(null)}
                  style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                  Stay Here
                </button>
                <button type="button" onClick={() => { const id = acceptedTradeModal.id; setAcceptedTradeModal(null); navigate(`/chat/${id}`); }}
                  style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: 'var(--dark)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                  Open Chat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const retryBtnStyle = {
  padding: '7px 20px', borderRadius: 7,
  border: '1.5px solid var(--line)', background: 'transparent',
  color: 'var(--dark)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
  transition: 'background 0.15s', outline: 'none',
};
