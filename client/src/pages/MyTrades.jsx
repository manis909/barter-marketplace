import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TradeCard from '../features/trades/TradeCard';
import { getMyTrades, acceptTrade, declineTrade } from '../services/tradeService';
import { getErrorMessage } from '../utils/helpers';
import { TRADE_STATUS } from '../utils/constants';
import { useAuth } from '../features/auth/AuthContext';

const FILTERS = ['all', 'pending', 'accepted', 'declined'];

// Shimmer animation — more modern than simple opacity pulse
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
        padding: '18px 20px',
        background: 'var(--social-bg)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div className="skeleton" style={{ height: 16, width: '55%' }} />
        <div className="skeleton" style={{ height: 22, width: 72, borderRadius: 20 }} />
      </div>
      <div className="skeleton" style={{ height: 12, width: '25%', marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 32, width: 88, borderRadius: 7 }} />
    </div>
  );
}

export default function MyTrades() {
  const { currentUser, loading: authLoading } = useAuth();

  const [trades, setTrades]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState('all');

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

  const navigate = useNavigate();

  const handleStatusChange = useCallback(async (tradeId, newStatus) => {
    const updatedData = newStatus === TRADE_STATUS.ACCEPTED
      ? await acceptTrade(tradeId)
      : await declineTrade(tradeId);
    setTrades(prev =>
      prev.map(t => (t.id === tradeId ? updatedData.tradeOffer : t))
    );
    if (newStatus === TRADE_STATUS.ACCEPTED) {
      navigate(`/chat/${tradeId}`);
    }
  }, [navigate]);

  const filtered = filter === 'all'
    ? trades
    : trades.filter(t => t.status === filter);

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!authLoading && !currentUser) {
    return (
      <div style={pageStyle}>
        <PageHeader />
        <div style={infoBoxStyle}>
          <span style={{ fontSize: 28 }} aria-hidden="true">🔐</span>
          <p style={{ margin: '8px 0 0', fontWeight: 500, color: 'var(--text-h)' }}>
            You're not logged in
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text)' }}>
            Please log in to view your trade offers.
          </p>
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
        <PageHeader />
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
            Could not load your trades
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text)' }}>{error}</p>
          <button
            type="button"
            onClick={fetchTrades}
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
      <PageHeader />

      {/* Filter pills */}
      <div
        role="group"
        aria-label="Filter trades by status"
        style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}
      >
        {FILTERS.map(f => {
          const count = f === 'all'
            ? trades.length
            : trades.filter(t => t.status === f).length;
          const active = filter === f;

          return (
            <button
              key={f}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 16px',
                borderRadius: 24,
                border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                background: active ? 'var(--accent-bg)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-h)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: active ? 700 : 400,
                textTransform: 'capitalize',
                outline: 'none',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--social-bg)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              onFocus={e => (e.currentTarget.style.outline = '2px solid var(--accent)')}
              onBlur={e => (e.currentTarget.style.outline = 'none')}
            >
              {f}
              <span
                aria-label={`${count} trade${count !== 1 ? 's' : ''}`}
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  background: active ? 'var(--accent)' : 'var(--border)',
                  color: active ? '#fff' : 'var(--text)',
                  borderRadius: 10,
                  padding: '1px 7px',
                  minWidth: 20,
                  textAlign: 'center',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div style={infoBoxStyle}>
          <span style={{ fontSize: 36 }} aria-hidden="true">🤝</span>
          <p style={{ margin: '10px 0 4px', fontWeight: 600, color: 'var(--text-h)', fontSize: 16 }}>
            No {filter === 'all' ? '' : filter + ' '}trades yet
          </p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', maxWidth: 300 }}>
            {filter === 'all'
              ? 'Trade offers you send or receive will appear here.'
              : `You have no ${filter} trades right now.`}
          </p>
        </div>
      ) : (
        <ul
          role="list"
          aria-label="Trade offers"
          style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          {filtered.map(trade => (
            <li key={trade.id}>
              <TradeCard
                trade={trade}
                currentUserId={currentUser.id}
                onStatusChange={handleStatusChange}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>My Trades</h2>
      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text)' }}>
        Trade offers you've sent and received
      </p>
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
