import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTrades } from '../services/tradeService';
import { getErrorMessage } from '../utils/helpers';
import { useAuth } from '../features/auth/AuthContext';

// Shimmer animation for skeleton loaders (matches MyTrades.jsx conventions)
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

// Status badge colors — kept local since this page only needs the label + color,
// not the full trade-action logic that TradeCard.jsx owns.
const STATUS_STYLES = {
  pending:   { bg: 'rgba(234,179,8,0.12)',  color: '#a16207', label: 'Pending' },
  accepted:  { bg: 'rgba(22,163,74,0.12)',  color: '#16a34a', label: 'Accepted' },
  declined:  { bg: 'rgba(239,68,68,0.12)',  color: '#dc2626', label: 'Declined' },
  completed: { bg: 'rgba(99,102,241,0.12)', color: '#4f46e5', label: 'Completed' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: 'var(--border)', color: 'var(--text)', label: status };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div aria-hidden="true" style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 12,
    }}>
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 11, width: '60%' }} />
      </div>
      <div className="skeleton" style={{ height: 20, width: 70, borderRadius: 999 }} />
    </div>
  );
}

// Picks the initial letter for the little avatar circle
function initialOf(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

export default function Chats() {
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

  const userId = currentUser?.id;

  // Not logged in
  if (!authLoading && !currentUser) {
    return (
      <div style={pageStyle}>
        <PageHeader />
        <div style={infoBoxStyle}>
          <span style={{ fontSize: 28 }} aria-hidden="true">🔐</span>
          <p style={{ margin: '8px 0 0', fontWeight: 500, color: 'var(--text-h)' }}>You're not logged in</p>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text)' }}>Please log in to view your chats.</p>
        </div>
      </div>
    );
  }

  // Loading
  if (loading || authLoading) {
    return (
      <div style={pageStyle} aria-busy="true" aria-label="Loading chats">
        <style>{SHIMMER_CSS}</style>
        <PageHeader />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div style={pageStyle}>
        <PageHeader />
        <div role="alert" style={{ padding: 24, borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', textAlign: 'center' }}>
          <span style={{ fontSize: 28 }} aria-hidden="true">⚠️</span>
          <p style={{ margin: '8px 0 4px', fontWeight: 600, color: '#dc2626' }}>Could not load your chats</p>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text)' }}>{error}</p>
          <button type="button" onClick={fetchTrades} style={retryBtnStyle}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Empty
  if (trades.length === 0) {
    return (
      <div style={pageStyle}>
        <PageHeader />
        <div style={infoBoxStyle}>
          <span style={{ fontSize: 36 }} aria-hidden="true">💬</span>
          <p style={{ margin: '10px 0 4px', fontWeight: 600, color: 'var(--text-h)', fontSize: 16 }}>No chats yet</p>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text)', maxWidth: 320 }}>
            Chats appear here once you send or receive a trade offer.
          </p>
          <button type="button" onClick={() => navigate('/explore')}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            Explore Items
          </button>
        </div>
      </div>
    );
  }

  // Normal — list every trade as a conversation row
  return (
    <div style={pageStyle}>
      <PageHeader />
      <ul role="list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {trades.map(trade => {
          const isSender = trade.sender_id === userId;
          const otherUsername = isSender ? trade.receiver_username : trade.sender_username;
          // The item at the center of this trade — show the one the other
          // person owns (what was requested), since that's usually the
          // more recognizable anchor for "what is this chat about".
          const itemTitle = trade.requested_item_title;

          return (
            <li key={trade.id}>
              <button
                type="button"
                onClick={() => navigate(`/chat/${trade.id}`)}
                style={rowStyle}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--social-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span aria-hidden="true" style={avatarStyle}>
                  {initialOf(otherUsername)}
                </span>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 14, color: 'var(--text-h)' }}>
                    {otherUsername || 'Unknown user'}
                  </span>
                  <span style={{
                    display: 'block', fontSize: 12.5, color: 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {itemTitle}
                  </span>
                </span>
                <StatusBadge status={trade.status} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PageHeader() {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Chats</h2>
      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text)' }}>
        Conversations from your trade offers
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
  outline: 'none',
};

const rowStyle = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
  padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 12,
  background: 'transparent', cursor: 'pointer', textAlign: 'left',
  transition: 'background 0.15s', fontFamily: 'inherit',
};

const avatarStyle = {
  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 15,
};