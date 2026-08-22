import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMySkillBookings, getHiddenSkillBookingIds, hideSkillBookingChat } from '../services/skillBookingService';
import api from '../services/api';
import { useAuth } from '../features/auth/AuthContext';
import SkillBookingChatWindow from '../features/chat/SkillBookingChatWindow';
import ReportModal from '../components/ReportModal';

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

const LAYOUT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500&family=Manrope:wght@400;500&display=swap');

.app-main:has(.skillchatslayout-root) {
  padding: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
}

.skillchatslayout-sidebar, .skillchatslayout-mainpane { display: flex; flex-direction: column; }
.skillchatslayout-sidebar-scroll::-webkit-scrollbar { width: 4px; }
.skillchatslayout-sidebar-scroll::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }

.skillchatslayout-row {
  display: flex; align-items: center; gap: 10px; padding: 12px 14px;
  cursor: pointer; border-bottom: 1px solid ${T.border};
  transition: background 0.15s, transform 0.15s, border-color 0.15s;
  background: transparent; border-left: 3px solid transparent; box-sizing: border-box;
}
.skillchatslayout-row:hover { background: ${T.bg}; border-left-color: ${T.accent}; transform: translateY(-1px); }
.skillchatslayout-row.active { background: #EBF2F0; border-left-color: ${T.accent}; }
.skillchatslayout-del-opt:hover { background: ${T.bg}; }

@media (max-width: 767px) {
  .skillchatslayout-root {
    border-radius: 0 !important; border: none !important;
    height: calc(100vh - 80px) !important;
    height: calc(100dvh - 80px) !important;
    height: calc(var(--vv-height, 100dvh) - 80px) !important;
    max-width: 100% !important; width: 100% !important;
    margin: 0 !important; overflow: hidden !important;
    overscroll-behavior: contain !important;
  }
  .skillchatslayout-sidebar  { display: none !important; }
  .skillchatslayout-mainpane { display: none !important; }
  .skillchatslayout-sidebar.mobile-show {
    display: flex !important;
    width: 100% !important; min-width: 0 !important; max-width: 100% !important;
    height: 100% !important; overflow: hidden !important;
    flex-shrink: 0 !important; border-right: none !important;
    overscroll-behavior: contain !important;
  }
  .skillchatslayout-mainpane.mobile-show {
    display: flex !important;
    position: fixed !important;
    top: var(--vv-top, 0px) !important;
    left: 0 !important;
    right: 0 !important;
    bottom: auto !important;
    z-index: 101 !important;
    width: 100% !important;
    height: 100vh !important;
    height: 100dvh !important;
    height: var(--vv-height, 100dvh) !important;
    max-height: var(--vv-height, 100dvh) !important;
    min-width: 0 !important; max-width: 100% !important;
    overflow: hidden !important;
    overscroll-behavior: contain !important;
    flex-direction: column !important;
    background: ${T.surface} !important;
  }
  .skillchatslayout-mobile-back { display: flex !important; }
  .skillchatslayout-mainpane.mobile-show .skillchatslayout-mobile-back {
    padding-top: max(8px, env(safe-area-inset-top)) !important;
  }
}
@media (min-width: 768px) {
  .skillchatslayout-sidebar  { display: flex !important; }
  .skillchatslayout-mainpane { display: flex !important; }
  .skillchatslayout-mobile-back { display: none !important; }
  .skc-desktop-header { display: flex !important; }
}
@media (max-width: 767px) {
  .skc-desktop-header { display: none !important; }
}

/* Prevent horizontal overflow on mobile */
.skillchatslayout-sidebar.mobile-show *,
.skillchatslayout-mainpane.mobile-show * {
  max-width: 100% !important; box-sizing: border-box !important;
}

.skc-report-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px;
}
.skc-report-modal {
  background: ${T.surface}; border-radius: ${T.radiusCard};
  padding: 24px; width: 100%; max-width: 420px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.14);
}
`;

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

function BackArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
    </svg>
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

export default function SkillChatsLayout() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const userId = currentUser?.id;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportedBookings, setReportedBookings] = useState(new Set());
  const [otherUserId, setOtherUserId] = useState(null);
  const [deleteMenuFor, setDeleteMenuFor] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [hiddenIds, setHiddenIds] = useState([]);

  /* ── mobile visual viewport tracking for on-screen keyboard ── */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleVV = () => {
      document.documentElement.style.setProperty('--vv-height', `${vv.height}px`);
      document.documentElement.style.setProperty('--vv-top', `${vv.offsetTop}px`);
    };

    handleVV();
    vv.addEventListener('resize', handleVV);
    vv.addEventListener('scroll', handleVV);

    return () => {
      vv.removeEventListener('resize', handleVV);
      vv.removeEventListener('scroll', handleVV);
      document.documentElement.style.removeProperty('--vv-height');
      document.documentElement.style.removeProperty('--vv-top');
    };
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [bookingData, hidden, reportsRes] = await Promise.all([
        getMySkillBookings(),
        getHiddenSkillBookingIds().catch(() => []),
        api.get('/reports/mine').catch(() => ({ data: { reports: [] } })),
      ]);
      setBookings(bookingData.bookings ?? []);
      setHiddenIds(hidden ?? []);

      const userReports = reportsRes?.data?.reports || [];
      const reportedBookingIds = userReports
        .filter(r => r.skill_booking_id)
        .map(r => String(r.skill_booking_id));

      setReportedBookings(new Set(reportedBookingIds));
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load chats');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { setLoading(false); return; }
    fetchAll();
  }, [authLoading, currentUser, fetchAll]);

  const visibleBookings = bookings.filter(b => !hiddenIds.includes(b.id));
  const selectedBooking = visibleBookings.find(b => String(b.id) === String(bookingId));
  // NOTE: inferred toggle — ChatsLayout.jsx uses an equivalent `showChatOnMobile`
  // flag but I didn't see its exact derivation in the pasted output. This assumes
  // "a booking is selected" = "show chat pane on mobile", matching the visible
  // behavior (`!tradeId || !selectedTrade` gates the empty state the same way).
  const showChatOnMobile = !!bookingId;

  const isRequesterView = selectedBooking?.requester_id === userId;
  const otherUserName = selectedBooking
    ? (isRequesterView ? selectedBooking.teacher_name : selectedBooking.requester_name) : '';
  const otherUserImage = selectedBooking
    ? (isRequesterView ? selectedBooking.teacher_profile_image : selectedBooking.requester_profile_image) : null;
  const otherUserIdForReport = selectedBooking
    ? (isRequesterView ? selectedBooking.teacher_id : selectedBooking.requester_id) : null;

  const handleSelectChat = id => navigate(`/skilter/chat/${id}`);

  const handleDeleteForMe = async id => {
    setDeleting(true);
    try {
      await hideSkillBookingChat(id);
      setHiddenIds(p => [...p, id]);
      if (String(id) === String(bookingId)) navigate('/skilter/chat');
    } catch (err) { setError(err?.response?.data?.error || err?.message || 'Failed to delete chat'); }
    finally { setDeleting(false); setDeleteMenuFor(null); }
  };



  if (!authLoading && !currentUser) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Manrope, sans-serif' }}>
        <p style={{ color: T.text }}>Please log in to view your skill chats.</p>
      </div>
    );
  }

  return (
    <div className="skillchatslayout-root" style={s.layout}>
      <style>{LAYOUT_CSS}</style>

      {/* LEFT: chat list */}
      <div className={`skillchatslayout-sidebar${!showChatOnMobile ? ' mobile-show' : ''}`} style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <h2 style={s.sidebarTitle}>Skill Chats</h2>
        </div>
        <div className="skillchatslayout-sidebar-scroll" style={s.sidebarScroll}>
          {loading ? (
            <p style={s.sidebarMuted}>Loading…</p>
          ) : error ? (
            <p style={{ ...s.sidebarMuted, color: T.danger }}>{error}</p>
          ) : visibleBookings.length === 0 ? (
            <div style={s.emptyList}>
              <span style={{ fontSize: 32 }}>🎓</span>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: T.muted }}>No skill chats yet</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {visibleBookings.map(booking => {
                const isReq = booking.requester_id === userId;
                const name = isReq ? booking.teacher_name : booking.requester_name;
                const imgField = isReq ? booking.teacher_profile_image : booking.requester_profile_image;
                const isActive = String(booking.id) === String(bookingId);
                const menuOpen = deleteMenuFor === booking.id;
                return (
                  <li key={booking.id} style={{ position: 'relative' }}>
                    <div
                      className={`skillchatslayout-row${isActive ? ' active' : ''}`}
                      onClick={() => handleSelectChat(booking.id)}
                      role="button" tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && handleSelectChat(booking.id)}
                    >
                      <Avatar name={name} imageUrl={imgField} size={38} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={s.rowName}>{name || 'Unknown user'}</span>
                        <span style={s.rowSub}>{booking.skill_name}</span>
                      </span>
                      <button type="button" aria-label="Delete chat"
                        onClick={e => { e.stopPropagation(); setDeleteMenuFor(menuOpen ? null : booking.id); }}
                        style={s.trashBtn}>
                        <TrashIcon size={15} />
                      </button>
                    </div>
                    {menuOpen && (
                      <div style={s.deleteMenu}>
                        <button className="skillchatslayout-del-opt" disabled={deleting}
                          onClick={() => handleDeleteForMe(booking.id)} style={s.deleteOpt}>Delete for me</button>
                        <button className="skillchatslayout-del-opt"
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

      {/* RIGHT: chat window */}
      <div className={`skillchatslayout-mainpane${showChatOnMobile ? ' mobile-show' : ''}`} style={s.mainPane}>
        {!bookingId || !selectedBooking ? (
          <div style={s.emptyMain}>
            <span style={{ fontSize: 42 }}>🎓</span>
            <p style={s.emptyMainText}>Select a chat to start messaging</p>
          </div>
        ) : (
          <>
            <div className="skillchatslayout-mobile-back" style={s.mobileBackBar}>
              <button type="button" onClick={() => navigate('/skilter/chat')} style={s.iconBtn} aria-label="Back to chats">
                <BackArrow />
              </button>
              <button
                type="button"
                onClick={() => otherUserIdForReport && navigate(`/profile/${otherUserIdForReport}`)}
                style={s.headerProfileBtn}
                aria-label="View profile"
              >
                <Avatar name={otherUserName} imageUrl={otherUserImage} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div style={s.mobileBackName}>{otherUserName || 'Chat'}</div>
                </div>
              </button>
              {bookingId && reportedBookings.has(String(bookingId)) ? (
                <span style={{ ...s.reportHeaderBtn, opacity: 0.6, cursor: 'default', color: '#15803d' }} title="Reported">
                  ✓
                </span>
              ) : (
                <button type="button"
                  onClick={() => { setOtherUserId(otherUserIdForReport); setShowReport(true); }}
                  style={s.reportHeaderBtn} aria-label="Report user">
                  ⚑
                </button>
              )}
            </div>

            <div className="skc-desktop-header" style={s.desktopHeader}>
              <button
                type="button"
                onClick={() => otherUserIdForReport && navigate(`/profile/${otherUserIdForReport}`)}
                style={s.headerProfileBtn}
                aria-label="View profile"
              >
                <Avatar name={otherUserName} imageUrl={otherUserImage} size={34} />
                <div style={{ minWidth: 0 }}>
                  <div style={s.desktopHeaderName}>{otherUserName || 'Chat'}</div>
                </div>
              </button>
              {bookingId && reportedBookings.has(String(bookingId)) ? (
                <span style={{ ...s.reportHeaderBtnDesktop, opacity: 0.7, cursor: 'default', color: '#15803d' }}>
                  ✓ Reported
                </span>
              ) : (
                <button type="button"
                  onClick={() => { setOtherUserId(otherUserIdForReport); setShowReport(true); }}
                  style={s.reportHeaderBtnDesktop}>
                  Report User
                </button>
              )}
            </div>

            <div style={s.chatFill}>
              <SkillBookingChatWindow
                bookingId={bookingId}
                currentUserId={userId}
                otherUserName={otherUserName}
                otherUserImage={otherUserImage}
                otherUserId={otherUserIdForReport}
                skillTitle={selectedBooking.skill_name}
              />
            </div>
          </>
        )}
      </div>

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        reportedUserId={otherUserId || otherUserIdForReport}
        skillBookingId={bookingId || null}
        userName={otherUserName}
        onSuccess={() => {
          if (bookingId) {
            setReportedBookings(prev => new Set(prev).add(String(bookingId)));
          }
        }}
      />
    </div>
  );
}

const s = {
  layout: {
    display: 'flex', height: 'calc(100dvh - 80px)',
    maxWidth: 1100, width: '100%', margin: '0 auto',
    border: `1px solid ${T.border}`, borderRadius: T.radiusCard,
    overflow: 'hidden', background: T.surface,
    fontFamily: 'Manrope, sans-serif', boxSizing: 'border-box',
  },
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
  mainPane: {
    flex: 1, display: 'flex', flexDirection: 'column',
    background: T.bg, overflow: 'hidden', minWidth: 0, height: '100%', minHeight: 0,
  },
  desktopHeader: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0,
  },
  desktopHeaderName: {
    fontWeight: 600, fontSize: 14.5, color: T.text, fontFamily: 'Fraunces, serif',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2,
  },
  reportHeaderBtnDesktop: {
    padding: '5px 12px', borderRadius: T.radiusCtrl,
    border: `1px solid ${T.border}`, background: 'transparent',
    color: T.muted, fontSize: 12, fontWeight: 500, cursor: 'pointer',
    fontFamily: 'Manrope, sans-serif', flexShrink: 0,
  },
  mobileBackBar: {
    display: 'none', alignItems: 'center', gap: 10, padding: '8px 12px',
    background: T.surface, borderBottom: `1px solid ${T.border}`, flexShrink: 0, minHeight: 56,
  },
  mobileBackName: {
    fontWeight: 600, fontSize: 15, color: T.text, fontFamily: 'Fraunces, serif',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2,
  },
  reportHeaderBtn: {
    width: 32, height: 32, borderRadius: '50%', border: `1px solid ${T.border}`,
    background: 'transparent', color: T.muted, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0,
  },
  /* Clickable avatar+name wrapper in both desktop and mobile headers */
  headerProfileBtn: {
    display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0,
    border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
    textAlign: 'left',
  },
  chatFill: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  emptyMain: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', background: T.bg,
  },
  emptyMainText: { color: T.muted, fontWeight: 500, marginTop: 12, fontSize: 14 },
  ctaBtn: {
    padding: '8px 18px', borderRadius: T.radiusCtrl, border: 'none',
    background: T.accent, color: '#fff', fontWeight: 600, cursor: 'pointer',
    fontSize: 13, fontFamily: 'Manrope, sans-serif',
  },
  secondaryBtn: {
    padding: '8px 18px', borderRadius: T.radiusCtrl, border: `1px solid ${T.border}`,
    background: T.surface, color: T.text, fontWeight: 500, cursor: 'pointer',
    fontSize: 13, fontFamily: 'Manrope, sans-serif',
  },
};