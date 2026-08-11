import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMyTrades, submitProof, getTradeProofStatus } from '../services/tradeService';
import { getHiddenChatIds, deleteChatForMe, deleteChatForEveryone } from '../services/chatService';
import { getErrorMessage, fmtDate } from '../utils/helpers';
import { useAuth } from '../features/auth/AuthContext';
import ChatWindow from '../features/chat/ChatWindow';

/* ─── Design tokens ─────────────────────────────────────────────────────── */
const T = {
  bg:           '#F6F5F0',
  surface:      '#FFFFFF',
  text:         '#24231F',
  muted:        '#5F5B52',
  border:       '#E4E2D9',
  accent:       '#3D6E63',
  accentStrong: '#2F5B4D',
  danger:       '#dc2626',
  radiusCard:   '14px',
  radiusCtrl:   '9px',
};
const API_URL = 'http://localhost:5000';

/* ─── Injected CSS ───────────────────────────────────────────────────────── */
const LAYOUT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500&family=Manrope:wght@400;500&display=swap');

/* Zero out app-main padding so the chat fills the viewport exactly */
.app-main:has(.chatslayout-root) {
  padding: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
}

.chatslayout-sidebar, .chatslayout-mainpane { display: flex; flex-direction: column; }

.chatslayout-sidebar-scroll::-webkit-scrollbar { width: 4px; }
.chatslayout-sidebar-scroll::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }

.chatslayout-row {
  display: flex; align-items: center; gap: 10px; padding: 12px 14px;
  cursor: pointer; border-bottom: 1px solid ${T.border};
  transition: background 0.15s, transform 0.15s, border-color 0.15s;
  background: transparent; border-left: 3px solid transparent; box-sizing: border-box;
}
.chatslayout-row:hover { background: ${T.bg}; border-left-color: ${T.accent}; transform: translateY(-1px); }
.chatslayout-row.active { background: #EBF2F0; border-left-color: ${T.accent}; }
.chatslayout-del-opt:hover { background: ${T.bg}; }

/* ── Mobile (< 768px): one panel at a time, full-width ── */
@media (max-width: 767px) {
  /* Root just needs to exist; the active panels handle their own positioning */
  .chatslayout-root {
    border-radius: 0 !important; border: none !important;
    height: calc(100dvh - 80px) !important; height: calc(100vh - 80px) !important;
    max-width: 100vw !important; width: 100vw !important;
    margin: 0 !important; overflow: hidden !important;
  }

  /* Both panels hidden by default */
  .chatslayout-sidebar  { display: none !important; }
  .chatslayout-mainpane { display: none !important; }

  /* Chat list: fills the root normally */
  .chatslayout-sidebar.mobile-show {
    display: flex !important;
    width: 100vw !important; min-width: 0 !important; max-width: 100vw !important;
    height: 100% !important; overflow: hidden !important;
    flex-shrink: 0 !important; border-right: none !important;
  }

  /*
   * Chat window: use position:fixed so it covers the ENTIRE viewport
   * (including the area behind the navbar).  z-index:50 sits above everything
   * else on the page.  This completely removes it from the flex/scroll chain
   * so the navbar height never matters — the panel is always exactly the
   * full screen, header pinned at top, input pinned at bottom.
   */
  .chatslayout-mainpane.mobile-show {
    display: flex !important;
    position: fixed !important;
    inset: 0 !important;
    z-index: 101 !important;      /* above the sticky navbar (z-index: 100)   */
    width: 100vw !important; height: 100dvh !important; height: 100vh !important;
    min-width: 0 !important; max-width: 100vw !important;
    overflow: hidden !important;
    flex-direction: column !important;
    background: ${T.surface} !important;
  }

  /* Prevent any child from creating horizontal overflow */
  .chatslayout-sidebar.mobile-show *,
  .chatslayout-mainpane.mobile-show * {
    max-width: 100% !important; box-sizing: border-box !important;
  }

  .chatslayout-mobile-back { display: flex !important; }
}

/* Ensure the mobile back bar is flush to the top on notched phones */
@media (max-width: 767px) {
  .chatslayout-mainpane.mobile-show .chatslayout-mobile-back {
    padding-top: max(8px, env(safe-area-inset-top)) !important;
  }
}/* ── Desktop (≥ 768px): both panels always visible ── */
@media (min-width: 768px) {
  .chatslayout-sidebar  { display: flex !important; }
  .chatslayout-mainpane { display: flex !important; }
  .chatslayout-mobile-back { display: none !important; }
}

/* ── Desktop header strip (always visible on desktop, hidden on mobile) ── */
@media (max-width: 767px) {
  .cl-desktop-header { display: none !important; }
}
@media (min-width: 768px) {
  .chatslayout-mobile-back { display: none !important; }
}

/* ── Report modal overlay ── */
.cl-report-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 200; display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.cl-report-modal {
  background: ${T.surface}; border-radius: ${T.radiusCard};
  padding: 24px; width: 100%; max-width: 420px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.14);
}
`;

/* ─── Helper components ──────────────────────────────────────────────────── */
function initialOf(n) { return (n || '?').trim().charAt(0).toUpperCase(); }

function Avatar({ name, imageUrl, size = 38 }) {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [imageUrl]);
  const src = imageUrl && !err
    ? (imageUrl.startsWith('http') ? imageUrl : `${API_URL}${imageUrl}`) : null;
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      background: src ? 'transparent' : T.accent, color: '#fff',
      fontWeight: 700, fontSize: size * 0.39, border: `1px solid ${T.border}`,
    }}>
      {src
        ? <img src={src} alt={name} onError={() => setErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : initialOf(name)}
    </span>
  );
}

function TrashIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" />
      <path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function BackArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

/* Proof submission info banner — shown when trade is accepted and
   current user has not yet submitted proof */
function ProofInfoBanner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px', margin: '0',
      background: '#EEF7F2', borderBottom: `1px solid #C9E5D8`,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>ℹ️</span>
      <p style={{ margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.5, fontFamily: 'Manrope, sans-serif' }}>
        <strong style={{ color: T.accent }}>Exchange items in person first.</strong>
        {' '}Then submit photo proof so the admin can verify and complete the trade.
      </p>
    </div>
  );
}

/* System message shown inline in the chat pane when trade is fully complete */
function TradeCompletedBanner({ completedAt }) {
  const label = completedAt ? fmtDate(completedAt) : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', flexShrink: 0 }}>
      <div style={{ flex: 1, height: 1, background: T.border }} />
      <div style={{
        textAlign: 'center', padding: '10px 18px', background: '#EEF7F2',
        border: `1px solid #C9E5D8`, borderRadius: '999px',
        fontFamily: 'Manrope, sans-serif',
      }}>
        <div style={{ fontSize: 15 }}>✅</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: T.accent, marginTop: 2 }}>Trade Completed</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>Both users confirmed the exchange.</div>
        {label && <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>{label}</div>}
      </div>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  );
}

/* ─── Main layout component ─────────────────────────────────────────────── */
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

  /* rating, report */
  const [showRating,   setShowRating]   = useState(false);
  const [showReport,   setShowReport]   = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [otherUserId,  setOtherUserId]  = useState(null);

  /* proof submission */
  const [proofStatus,     setProofStatus]     = useState(null);  // backend response from getTradeProofStatus
  const [showProofModal,  setShowProofModal]  = useState(false);
  const [proofImages,     setProofImages]     = useState([]);    // File[]
  const [proofPreviews,   setProofPreviews]   = useState([]);    // object URL[]
  const [proofNote,       setProofNote]       = useState('');
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [proofError,      setProofError]      = useState('');

  /* ── fetch trades + hidden ids ── */
  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [tradeData, hidden] = await Promise.all([
        getMyTrades(), getHiddenChatIds().catch(() => []),
      ]);
      setTrades(tradeData.trades ?? []);
      setHiddenIds(hidden ?? []);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { setLoading(false); return; }
    fetchAll();
  }, [authLoading, currentUser, fetchAll]);

  /* ── fetch proof status from backend whenever tradeId changes ── */
  const fetchProofStatus = useCallback(async (id) => {
    if (!id) return;
    try {
      const data = await getTradeProofStatus(id);
      setProofStatus(data);
    } catch {
      setProofStatus(null);
    }
  }, []);

  useEffect(() => {
    setProofStatus(null);
    setProofError('');
    if (tradeId) fetchProofStatus(tradeId);
  }, [tradeId, fetchProofStatus]);

  const visibleTrades = trades.filter(t => !hiddenIds.includes(t.id));
  const selectedTrade = visibleTrades.find(t => String(t.id) === String(tradeId));

  const otherUserName = selectedTrade
    ? (selectedTrade.sender_id === userId ? selectedTrade.receiver_username : selectedTrade.sender_username) : '';
  const otherUserImage = selectedTrade
    ? (selectedTrade.sender_id === userId
        ? (selectedTrade.receiver_profile_image || selectedTrade.receiver_avatar || null)
        : (selectedTrade.sender_profile_image  || selectedTrade.sender_avatar   || null))
    : null;

  /* completion state derived from trade fields */
  const isMeSender       = selectedTrade?.sender_id === userId;
  const tradeIsCompleted = selectedTrade?.status === 'completed';
  const tradeIsAccepted  = selectedTrade?.status === 'accepted';
  const tradeIsAwaitingAdmin = selectedTrade?.status === 'awaiting_admin_verification';

  /* proof state — backend is the source of truth via proofStatus */
  const iHaveSubmittedProof = proofStatus
    ? (isMeSender ? proofStatus.sender_proof_submitted : proofStatus.receiver_proof_submitted)
    : false;
  const bothSubmittedProof = proofStatus
    ? (proofStatus.sender_proof_submitted && proofStatus.receiver_proof_submitted)
    : false;
  const showProofBtn =
    tradeIsAccepted &&
    !iHaveSubmittedProof &&
    !tradeIsCompleted &&
    !tradeIsAwaitingAdmin;

  /* ── handlers ── */
  const handleSelectChat = id => navigate(`/chat/${id}`);

  const handleDeleteForMe = async id => {
    setDeleting(true);
    try {
      await deleteChatForMe(id);
      setHiddenIds(p => [...p, id]);
      if (String(id) === String(tradeId)) navigate('/chats');
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setDeleting(false); setDeleteMenuFor(null); }
  };

  const handleMarkComplete = async () => {
    // completeTrade is no longer called from the Chat UI.
    // Trade completion is handled by the Admin after both users submit proof.
  };

  /* ── proof modal helpers ── */
  const handleProofImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setProofImages(prev => [...prev, ...files]);
    setProofPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const handleRemoveProofImage = (idx) => {
    URL.revokeObjectURL(proofPreviews[idx]);
    setProofImages(prev => prev.filter((_, i) => i !== idx));
    setProofPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCloseProofModal = () => {
    setShowProofModal(false);
    setProofImages([]);
    setProofPreviews(prev => { prev.forEach(u => URL.revokeObjectURL(u)); return []; });
    setProofNote('');
    setProofError('');
  };

  const handleSubmitProof = async () => {
    if (proofImages.length === 0) { setProofError('Please add at least one photo.'); return; }
    setProofSubmitting(true);
    setProofError('');
    try {
      await submitProof(tradeId, proofImages, proofNote);
      handleCloseProofModal();
      // Re-fetch proof status — backend is the source of truth
      await fetchProofStatus(tradeId);
      await fetchAll();
    } catch (err) {
      setProofError(
        err?.response?.data?.error || err?.message || 'Failed to submit proof. Please try again.'
      );
    } finally {
      setProofSubmitting(false);
    }
  };

  const handleSubmitReport = async () => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reported_user_id: otherUserId, reason: reportReason }),
    });
    setShowReport(false); setReportReason('');
  };

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

      {/* ══════ LEFT: chat list ══════ */}
      <div className={`chatslayout-sidebar${showListOnMobile ? ' mobile-show' : ''}`} style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <button type="button" onClick={() => navigate('/explore')} style={s.iconBtn} aria-label="Back to explore">
            <BackArrow />
          </button>
          <h2 style={s.sidebarTitle}>Chats</h2>
        </div>

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
                const isSend   = trade.sender_id === userId;
                const name     = isSend ? trade.receiver_username : trade.sender_username;
                const imgField = isSend
                  ? (trade.receiver_profile_image || trade.receiver_avatar || null)
                  : (trade.sender_profile_image   || trade.sender_avatar   || null);
                const isActive   = String(trade.id) === String(tradeId);
                const menuOpen   = deleteMenuFor === trade.id;
                const isComplete = trade.status === 'completed';
                return (
                  <li key={trade.id} style={{ position: 'relative' }}>
                    <div
                      className={`chatslayout-row${isActive ? ' active' : ''}`}
                      onClick={() => handleSelectChat(trade.id)}
                      role="button" tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && handleSelectChat(trade.id)}
                    >
                      <Avatar name={name} imageUrl={imgField} size={38} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={s.rowName}>{name || 'Unknown user'}</span>
                        <span style={s.rowSub}>{trade.requested_item_title}</span>
                        {isComplete && (
                          <span style={s.rowCompletedBadge}>✓ Completed</span>
                        )}
                      </span>
                      <button type="button" aria-label="Delete chat"
                        onClick={e => { e.stopPropagation(); setDeleteMenuFor(menuOpen ? null : trade.id); }}
                        style={s.trashBtn}>
                        <TrashIcon size={15} />
                      </button>
                    </div>
                    {menuOpen && (
                      <div style={s.deleteMenu}>
                        {/* "Delete for everyone" removed from this chat-list menu —
                            deleting the whole thread for both users only happens
                            per-message inside the conversation (ChatWindow.jsx),
                            not from this list-level menu. */}
                        <button className="chatslayout-del-opt" disabled={deleting}
                          onClick={() => handleDeleteForMe(trade.id)} style={s.deleteOpt}>Delete for me</button>
                        <button className="chatslayout-del-opt"
                          onClick={() => setDeleteMenuFor(null)} style={s.deleteOpt}>Cancel</button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ══════ RIGHT: chat window ══════ */}
      <div className={`chatslayout-mainpane${showChatOnMobile ? ' mobile-show' : ''}`} style={s.mainPane}>
        {!tradeId || !selectedTrade ? (
          <div style={s.emptyMain}>
            <span style={{ fontSize: 42 }}>💬</span>
            <p style={s.emptyMainText}>Select a chat to start messaging</p>
          </div>
        ) : (
          <>
            {/* ── Mobile back bar (hidden on desktop via CSS) ── */}
            <div className="chatslayout-mobile-back" style={s.mobileBackBar}>
              <button type="button" onClick={() => navigate('/chats')} style={s.iconBtn} aria-label="Back to chats">
                <BackArrow />
              </button>
              <Avatar name={otherUserName} imageUrl={otherUserImage} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.mobileBackName}>{otherUserName || 'Chat'}</div>
                {/* Online status is driven by ChatWindow's socket — no hardcoded string here */}
              </div>
              {/* Report User button in header — mobile */}
              <button type="button" onClick={() => { setOtherUserId(
                selectedTrade.sender_id === userId ? selectedTrade.receiver_id : selectedTrade.sender_id
              ); setShowReport(true); }} style={s.reportHeaderBtn} aria-label="Report user">
                ⚑
              </button>
            </div>

            {/* ── Desktop header strip (back bar hidden on desktop; this is shown instead) ── */}
            <div className="cl-desktop-header" style={s.desktopHeader}>
              <Avatar name={otherUserName} imageUrl={otherUserImage} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.desktopHeaderName}>{otherUserName || 'Chat'}</div>
                {/* Online status shown only by ChatWindow's socket-aware header */}
              </div>
              {/* Report button in desktop header */}
              <button type="button" onClick={() => { setOtherUserId(
                selectedTrade.sender_id === userId ? selectedTrade.receiver_id : selectedTrade.sender_id
              ); setShowReport(true); }} style={s.reportHeaderBtnDesktop}>
                Report User
              </button>
            </div>

            {/* ── Action bar: View Item + Proof submission ── */}
            <div style={s.actionBar}>
              {selectedTrade.requested_item_id && (
                <button type="button"
                  onClick={() => navigate(`/item/${selectedTrade.requested_item_id}`)}
                  style={s.actionBtnOutline}>
                  🛍 View Item
                </button>
              )}

              {/* Proof button — only for accepted trades where user hasn't submitted yet */}
              {showProofBtn && (
                <button
                  type="button"
                  onClick={() => setShowProofModal(true)}
                  style={{ ...s.actionBtnFill, flexShrink: 0 }}
                >
                  📸 Submit Exchange Proof
                </button>
              )}

              {/* Current user submitted, waiting for other */}
              {tradeIsAccepted && iHaveSubmittedProof && !bothSubmittedProof && !tradeIsAwaitingAdmin && (
                <span style={{ fontSize: 12.5, color: T.accent, fontFamily: 'Manrope, sans-serif', fontWeight: 500 }}>
                  ✓ Proof Submitted · Waiting for other user.
                </span>
              )}

              {/* Both submitted or admin verification in progress */}
              {(bothSubmittedProof || tradeIsAwaitingAdmin) && !tradeIsCompleted && (
                <span style={{ fontSize: 12.5, color: T.muted, fontFamily: 'Manrope, sans-serif', fontWeight: 500 }}>
                  👥 Both users submitted proof · Waiting for admin verification.
                </span>
              )}
            </div>

            {/* Info banner — only for accepted trades where user hasn't submitted proof yet */}
            {tradeIsAccepted && !tradeIsCompleted && !tradeIsAwaitingAdmin && !iHaveSubmittedProof && <ProofInfoBanner />}

            {/* Messages fill area */}
            <div style={s.chatFill}>
              <ChatWindow
                tradeOfferId={tradeId}
                currentUserId={userId}
                otherUserName={otherUserName}
                otherUserImage={otherUserImage}
                otherUserId={selectedTrade.sender_id === userId ? selectedTrade.receiver_id : selectedTrade.sender_id}
                tradeItemTitle={''}
                tradeItemId={null}
                onViewItem={null}
                tradeCompletedAt={tradeIsCompleted ? (selectedTrade.updated_at || null) : null}
                chatLocked={tradeIsCompleted}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Proof submission modal ── */}
      {showProofModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={handleCloseProofModal}
        >
          <div
            style={{
              background: T.surface, borderRadius: T.radiusCard, padding: 24,
              width: '100%', maxWidth: 460, boxSizing: 'border-box',
              maxHeight: '90vh', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontFamily: 'Fraunces, serif', color: T.text }}>
              📸 Submit Exchange Proof
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: T.muted, fontFamily: 'Manrope, sans-serif' }}>
              Upload photos showing the completed exchange. Both users must submit proof before the admin can verify the trade.
            </p>

            {/* Image previews */}
            {proofPreviews.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {proofPreviews.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                    <img
                      src={url}
                      alt={`proof-${idx + 1}`}
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}`, display: 'block' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveProofImage(idx)}
                      style={{
                        position: 'absolute', top: 2, right: 2,
                        width: 20, height: 20, borderRadius: '50%',
                        border: 'none', background: 'rgba(0,0,0,0.6)',
                        color: '#fff', fontSize: 11, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0, lineHeight: 1,
                      }}
                      aria-label="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add photos button */}
            <label style={{
              display: 'inline-block', marginBottom: 12,
              padding: '7px 14px', borderRadius: T.radiusCtrl,
              border: `1px dashed ${T.accent}`, color: T.accent,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Manrope, sans-serif',
            }}>
              + Add Photos
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleProofImagesChange}
              />
            </label>

            {/* Optional note */}
            <textarea
              placeholder="Optional note (e.g. received in good condition)"
              value={proofNote}
              onChange={e => setProofNote(e.target.value)}
              rows={3}
              style={{
                width: '100%', borderRadius: T.radiusCtrl, border: `1px solid ${T.border}`,
                padding: '10px 12px', boxSizing: 'border-box', resize: 'vertical',
                fontFamily: 'Manrope, sans-serif', fontSize: 13.5, color: T.text,
                background: T.surface, marginBottom: 12, display: 'block',
              }}
            />

            {proofError && (
              <p style={{ color: T.danger, fontSize: 13, margin: '0 0 10px', fontFamily: 'Manrope, sans-serif' }}>
                {proofError}
              </p>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={handleCloseProofModal} style={s.secondaryBtn} disabled={proofSubmitting}>
                Cancel
              </button>
              <button
                onClick={handleSubmitProof}
                disabled={proofSubmitting || proofImages.length === 0}
                style={{
                  ...s.ctaBtn,
                  ...(proofImages.length === 0 ? { background: T.border, color: T.muted, cursor: 'default' } : {}),
                }}
              >
                {proofSubmitting ? 'Submitting…' : 'Submit Proof'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report modal ── */}
      {showReport && (
        <div className="cl-report-overlay" onClick={() => setShowReport(false)}>
          <div className="cl-report-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontFamily: 'Fraunces, serif', color: T.text }}>
              Report User
            </h3>
            <textarea
              placeholder="Describe the issue…"
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              rows={4}
              style={{
                width: '100%', borderRadius: T.radiusCtrl, border: `1px solid ${T.border}`,
                padding: '10px 12px', boxSizing: 'border-box', resize: 'vertical',
                fontFamily: 'Manrope, sans-serif', fontSize: 13.5, color: T.text,
                background: T.surface, marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowReport(false)} style={s.secondaryBtn}>Cancel</button>
              <button onClick={handleSubmitReport} style={s.ctaBtn}>Submit Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Style objects ──────────────────────────────────────────────────────── */
const s = {
  layout: {
    display: 'flex', height: 'calc(100dvh - 80px)',
    maxWidth: 1100, width: '100%', margin: '0 auto',
    border: `1px solid ${T.border}`, borderRadius: T.radiusCard,
    overflow: 'hidden', background: T.surface,
    fontFamily: 'Manrope, sans-serif', boxSizing: 'border-box',
  },

  /* ── sidebar ── */
  sidebar: {
    width: '28%', minWidth: 260, maxWidth: 320, background: T.surface,
    borderRight: `1px solid ${T.border}`, overflow: 'hidden',
    display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0,
  },
  sidebarHeader: {
    padding: '16px 14px', borderBottom: `1px solid ${T.border}`,
    display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: T.surface,
  },
  sidebarTitle: { margin: 0, fontSize: 18, fontWeight: 500, fontFamily: 'Fraunces, serif', color: T.text },
  sidebarScroll: { flex: 1, overflowY: 'auto', minHeight: 0 },
  sidebarMuted: { padding: 16, color: T.muted, fontSize: 13, margin: 0 },
  emptyList: { padding: '40px 16px', textAlign: 'center' },
  rowName: {
    display: 'block', fontWeight: 600, fontSize: 13.5, color: T.text,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  rowSub: {
    display: 'block', fontSize: 11.5, color: T.muted, overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2,
  },
  rowCompletedBadge: {
    display: 'inline-block', marginTop: 3, fontSize: 10.5,
    color: T.accent, fontWeight: 600, letterSpacing: 0.2,
  },
  trashBtn: {
    border: 'none', background: 'transparent', color: T.muted, cursor: 'pointer',
    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 4, borderRadius: 6, transition: 'color 0.15s',
  },
  deleteMenu: {
    position: 'absolute', right: 8, top: '90%', zIndex: 10, background: T.surface,
    border: `1px solid ${T.border}`, borderRadius: T.radiusCard,
    display: 'flex', flexDirection: 'column', minWidth: 165, overflow: 'hidden',
  },
  deleteOpt: {
    padding: '10px 14px', border: 'none', background: 'transparent', textAlign: 'left',
    cursor: 'pointer', fontSize: 13, fontWeight: 500, color: T.text,
    fontFamily: 'Manrope, sans-serif', transition: 'background 0.15s',
  },
  iconBtn: {
    width: 32, height: 32, minWidth: 32, borderRadius: '50%',
    border: `1px solid ${T.border}`, background: T.surface, color: T.text,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'border-color 0.15s',
  },

  /* ── main pane ── */
  mainPane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: T.bg,
    overflow: 'hidden',
    minWidth: 0,
    height: '100%',      /* must be explicit so flex children can clamp correctly */
    minHeight: 0,
  },

  /* ── desktop header strip (always visible on desktop, hidden on mobile) ── */
  desktopHeader: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0,
  },
  desktopHeaderName: {
    fontWeight: 600, fontSize: 14.5, color: T.text, fontFamily: 'Fraunces, serif',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2,
  },
  desktopHeaderStatus: { fontSize: 11, color: T.accent, marginTop: 1, fontFamily: 'Manrope, sans-serif' },
  reportHeaderBtnDesktop: {
    padding: '5px 12px', borderRadius: T.radiusCtrl,
    border: `1px solid ${T.border}`, background: 'transparent',
    color: T.muted, fontSize: 12, fontWeight: 500, cursor: 'pointer',
    fontFamily: 'Manrope, sans-serif', flexShrink: 0, transition: 'border-color 0.15s, color 0.15s',
  },

  /* ── mobile back bar ── */
  mobileBackBar: {
    display: 'none', alignItems: 'center', gap: 10, padding: '8px 12px',
    background: T.surface, borderBottom: `1px solid ${T.border}`, flexShrink: 0, minHeight: 56,
  },
  mobileBackName: {
    fontWeight: 600, fontSize: 15, color: T.text, fontFamily: 'Fraunces, serif',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2,
  },
  mobileBackStatus: { fontSize: 11, color: T.accent, marginTop: 1, fontFamily: 'Manrope, sans-serif' },
  reportHeaderBtn: {
    width: 32, height: 32, borderRadius: '50%', border: `1px solid ${T.border}`,
    background: 'transparent', color: T.muted, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0,
  },

  /* ── action bar (View Item + Mark Complete) ── */
  actionBar: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
    borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0, flexWrap: 'wrap',
  },
  actionBtnOutline: {
    padding: '6px 14px', borderRadius: T.radiusCtrl, border: `1px solid ${T.accent}`,
    background: 'transparent', color: T.accent, fontWeight: 600, fontSize: 12.5,
    cursor: 'pointer', fontFamily: 'Manrope, sans-serif', transition: 'background 0.15s',
  },
  actionBtnFill: {
    padding: '6px 14px', borderRadius: T.radiusCtrl, border: 'none',
    background: T.accent, color: '#fff', fontWeight: 600, fontSize: 12.5,
    cursor: 'pointer', fontFamily: 'Manrope, sans-serif', transition: 'background 0.15s',
  },
  actionBtnDisabled: {
    background: T.border, color: T.muted, cursor: 'default',
  },

  /* ── info / waiting banners ── */
  waitingBanner: {
    padding: '7px 14px', background: '#FFF8E6', borderBottom: `1px solid #F5E4B0`,
    fontSize: 12, color: '#7C6514', fontFamily: 'Manrope, sans-serif', flexShrink: 0,
  },

  /* ── chat fill area (takes remaining height) ── */
  chatFill: {
    flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },

  /* ── rating wrap ── */
  ratingWrap: {
    flexShrink: 0, maxHeight: '35vh', overflowY: 'auto',
    padding: '12px 14px', borderTop: `1px solid ${T.border}`, background: T.surface,
  },

  /* ── empty main ── */
  emptyMain: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', background: T.bg,
  },
  emptyMainText: { color: T.muted, fontWeight: 500, marginTop: 12, fontSize: 14 },

  /* ── shared button styles ── */
  ctaBtn: {
    padding: '8px 18px', borderRadius: T.radiusCtrl, border: 'none',
    background: T.accent, color: '#fff', fontWeight: 600, cursor: 'pointer',
    fontSize: 13, fontFamily: 'Manrope, sans-serif', transition: 'background 0.15s',
  },
  secondaryBtn: {
    padding: '8px 18px', borderRadius: T.radiusCtrl, border: `1px solid ${T.border}`,
    background: T.surface, color: T.text, fontWeight: 500, cursor: 'pointer',
    fontSize: 13, fontFamily: 'Manrope, sans-serif', transition: 'border-color 0.15s',
  },
};