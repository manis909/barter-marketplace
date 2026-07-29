import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMyTrades, completeTrade } from '../services/tradeService';
import { getHiddenChatIds, deleteChatForMe, deleteChatForEveryone } from '../services/chatService';
import { getErrorMessage } from '../utils/helpers';
import { useAuth } from '../features/auth/AuthContext';
import ChatWindow from '../features/chat/ChatWindow';
import RatingForm from '../features/ratings/RatingForm';

const COLORS = {
  darkGreen: '#0f3d2e',
  green: '#1b4d3e',
  lightGreen: '#2f6b52',
  lime: '#c6e930',
  limeHover: '#b3d426',
};

function initialOf(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

export default function ChatsLayout() {
  const { tradeId } = useParams();
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const userId = currentUser?.id;

  const [trades, setTrades] = useState([]);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteMenuFor, setDeleteMenuFor] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [showRating, setShowRating] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [otherUserId, setOtherUserId] = useState(null);
  const [completeError, setCompleteError] = useState('');

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

  const visibleTrades = trades.filter(t => !hiddenIds.includes(t.id));
  const selectedTrade = visibleTrades.find(t => String(t.id) === String(tradeId));

  const otherUserName = selectedTrade
    ? (selectedTrade.sender_id === userId ? selectedTrade.receiver_username : selectedTrade.sender_username)
    : '';

  const handleSelectChat = (id) => {
    navigate(`/chat/${id}`);
  };

  const handleDeleteForMe = async (id) => {
    setDeleting(true);
    try {
      await deleteChatForMe(id);
      setHiddenIds(prev => [...prev, id]);
      if (String(id) === String(tradeId)) navigate('/chats');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
      setDeleteMenuFor(null);
    }
  };

  const handleDeleteForEveryone = async (id) => {
    setDeleting(true);
    try {
      await deleteChatForEveryone(id);
      setHiddenIds(prev => [...prev, id]);
      if (String(id) === String(tradeId)) navigate('/chats');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
      setDeleteMenuFor(null);
    }
  };

  const handleMarkComplete = async () => {
    setCompleteError('');
    try {
      const data = await completeTrade(tradeId);
      const trade = data.tradeOffer;
      const otherId = trade.sender_id === userId ? trade.receiver_id : trade.sender_id;
      setOtherUserId(otherId);
      setShowRating(true);
    } catch (err) {
      setCompleteError(err?.response?.data?.error || err?.message || 'Failed to mark trade complete');
    }
  };

  const handleSubmitReport = async () => {
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:5000/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reported_user_id: otherUserId, reason: reportReason })
    });
    setShowReport(false);
    setReportReason('');
  };

  if (!authLoading && !currentUser) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>🔐 You're not logged in. Please log in to view your chats.</p>
      </div>
    );
  }

  return (
    <div style={layoutStyle}>
      <div style={sidebarStyle}>
        <div style={sidebarHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff' }}>Chats</h2>
        </div>

        {loading || authLoading ? (
          <div style={{ padding: 16, color: '#cfe8da' }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 16, color: '#ffb4b4' }}>{error}</div>
        ) : visibleTrades.length === 0 ? (
          <div style={{ padding: 16, color: '#cfe8da' }}>No chats yet</div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {visibleTrades.map(trade => {
              const isSender = trade.sender_id === userId;
              const name = isSender ? trade.receiver_username : trade.sender_username;
              const isActive = String(trade.id) === String(tradeId);
              const menuOpen = deleteMenuFor === trade.id;

              return (
                <li key={trade.id} style={{ position: 'relative' }}>
                  <div
                    onClick={() => handleSelectChat(trade.id)}
                    style={{ ...sidebarRowStyle, background: isActive ? COLORS.lightGreen : 'transparent' }}
                  >
                    <span style={avatarStyle}>{initialOf(name)}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 600, fontSize: 14, color: '#fff' }}>
                        {name || 'Unknown user'}
                      </span>
                      <span style={{
                        display: 'block', fontSize: 12, color: '#cfe8da',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {trade.requested_item_title}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label="Delete chat"
                      onClick={(e) => { e.stopPropagation(); setDeleteMenuFor(menuOpen ? null : trade.id); }}
                      style={sidebarDeleteBtnStyle}
                    >
                      🗑
                    </button>
                  </div>

                  {menuOpen && (
                    <div style={deleteMenuStyle}>
                      <button disabled={deleting} onClick={() => handleDeleteForMe(trade.id)} style={deleteMenuOptionStyle}>Delete for me</button>
                      <button disabled={deleting} onClick={() => handleDeleteForEveryone(trade.id)} style={{ ...deleteMenuOptionStyle, color: '#dc2626' }}>Delete for everyone</button>
                      <button onClick={() => setDeleteMenuFor(null)} style={deleteMenuOptionStyle}>Cancel</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div style={mainPaneStyle}>
        {!tradeId || !selectedTrade ? (
          <div style={emptyMainStyle}>
            <span style={{ fontSize: 40 }}>💬</span>
            <p style={{ color: COLORS.darkGreen, fontWeight: 600, marginTop: 12 }}>
              Select a chat to start messaging
            </p>
          </div>
        ) : (
          <>
            <div style={{ padding: '16px 16px 0' }}>
              <ChatWindow tradeOfferId={tradeId} currentUserId={userId} otherUserName={otherUserName} />
            </div>

            <div style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
              <button onClick={handleMarkComplete} style={ctaButtonStyle}>Mark Trade Complete</button>
              <button onClick={() => setShowReport(!showReport)} style={secondaryButtonStyle}>Report User</button>
            </div>

            {completeError && <p style={{ color: 'red', fontSize: 13, padding: '0 16px' }}>{completeError}</p>}

            {showReport && (
              <div style={{ margin: '0 16px 16px' }}>
                <textarea
                  placeholder="Reason for report"
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #ccc', padding: 8, boxSizing: 'border-box' }}
                />
                <button onClick={handleSubmitReport} style={{ ...ctaButtonStyle, marginTop: 8 }}>Submit Report</button>
              </div>
            )}

            {showRating && (
              <div style={{ margin: '0 16px 16px' }}>
                <RatingForm
                  tradeOfferId={tradeId}
                  revieweeId={otherUserId}
                  onSubmitted={() => setShowRating(false)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const layoutStyle = {
  display: 'flex',
  height: 'calc(100vh - 64px)',
  maxWidth: 1100,
  margin: '0 auto',
  border: '1px solid #ddd',
  borderRadius: 12,
  overflow: 'hidden',
};

const sidebarStyle = {
  width: 300,
  minWidth: 260,
  background: `linear-gradient(180deg, ${COLORS.darkGreen}, ${COLORS.green})`,
  overflowY: 'auto',
  borderRight: `1px solid ${COLORS.green}`,
};

const sidebarHeaderStyle = {
  padding: '18px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.15)',
};

const sidebarRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 14px',
  cursor: 'pointer',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  transition: 'background 0.15s',
};

const avatarStyle = {
  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: COLORS.lime, color: COLORS.darkGreen, fontWeight: 700, fontSize: 15,
};

const sidebarDeleteBtnStyle = {
  border: 'none', background: 'transparent', color: '#fff',
  cursor: 'pointer', fontSize: 13, flexShrink: 0, opacity: 0.75,
};

const deleteMenuStyle = {
  position: 'absolute', right: 8, top: '90%', zIndex: 10,
  background: '#fff', border: '1px solid #ddd', borderRadius: 10,
  boxShadow: '0 6px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
  minWidth: 160, overflow: 'hidden',
};

const deleteMenuOptionStyle = {
  padding: '10px 14px', border: 'none', background: 'transparent', textAlign: 'left',
  cursor: 'pointer', fontSize: 13.5, fontWeight: 500, color: '#111',
};

const mainPaneStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  background: '#fff',
  overflowY: 'auto',
};

const emptyMainStyle = {
  flex: 1, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(135deg, #f4f9f6, #eaf4ee)',
};

const ctaButtonStyle = {
  padding: '9px 18px', borderRadius: 999, border: 'none',
  background: COLORS.lime, color: COLORS.darkGreen, fontWeight: 700,
  cursor: 'pointer', fontSize: 13.5,
};

const secondaryButtonStyle = {
  padding: '9px 18px', borderRadius: 999, border: `1px solid ${COLORS.darkGreen}`,
  background: 'transparent', color: COLORS.darkGreen, fontWeight: 700,
  cursor: 'pointer', fontSize: 13.5,
};