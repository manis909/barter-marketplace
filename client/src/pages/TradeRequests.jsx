import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import TradeCard from '../features/trades/TradeCard';
import { getMyTrades, acceptTrade, declineTrade, completeTrade } from '../services/tradeService';
import { getErrorMessage } from '../utils/helpers';
import { TRADE_STATUS } from '../utils/constants';
import { useAuth } from '../features/auth/AuthContext';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    <div aria-hidden="true" style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(16px)' }}>
      <div style={{ height: 32, background: 'rgba(255,255,255,0.55)' }} />
      <div style={{ padding: '18px' }}>
        <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
          <div>
            <div className="skeleton" style={{ height: 10, width: 90, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 16, width: 140 }} />
          </div>
          <div>
            <div className="skeleton" style={{ height: 10, width: 90, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 16, width: 120 }} />
          </div>
        </div>
        <div className="skeleton" style={{ height: 10, width: 100, marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="skeleton" style={{ height: 34, width: 90, borderRadius: 10 }} />
          <div className="skeleton" style={{ height: 34, width: 90, borderRadius: 10 }} />
        </div>
      </div>
    </div>
  );
}

function TradeSection({ title, trades, emptyMessage, currentUserId, onStatusChange }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            {title}
          </p>
          <h2 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 700, color: 'var(--text-h)' }}>
            Incoming offers ({trades.length})
          </h2>
        </div>
      </div>

      {trades.length === 0 ? (
        <div style={{ padding: '32px 24px', borderRadius: 22, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 24px 80px rgba(15,23,42,0.04)' }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-h)' }}>No trade requests yet.</p>
          <p style={{ margin: '10px 0 0', color: 'var(--muted)', fontSize: 14, maxWidth: 540 }}>
            Incoming trade offers will appear here when another user wants to swap items with you.
          </p>
        </div>
      ) : (
        <ul role="list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 18 }}>
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

export default function TradeRequestsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      console.warn('Trade requests socket connect error:', err.message);
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

  const handleStatusChange = useCallback(async (tradeId, newStatus) => {
    if (newStatus === TRADE_STATUS.ACCEPTED) {
      await acceptTrade(tradeId);
    } else if (newStatus === TRADE_STATUS.DECLINED) {
      await declineTrade(tradeId);
    } else if (newStatus === TRADE_STATUS.COMPLETED) {
      await completeTrade(tradeId);
    }
    await fetchTrades();
  }, [fetchTrades]);

  const activeRequests = trades.filter(trade => [TRADE_STATUS.PENDING, TRADE_STATUS.ACCEPTED].includes(trade.status));

  if (!authLoading && !currentUser) {
    return (
      <div style={pageStyle}>
        <div style={heroBox}>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Please log in to view trade requests.</p>
          <button type="button" onClick={() => navigate('/login')} style={primaryBtnStyle}>Sign in</button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <style>{SHIMMER_CSS}</style>
      <div style={headerStyle}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Trade Requests</p>
          <h1 style={{ margin: '10px 0 0', fontSize: 34, fontWeight: 800, color: 'var(--text-h)' }}>
            Incoming offers waiting for your response
          </h1>
        </div>
      </div>

      {loading || authLoading ? (
        <div aria-busy="true" aria-label="Loading trade requests">
          <SkeletonCard />
          <div style={{ height: 18 }} />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div role="alert" style={errorBoxStyle}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Unable to load trade requests</p>
          <p style={{ margin: '10px 0 0', color: 'var(--muted)' }}>{error}</p>
          <button type="button" onClick={fetchTrades} style={primaryBtnStyle}>Retry</button>
        </div>
      ) : (
        <TradeSection
          title="Incoming Trade Requests"
          trades={activeRequests.filter(t => t.receiver_id === currentUser?.id)}
          emptyMessage="No trade requests yet."
          currentUserId={currentUser?.id}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

const pageStyle = {
  padding: '32px 24px', maxWidth: 900, margin: '0 auto', background: '#FBF5EE', minHeight: '100vh', boxSizing: 'border-box',
};

const headerStyle = {
  marginBottom: 32,
  padding: '28px 24px',
  borderRadius: 24,
  background: 'rgba(255,255,255,0.95)',
  border: '1px solid rgba(224,122,95,0.18)',
  boxShadow: '0 24px 60px rgba(208,150,120,0.12)',
};

const heroBox = {
  minHeight: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 18,
  padding: '32px 22px', borderRadius: 24, background: 'rgba(255,255,255,0.76)', border: '1px solid rgba(255,255,255,0.85)', backdropFilter: 'blur(18px)', boxShadow: '0 40px 80px rgba(15,23,42,0.08)',
};

const errorBoxStyle = {
  padding: '28px 24px', borderRadius: 20, background: 'rgba(254,242,242,0.82)', border: '1px solid rgba(251,191,190,0.8)', color: '#991B1B',
};

const primaryBtnStyle = {
  marginTop: 18,
  padding: '12px 22px', borderRadius: 14, border: 'none', background: '#C8624B', color: '#fff', cursor: 'pointer', fontWeight: 700,
};
