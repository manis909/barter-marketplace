import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TradeCard from '../features/trades/TradeCard';
import { getMyTrades, acceptTrade, declineTrade } from '../services/tradeService';
import { getErrorMessage } from '../utils/helpers';
import { TRADE_STATUS } from '../utils/constants';
import { useAuth } from '../features/auth/AuthContext';

// Shimmer animation for skeleton loaders
const SHIMMER_CSS = `
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
.skeleton {
  background: linear-gradient(90deg, var(--border) 25%, var(--code-bg) 50%, var(--border) 75%);
  background-size: 600px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 8px;
}
`;

function SkeletonCard() {
  return (
    <div aria-hidden="true" style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--social-bg)' }}>
      <div style={{ height: 32, background: 'rgba(0,0,0,0.04)' }} />
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
function TradeSection({ title, icon, trades, emptyMessage, currentUserId, onStatusChange }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span aria-hidden="true" style={{ fontSize: 18 }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-h)' }}>{title}</h3>
        <span style={{
          fontSize: 11, fontWeight: 700,
          background: 'var(--border)', color: 'var(--text)',
          borderRadius: 10, padding: '1px 8px', minWidth: 20, textAlign: 'center',
        }}>
          {trades.length}
        </span>
      </div>

      {trades.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '28px 20px',
          border: '1px dashed var(--border)', borderRadius: 10,
          color: 'var(--text)', fontSize: 14,
        }}>
          {emptyMessage}
        </div>
      ) : (
        <ul role="list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {trades.map(trade => (
            <li key={trade.id}>
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

  // ── Accept / Decline ─────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (tradeId, newStatus) => {
    const updatedData = newStatus === TRADE_STATUS.ACCEPTED
      ? await acceptTrade(tradeId)
      : await declineTrade(tradeId);

    // Re-fetch so auto-declined trades and joined titles all update
    await fetchTrades();

    if (newStatus === TRADE_STATUS.ACCEPTED) {
      setAcceptedTradeModal(updatedData.tradeOffer ?? { id: tradeId });
    }
  }, [fetchTrades]);

  // ── Derived splits ────────────────────────────────────────────────────────
  const userId     = currentUser?.id;
  const incoming   = trades.filter(t => t.receiver_id === userId);
  const outgoing   = trades.filter(t => t.sender_id   === userId);

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!authLoading && !currentUser) {
    return (
      <div style={pageStyle}>
        <PageHeader />
        <div style={infoBoxStyle}>
          <span style={{ fontSize: 28 }} aria-hidden="true">🔐</span>
          <p style={{ margin: '8px 0 0', fontWeight: 500, color: 'var(--text-h)' }}>You're not logged in</p>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text)' }}>Please log in to view your trade offers.</p>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading || authLoading) {
    return (
      <div style={pageStyle} aria-busy="true" aria-label="Loading trades">
        <style>{SHIMMER_CSS}</style>
        <PageHeader />
        <div style={{ marginBottom: 32 }}>
          <div className="skeleton" style={{ height: 16, width: 140, marginBottom: 14 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SkeletonCard /><SkeletonCard />
          </div>
        </div>
        <div>
          <div className="skeleton" style={{ height: 16, width: 120, marginBottom: 14 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={pageStyle}>
        <PageHeader />
        <div role="alert" style={{ padding: '24px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', textAlign: 'center' }}>
          <span style={{ fontSize: 28 }} aria-hidden="true">⚠️</span>
          <p style={{ margin: '8px 0 4px', fontWeight: 600, color: '#dc2626' }}>Could not load your trades</p>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text)' }}>{error}</p>
          <button type="button" onClick={fetchTrades} style={retryBtnStyle}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            onFocus={e => (e.currentTarget.style.outline = '2px solid #dc2626')}
            onBlur={e => (e.currentTarget.style.outline = 'none')}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Normal ────────────────────────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <PageHeader />

      {trades.length === 0 ? (
        <div style={{ ...infoBoxStyle, marginTop: 0 }}>
          <span style={{ fontSize: 36 }} aria-hidden="true">🤝</span>
          <p style={{ margin: '10px 0 4px', fontWeight: 600, color: 'var(--text-h)', fontSize: 16 }}>No trades yet</p>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text)', maxWidth: 320 }}>
            Browse items around your campus to start trading.
          </p>
          <button type="button" onClick={() => navigate('/explore')}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            Explore Items
          </button>
        </div>
      ) : (
        <>
          <TradeSection
            title="Trade Requests"
            icon="📥"
            trades={incoming}
            emptyMessage="No trade requests yet."
            currentUserId={userId}
            onStatusChange={handleStatusChange}
          />
          <TradeSection
            title="My Sent Offers"
            icon="📤"
            trades={outgoing}
            emptyMessage="You haven't sent any trade offers."
            currentUserId={userId}
            onStatusChange={handleStatusChange}
          />
        </>
      )}

      {/* ── Trade Accepted Success Modal ── */}
      {acceptedTradeModal && (
        <div role="dialog" aria-modal="true" aria-label="Trade accepted"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 16 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <span style={{ fontSize: 44 }} aria-hidden="true">🎉</span>
            <h3 style={{ margin: '12px 0 6px', fontSize: 20, fontWeight: 700, color: 'var(--text-h)' }}>Trade Accepted!</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
              Your trade is confirmed. Chat with your trade partner to arrange the exchange.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button type="button" onClick={() => setAcceptedTradeModal(null)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                Stay Here
              </button>
              <button type="button" onClick={() => { const id = acceptedTradeModal.id; setAcceptedTradeModal(null); navigate(`/chat/${id}`); }}
                style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                💬 Open Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>My Trades</h2>
      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text)' }}>
        Trade offers you've sent and received
      </p>
    </div>
  );
}

const pageStyle = {
  padding: '32px 24px', maxWidth: 740, margin: '0 auto',
  textAlign: 'left', boxSizing: 'border-box',
};

const infoBoxStyle = {
  textAlign: 'center', padding: '48px 24px',
  border: '1px dashed var(--border)', borderRadius: 10, color: 'var(--text)',
};

const retryBtnStyle = {
  padding: '7px 20px', borderRadius: 7,
  border: '1px solid rgba(239,68,68,0.4)', background: 'transparent',
  color: '#dc2626', cursor: 'pointer', fontSize: 13, fontWeight: 500,
  transition: 'background 0.15s', outline: 'none',
};
