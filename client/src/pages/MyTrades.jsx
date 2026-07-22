import { useState, useEffect, useCallback } from 'react';
import TradeCard from '../features/trades/TradeCard';
import { getMyTrades, acceptTrade, declineTrade } from '../services/tradeService';
import { getErrorMessage } from '../utils/helpers';
import { TRADE_STATUS } from '../utils/constants';
import { useAuth } from '../features/auth/AuthContext';

const FILTERS = ['all', 'pending', 'accepted', 'declined'];

// Pulse keyframe injected once — used by skeleton loaders
const PULSE_CSS = `@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }`;

export default function MyTrades() {
  const { currentUser, loading: authLoading } = useAuth();

  const [trades, setTrades]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState('all');

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

  // Fetch once auth has resolved and a user is present.
  // If auth is still loading we wait; if nobody is logged in we skip the call.
  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      setLoading(false);
      return;
    }
    fetchTrades();
  }, [authLoading, currentUser, fetchTrades]);

  // ── Accept / Decline ─────────────────────────────────────────────────────
  // Called by TradeCard — must return a Promise so the card can track in-flight state.
  // On success we update that single trade in state using the server's response
  // instead of mutating locally, so the UI always reflects the real DB state.
  async function handleStatusChange(tradeId, newStatus) {
    const updatedData = newStatus === TRADE_STATUS.ACCEPTED
      ? await acceptTrade(tradeId)
      : await declineTrade(tradeId);

    setTrades(prev =>
      prev.map(t => (t.id === tradeId ? updatedData.tradeOffer : t))
    );
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const filtered = filter === 'all'
    ? trades
    : trades.filter(t => t.status === filter);

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!authLoading && !currentUser) {
    return (
      <div style={pageStyle}>
        <h2 style={{ marginTop: 0 }}>My Trades</h2>
        <p style={{ color: 'var(--text)' }}>Please log in to view your trades.</p>
      </div>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading || authLoading) {
    return (
      <div style={pageStyle} aria-busy="true" aria-label="Loading trades">
        <h2 style={{ marginTop: 0 }}>My Trades</h2>
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
        <h2 style={{ marginTop: 0 }}>My Trades</h2>
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
            Could not load your trades
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 14 }}>{error}</p>
          <button
            type="button"
            onClick={fetchTrades}
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
      <h2 style={{ marginTop: 0 }}>My Trades</h2>

      {/* Filter tabs */}
      <div
        role="group"
        aria-label="Filter trades by status"
        style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}
      >
        {FILTERS.map(f => {
          const count = f === 'all'
            ? trades.length
            : trades.filter(t => t.status === f).length;

          return (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 14px',
                borderRadius: 20,
                border: '1px solid var(--border)',
                background: filter === f ? 'var(--accent-bg)' : 'transparent',
                color: filter === f ? 'var(--accent)' : 'var(--text-h)',
                cursor: 'pointer',
                fontSize: 14,
                textTransform: 'capitalize',
                fontWeight: filter === f ? 600 : 400,
                outline: 'none',
              }}
              onFocus={e => (e.currentTarget.style.outline = '2px solid var(--accent)')}
              onBlur={e => (e.currentTarget.style.outline = 'none')}
            >
              {f}
              <span
                aria-label={`${count} trade${count !== 1 ? 's' : ''}`}
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  background: filter === f ? 'var(--accent)' : 'var(--border)',
                  color: filter === f ? '#fff' : 'var(--text)',
                  borderRadius: 10,
                  padding: '1px 6px',
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
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            border: '1px dashed var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
          }}
        >
          <p style={{ fontSize: 32, margin: '0 0 8px' }} aria-hidden="true">🤝</p>
          <p style={{ margin: '0 0 4px', fontWeight: 500, color: 'var(--text-h)' }}>
            No {filter === 'all' ? '' : filter} trades yet
          </p>
          <p style={{ margin: 0, fontSize: 14 }}>
            {filter === 'all'
              ? 'When you send or receive trade offers they will appear here.'
              : `You have no ${filter} trades.`}
          </p>
        </div>
      ) : (
        <ul
          role="list"
          aria-label="Trade offers"
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
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

const pageStyle = {
  padding: '32px 24px',
  maxWidth: 720,
  margin: '0 auto',
  textAlign: 'left',
  boxSizing: 'border-box',
};
