import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMyTrades, completeTrade } from '../services/tradeService';
import { getHiddenChatIds, deleteChatForMe, deleteChatForEveryone } from '../services/chatService';
import { getErrorMessage } from '../utils/helpers';
import { useAuth } from '../features/auth/AuthContext';
import ChatWindow from '../features/chat/ChatWindow';
import RatingForm from '../features/ratings/RatingForm';

/* ─── Design tokens (mirrors App.css variables) ─────────────────────────── */
const T = {
  bg:            '#F6F5F0',
  surface:       '#FFFFFF',
  text:          '#24231F',
  muted:         '#5F5B52',
  border:        '#E4E2D9',
  accent:        '#3D6E63',
  accentStrong:  '#2F5B4D',
  danger:        '#dc2626',
  radiusCard:    '14px',
  radiusControl: '9px',
};

const API_URL = 'http://localhost:5000';

/* ─── Injected CSS (media queries + class helpers) ───────────────────────── */
const LAYOUT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500&family=Manrope:wght@400;500&display=swap');

/*
  Override app-main padding for the chat page only.
  app-main normally has padding: 20px 0 40px (desktop) / 16px 0 32px (mobile).
  The chat layout must fill exactly the remaining viewport height — padding
  breaks that, so we zero it out here and compensate in the height calc.
*/
.app-main:has(.chatslayout-root) {
  padding: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
}

/* Base panel flex direction */
.chatslayout-sidebar,
.chatslayout-mainpane {
  display: flex;
  flex-direction: column;
}

/* Scrollbar polish */
.chatslayout-sidebar-scroll::-webkit-scrollbar { width: 4px; }
.chatslayout-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
.chatslayout-sidebar-scroll::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }

/* Row hover — border shift + lift, no shadow */
.chatslayout-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  border-bottom: 1px solid ${T.border};
  transition: background 0.15s, transform 0.15s, border-color 0.15s;
  background: transparent;
  border-left: 3px solid transparent;
  box-sizing: border-box;
}
.chatslayout-row:hover {
  background: ${T.bg};
  border-left-color: ${T.accent};
  transform: translateY(-1px);
}
.chatslayout-row.active {
  background: #EBF2F0;
  border-left-color: ${T.accent};
}

/* Delete menu button hover */
.chatslayout-del-opt:hover { background: ${T.bg}; }

/* ── Mobile: single-panel view (< 768px) ── */
@media (max-width: 767px) {
  .chatslayout-root {
    border-radius: 0 !important;
    border: none !important;
    /* app-main padding is zeroed by :has() above; use full remaining viewport */
    height: calc(100dvh - 80px) !important;
    height: calc(100vh - 80px) !important;
    max-width: 100% !important;
    margin: 0 !important;
    overflow: hidden !important;
  }
  .chatslayout-sidebar  { display: none !important; }
  .chatslayout-mainpane { display: none !important; }
  .chatslayout-sidebar.mobile-show {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    height: 100% !important;
    overflow: hidden !important;
  }
  .chatslayout-mainpane.mobile-show {
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    height: 100% !important;
    overflow: hidden !important;
    flex-direction: column !important;
  }
  .chatslayout-sidebar *,
  .chatslayout-mainpane * { max-width: 100%; box-sizing: border-box; }
  .chatslayout-mobile-back { display: flex !important; }
}

/* ── Desktop: always show both panels ── */
@media (min-width: 768px) {
  .chatslayout-sidebar  { display: flex !important; }
  .chatslayout-mainpane { display: flex !important; }
  .chatslayout-mobile-back { display: none !important; }
}
`;

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function initialOf(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

/** Shows profile_image if available, else a lettered circle. */
function Avatar({ name, imageUrl, size = 38 }) {
  const [imgError, setImgError] = useState(false);
  const src = imageUrl && !imgError
    ? (imageUrl.startsWith('http') ? imageUrl : `${API_URL}${imageUrl}`)
    : null;

  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      background: src ? 'transparent' : T.accent,
      color: '#fff',
      fontWeight: 700,
      fontSize: size * 0.39,
      border: `1px solid ${T.border}`,
    }}>
      {src
        ? <img
            src={src}
            alt={name}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        : initialOf(name)
      }
    </span>
  );
}

function TrashIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function ChatsLayout() {
  const { tradeId } = useParams();
  const navigate    = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const userId = currentUser?.id;

  const [trades,        setTrades]        = useState([]);
  const [hiddenIds,     setHiddenIds]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [deleteMenuFor, setDeleteMenuFor] = useState(null);
  const [deleting,      setDeleting]      = useState(false);

  const [showRating,    setShowRating]    = useState(false);
  const [showReport,    setShowReport]    = useState(false);
  const [reportReason,  setReportReason]  = useState('');
  const [otherUserId,   setOtherUserId]   = useState(null);
  const [completeError, setCompleteError] = useState('');

  /* ── data fetching ── */
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

  /* ── derived state ── */
  const visibleTrades  = trades.filter(t => !hiddenIds.includes(t.id));
  const selectedTrade  = visibleTrades.find(t => String(t.id) === String(tradeId));

  const otherUserName = selectedTrade
    ? (selectedTrade.sender_id === userId
        ? selectedTrade.receiver_username
        : selectedTrade.sender_username)
    : '';

  /* Profile image for the selected trade's other user */
  const otherUserImage = selectedTrade
    ? (selectedTrade.sender_id === userId
        ? (selectedTrade.receiver_profile_image || selectedTrade.receiver_avatar || null)
        : (selectedTrade.sender_profile_image  || selectedTrade.sender_avatar   || null))
    : null;

  /* ── handlers (business logic unchanged) ── */
  const handleSelectChat = (id) => navigate(`/chat/${id}`);

  const handleDeleteForMe = async (id) => {
    setDeleting(true);
    try {
      await deleteChatForMe(id);
      setHiddenIds(prev => [...prev, id]);
      if (String(id) === String(tradeId)) navigate('/chats');
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setDeleting(false); setDeleteMenuFor(null); }
  };

  const handleDeleteForEveryone = async (id) => {
    setDeleting(true);
    try {
      await deleteChatForEveryone(id);
      setHiddenIds(prev => [...prev, id]);
      if (String(id) === String(tradeId)) navigate('/chats');
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setDeleting(false); setDeleteMenuFor(null); }
  };

  const handleMarkComplete = async () => {
    setCompleteError('');
    try {
      const data  = await completeTrade(tradeId);
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
    await fetch(`${API_URL}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reported_user_id: otherUserId, reason: reportReason }),
    });
    setShowReport(false);
    setReportReason('');
  };

  /* ── auth guard ── */
  if (!authLoading && !currentUser) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Manrope, sans-serif' }}>
        <p style={{ color: T.text }}>🔐 You're not logged in. Please log in to view your chats.</p>
      </div>
    );
  }

  const showListOnMobile = !tradeId;
  const showChatOnMobile = !!tradeId;

  return (
    <div className="chatslayout-root" style={s.layout}>
      <style>{LAYOUT_CSS}</style>

      {/* ══ LEFT: chat list ══ */}
      <div
        className={`chatslayout-sidebar ${showListOnMobile ? 'mobile-show' : ''}`}
        style={s.sidebar}
      >
        {/* Sidebar header */}
        <div style={s.sidebarHeader}>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            style={s.iconBtn}
            aria-label="Back to explore"
          >
            <BackArrow />
          </button>
          <h2 style={s.sidebarTitle}>Chats</h2>
        </div>

        {/* Scrollable list */}
        <div className="chatslayout-sidebar-scroll" style={s.sidebarScroll}>
          {loading || authLoading ? (
            <p style={s.sidebarMuted}>Loading…</p>
          ) : error ? (
            <p style={{ ...s.sidebarMuted, color: '#f87171' }}>{error}</p>
          ) : visibleTrades.length === 0 ? (
            <div style={s.emptyList}>
              <span style={{ fontSize: 32 }}>💬</span>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: T.muted }}>No chats yet</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {visibleTrades.map(trade => {
                const isSender  = trade.sender_id === userId;
                const name      = isSender ? trade.receiver_username : trade.sender_username;
                const imgField  = isSender
                  ? (trade.receiver_profile_image || trade.receiver_avatar || null)
                  : (trade.sender_profile_image   || trade.sender_avatar   || null);
                const isActive  = String(trade.id) === String(tradeId);
                const menuOpen  = deleteMenuFor === trade.id;

                return (
                  <li key={trade.id} style={{ position: 'relative' }}>
                    <div
                      className={`chatslayout-row${isActive ? ' active' : ''}`}
                      onClick={() => handleSelectChat(trade.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && handleSelectChat(trade.id)}
                    >
                      <Avatar name={name} imageUrl={imgField} size={38} />

                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={s.rowName}>{name || 'Unknown user'}</span>
                        <span style={s.rowSub}>{trade.requested_item_title}</span>
                      </span>

                      <button
                        type="button"
                        aria-label="Delete chat"
                        onClick={e => { e.stopPropagation(); setDeleteMenuFor(menuOpen ? null : trade.id); }}
                        style={s.trashBtn}
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>

                    {menuOpen && (
                      <div style={s.deleteMenu}>
                        <button
                          className="chatslayout-del-opt"
                          disabled={deleting}
                          onClick={() => handleDeleteForMe(trade.id)}
                          style={s.deleteOpt}
                        >
                          Delete for me
                        </button>
                        <button
                          className="chatslayout-del-opt"
                          disabled={deleting}
                          onClick={() => handleDeleteForEveryone(trade.id)}
                          style={{ ...s.deleteOpt, color: T.danger }}
                        >
                          Delete for everyone
                        </button>
                        <button
                          className="chatslayout-del-opt"
                          onClick={() => setDeleteMenuFor(null)}
                          style={s.deleteOpt}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ══ RIGHT: chat window ══ */}
      <div
        className={`chatslayout-mainpane ${showChatOnMobile ? 'mobile-show' : ''}`}
        style={s.mainPane}
      >
        {!tradeId || !selectedTrade ? (
          /* Empty state */
          <div style={s.emptyMain}>
            <span style={{ fontSize: 42 }}>💬</span>
            <p style={s.emptyMainText}>Select a chat to start messaging</p>
          </div>
        ) : (
          <>
            {/* Mobile-only back bar — hidden on desktop via media query */}
            <div className="chatslayout-mobile-back" style={s.mobileBackBar}>
              <button
                type="button"
                onClick={() => navigate('/chats')}
                style={s.iconBtn}
                aria-label="Back to chat list"
              >
                <BackArrow />
              </button>
              {/* Avatar + name — shown ONCE, only on mobile */}
              <Avatar name={otherUserName} imageUrl={otherUserImage} size={32} />
              <span style={s.mobileBackName}>{otherUserName || 'Chat'}</span>
            </div>

            {/* ChatWindow fill area */}
            <div style={s.mainPaneScroll}>
              <div style={s.chatWindowWrap}>
                {/*
                  Pass hideHeader=true so ChatWindow does NOT render its own
                  header (which would duplicate the name already shown above
                  in the mobile back bar, or in the desktop right-pane header).
                  On desktop the name is shown in the desktop header strip below.
                */}
                <ChatWindow
                  tradeOfferId={tradeId}
                  currentUserId={userId}
                  otherUserName={otherUserName}
                  otherUserImage={otherUserImage}
                  hideHeader={false}
                />
              </div>
            </div>

            {/* Footer: Mark Complete / Report / Rating */}
            <div style={s.mainPaneFooter}>
              <div style={s.footerBtnRow}>
                <button onClick={handleMarkComplete} style={s.ctaBtn}>
                  Mark Trade Complete
                </button>
                <button onClick={() => setShowReport(!showReport)} style={s.secondaryBtn}>
                  Report User
                </button>
              </div>

              {completeError && (
                <p style={{ color: T.danger, fontSize: 13, padding: '0 16px', margin: '4px 0 0' }}>
                  {completeError}
                </p>
              )}

              {showReport && (
                <div style={{ margin: '0 16px 16px' }}>
                  <textarea
                    placeholder="Reason for report"
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    style={{
                      width: '100%', borderRadius: T.radiusControl,
                      border: `1px solid ${T.border}`, padding: 8,
                      boxSizing: 'border-box', resize: 'vertical',
                      fontFamily: 'Manrope, sans-serif', fontSize: 13,
                      color: T.text, background: T.surface,
                    }}
                  />
                  <button
                    onClick={handleSubmitReport}
                    style={{ ...s.ctaBtn, marginTop: 8 }}
                  >
                    Submit Report
                  </button>
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

/* ─── SVG back arrow ─────────────────────────────────────────────────────── */
function BackArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

/* ─── Style objects ──────────────────────────────────────────────────────── */
const s = {
  layout: {
    display: 'flex',
    /*
      Navbar is sticky and ~80px tall (56px min-height + 2×12px padding).
      app-main padding is zeroed via the :has() CSS rule above.
      Use 100dvh for mobile browsers that adjust for the address bar.
    */
    height: 'calc(100dvh - 80px)',
    maxWidth: 1100,
    margin: '0 auto',
    border: `1px solid ${T.border}`,
    borderRadius: T.radiusCard,
    overflow: 'hidden',
    background: T.surface,
    fontFamily: 'Manrope, sans-serif',
  },

  /* ── Sidebar ── */
  sidebar: {
    width: '28%',
    minWidth: 260,
    maxWidth: 320,
    background: T.surface,
    borderRight: `1px solid ${T.border}`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    flexShrink: 0,
  },
  sidebarHeader: {
    padding: '16px 14px',
    borderBottom: `1px solid ${T.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
    background: T.surface,
  },
  sidebarTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 500,
    fontFamily: 'Fraunces, serif',
    color: T.text,
  },
  sidebarScroll: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
  },
  sidebarMuted: {
    padding: 16,
    color: T.muted,
    fontSize: 13,
    margin: 0,
  },
  emptyList: {
    padding: '40px 16px',
    textAlign: 'center',
  },

  /* ── Sidebar row parts ── */
  rowName: {
    display: 'block',
    fontWeight: 600,
    fontSize: 13.5,
    color: T.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowSub: {
    display: 'block',
    fontSize: 11.5,
    color: T.muted,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginTop: 2,
  },
  trashBtn: {
    border: 'none',
    background: 'transparent',
    color: T.muted,
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: 6,
    transition: 'color 0.15s',
  },

  /* ── Delete menu ── */
  deleteMenu: {
    position: 'absolute',
    right: 8,
    top: '90%',
    zIndex: 10,
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: T.radiusCard,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 165,
    overflow: 'hidden',
  },
  deleteOpt: {
    padding: '10px 14px',
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: T.text,
    fontFamily: 'Manrope, sans-serif',
    transition: 'background 0.15s',
  },

  /* ── Icon button (back arrow, etc.) ── */
  iconBtn: {
    width: 32,
    height: 32,
    minWidth: 32,
    borderRadius: '50%',
    border: `1px solid ${T.border}`,
    background: T.surface,
    color: T.text,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'border-color 0.15s, transform 0.15s',
  },

  /* ── Main pane ── */
  mainPane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: T.bg,
    overflow: 'hidden',
  },
  mainPaneScroll: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },  chatWindowWrap: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    /* No padding here — padding breaks height:100% on the child cw-container.
       Spacing is handled by cw-container's own border/margin. */
  },

  /* ── Footer ── */
  mainPaneFooter: {
    flexShrink: 0,
    maxHeight: '40vh',
    overflowY: 'auto',
    borderTop: `1px solid ${T.border}`,
    background: T.surface,
  },
  footerBtnRow: {
    display: 'flex',
    gap: 8,
    padding: '12px 16px',
    flexWrap: 'wrap',
  },

  /* ── Buttons ── */
  ctaBtn: {
    padding: '8px 18px',
    borderRadius: T.radiusControl,
    border: 'none',
    background: T.accent,
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'Manrope, sans-serif',
    transition: 'background 0.15s, transform 0.15s',
  },
  secondaryBtn: {
    padding: '8px 18px',
    borderRadius: T.radiusControl,
    border: `1px solid ${T.border}`,
    background: T.surface,
    color: T.text,
    fontWeight: 500,
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'Manrope, sans-serif',
    transition: 'border-color 0.15s, transform 0.15s',
  },

  /* ── Empty main state ── */
  emptyMain: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: T.bg,
  },
  emptyMainText: {
    color: T.muted,
    fontWeight: 500,
    marginTop: 12,
    fontSize: 14,
  },

  /* ── Mobile back bar (hidden on desktop via CSS) ── */
  mobileBackBar: {
    display: 'none',           /* CSS class overrides to flex on mobile */
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    background: T.surface,
    borderBottom: `1px solid ${T.border}`,
    flexShrink: 0,
  },
  mobileBackName: {
    fontWeight: 600,
    fontSize: 15,
    color: T.text,
    fontFamily: 'Fraunces, serif',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
