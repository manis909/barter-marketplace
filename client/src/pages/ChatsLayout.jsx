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

const LAYOUT_CSS = `
.chatslayout-sidebar,
.chatslayout-mainpane {
  display: flex;
  flex-direction: column;
}
@media (max-width: 768px) {
  .chatslayout-sidebar { display: none; }
  .chatslayout-mainpane { display: none; }
  .chatslayout-sidebar.mobile-show { display: flex; width: 100% !important; }
  .chatslayout-mainpane.mobile-show { display: flex; width: 100% !important; }
  .chatslayout-root { border-radius: 0 !important; border: none !important; height: 100vh !important; }
}
`;

function initialOf(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

function TrashIcon({ size = 16, color = '#fff' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
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

  const showListOnMobile = !tradeId;
  const showChatOnMobile = !!tradeId;

  return (
    <div className="chatslayout-root" style={layoutStyle}>
      <style>{LAYOUT_CSS}</style>

      {/* LEFT: chat list — this panel's inner list is the ONLY scrollable part on the left */}
      <div
        className={`chatslayout-sidebar ${showListOnMobile ? 'mobile-show' : ''}`}
        style={sidebarStyle}
      >
        <div style={sidebarHeaderStyle}>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            style={sidebarBackBtnStyle}
            aria-label="Back to explore"
          >
            ←
          </button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff' }}>Chats</h2>
        </div>

        <div style={sidebarScrollStyle}>
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
                        <TrashIcon size={16} color="#fff" />
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
      </div>

      {/* RIGHT: chat window — ChatWindow's own internal message list is the ONLY
          scrollable part on the right. Buttons/report/rating stay fixed below it. */}
      <div
        className={`chatslayout-mainpane ${showChatOnMobile ? 'mobile-show' : ''}`}
        style={mainPaneStyle}
      >
        {!tradeId || !selectedTrade ? (
          <div style={emptyMainStyle}>
            <span style={{ fontSize: 40 }}>💬</span>
            <p style={{ color: COLORS.darkGreen, fontWeight: 600, marginTop: 12 }}>
              Select a chat to start messaging
            </p>
          </div>
        ) : (
          <>
            <div style={mainPaneScrollStyle}>
              <div style={{ flex: 1, minHeight: 0, padding: '16px 16px 0', display: 'flex', flexDirection: 'column' }}>
                <ChatWindow tradeOfferId={tradeId} currentUserId={userId} otherUserName={otherUserName} />
              </div>
            </div>

            <div style={mainPaneFooterStyle}>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Fixed height, no overflow — the outer page/root can NEVER scroll
const layoutStyle = {
  display: 'flex',
  height: 'calc(100vh - 80px)', // <-- only this line changed
  maxWidth: 1100,
  margin: '0 auto',
  border: '1px solid #ddd',
  borderRadius: 12,
  overflow: 'hidden',
};

// Sidebar itself doesn't scroll — its inner list does instead
const sidebarStyle = {
  width: 300,
  minWidth: 260,
  background: `linear-gradient(180deg, ${COLORS.darkGreen}, ${COLORS.green})`,
  borderRight: `1px solid ${COLORS.green}`,
  overflow: 'hidden',

  display: 'flex',
  flexDirection: 'column',
  height: '100%',
};

const sidebarHeaderStyle = {
  padding: '18px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.15)',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexShrink: 0,
};

// This is the ONE scrollbar on the left side
const sidebarScrollStyle = {
  flex: 1,
  overflowY: 'auto',
  minHeight: 0,
};

const sidebarBackBtnStyle = {
  width: 30,
  height: 30,
  minWidth: 30,
  borderRadius: '50%',
  border: 'none',
  background: COLORS.lime,
  color: COLORS.darkGreen,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  fontWeight: 700,
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
  cursor: 'pointer', flexShrink: 0, opacity: 0.75,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
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

// Main pane itself doesn't scroll — split into a chat area and a fixed footer below
const mainPaneStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  background: '#fff',
  overflow: 'hidden',
};

// This wraps ChatWindow and stretches to fill space. It does NOT scroll itself —
// ChatWindow's own internal message list is what scrolls (that's the ONE
// scrollbar on the right side).
const mainPaneScrollStyle = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

// Buttons/report/rating: fixed below the chat, always visible, never part
// of the chat's own scroll. Only scrolls itself in the rare case the report
// box + rating form together get taller than 40% of the viewport.
const mainPaneFooterStyle = {
  flexShrink: 0,
  maxHeight: '40vh',
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