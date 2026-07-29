import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { getMyTrades } from '../services/tradeService';
import { getHiddenChatIds, deleteChatForMe, deleteChatForEveryone } from '../services/chatService';
import { getErrorMessage } from '../utils/helpers';
import { useAuth } from '../features/auth/AuthContext';

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
.chat-username {
  color: #111111 !important;
  font-weight: 700 !important;
}
`;

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

function initialOf(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

export default function Chats() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [trades, setTrades] = useState([]);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteMenuFor, setDeleteMenuFor] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tradeData, hidden] = await Promise.all([
        getMyTrades(),
        getHiddenChatIds().catch(() => []),
      ]);
      setTrades(tradeData.trades ?? []);
      setHiddenIds(hidden ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { setLoading(false); return; }
    fetchAll();
  }, [authLoading, currentUser, fetchAll]);

  const userId = currentUser?.id;

  const visibleTrades = trades.filter(t => !hiddenIds.includes(t.id));

  const handleDeleteForMe = async (tradeId) => {
    setDeleting(true);
    try {
      await deleteChatForMe(tradeId);
      setHiddenIds(prev => [...prev, tradeId]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
      setDeleteMenuFor(null);
    }
  };

  const handleDeleteForEveryone = async (tradeId) => {
    setDeleting(true);
    try {
      await deleteChatForEveryone(tradeId);
      setHiddenIds(prev => [...prev, tradeId]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
      setDeleteMenuFor(null);
    }
  };

  if (!authLoading && !currentUser) {
    return (
      <div style={pageStyle}>
        <PageHeader navigate={navigate} />
        <div style={infoBoxStyle}>
          <span style={{ fontSize: 28 }} aria-hidden="true">🔐</span>
          <p style={{ margin: '8px 0 0', fontWeight: 500, color: 'var(--text-h)' }}>You're not logged in</p>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text)' }}>Please log in to view your chats.</p>
        </div>
      </div>
    );
  }

  if (loading || authLoading) {
    return (
      <div style={pageStyle} aria-busy="true" aria-label="Loading chats">
        <style>{SHIMMER_CSS}</style>
        <PageHeader navigate={navigate} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <PageHeader navigate={navigate} />
        <div role="alert" style={{ padding: 24, borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', textAlign: 'center' }}>
          <span style={{ fontSize: 28 }} aria-hidden="true">⚠️</span>
          <p style={{ margin: '8px 0 4px', fontWeight: 600, color: '#dc2626' }}>Could not load your chats</p>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text)' }}>{error}</p>
          <button type="button" onClick={fetchAll} style={retryBtnStyle}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (visibleTrades.length === 0) {
    return (
      <div style={pageStyle}>
        <style>{SHIMMER_CSS}</style>
        <PageHeader navigate={navigate} />
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

  return (
    <div style={pageStyle}>
      <style>{SHIMMER_CSS}</style>
      <PageHeader navigate={navigate} />
      <ul role="list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visibleTrades.map(trade => {
          const isSender = trade.sender_id === userId;
          const otherUsername = isSender ? trade.receiver_username : trade.sender_username;
          const itemTitle = trade.requested_item_title;
          const menuOpen = deleteMenuFor === trade.id;

          return (
            <li key={trade.id} style={{ position: 'relative' }}>
              <div style={rowWrapperStyle}>
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
                    <span className="chat-username" style={{ display: 'block', fontWeight: 600, fontSize: 14, color: 'var(--text-h)' }}>
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

                <button
                  type="button"
                  aria-label="Delete chat"
                  onClick={() => setDeleteMenuFor(menuOpen ? null : trade.id)}
                  style={deleteIconBtnStyle}
                >
                  <Trash2 size={20} color="#dc2626" strokeWidth={2.5} />
                </button>
              </div>

              {menuOpen && (
                <div style={deleteMenuStyle}>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => handleDeleteForMe(trade.id)}
                    style={deleteMenuOptionStyle}
                  >
                    Delete for me
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => handleDeleteForEveryone(trade.id)}
                    style={{ ...deleteMenuOptionStyle, color: '#dc2626' }}
                  >
                    Delete for everyone
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteMenuFor(null)}
                    style={{ ...deleteMenuOptionStyle, color: 'var(--text)' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PageHeader({ navigate }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <button
        type="button"
        onClick={() => navigate('/explore')}
        aria-label="Go back to Explore"
        style={backBtnStyle}
      >
        ←
      </button>
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

const backBtnStyle = {
  width: 34, height: 34, minWidth: 34, borderRadius: 999,
  border: 'none', background: 'var(--social-bg, #eef1ee)', color: '#0f3d2e',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 18, flexShrink: 0,
};

const rowWrapperStyle = {
  display: 'flex', alignItems: 'center', gap: 8,
};

const rowStyle = {
  flex: 1, display: 'flex', alignItems: 'center', gap: 14,
  padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 12,
  background: 'transparent', cursor: 'pointer', textAlign: 'left',
  transition: 'background 0.15s', fontFamily: 'inherit',
};

const avatarStyle = {
  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 15,
};

const deleteIconBtnStyle = {
  border: '1px solid rgba(220,38,38,0.35)',
  background: 'rgba(220,38,38,0.08)',
  color: '#dc2626',
  borderRadius: 8, width: 38, height: 38, cursor: 'pointer', fontSize: 15,
  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const deleteMenuStyle = {
  position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 10,
  background: 'var(--bg, #fff)', border: '1px solid var(--border)', borderRadius: 10,
  boxShadow: '0 6px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
  minWidth: 160, overflow: 'hidden',
};

const deleteMenuOptionStyle = {
  padding: '10px 14px', border: 'none', background: 'transparent', textAlign: 'left',
  cursor: 'pointer', fontSize: 13.5, fontWeight: 500, color: 'var(--text-h)',
};