import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getMyRentalBookings, getHiddenRentalBookingIds, hideRentalBookingChat } from '../services/rentalBookingService';
import { useAuth } from '../features/auth/AuthContext';
import RentalBookingChatWindow from '../features/chat/RentalBookingChatWindow';

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

.app-main:has(.rentalchatslayout-root) {
  padding: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
}

.rentalchatslayout-sidebar, .rentalchatslayout-mainpane { display: flex; flex-direction: column; }
.rentalchatslayout-sidebar-scroll::-webkit-scrollbar { width: 4px; }
.rentalchatslayout-sidebar-scroll::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }

.rentalchatslayout-row {
  display: flex; align-items: center; gap: 10px; padding: 12px 14px;
  cursor: pointer; border-bottom: 1px solid ${T.border};
  transition: background 0.15s, transform 0.15s, border-color 0.15s;
  background: transparent; border-left: 3px solid transparent; box-sizing: border-box;
}
.rentalchatslayout-row:hover { background: ${T.bg}; border-left-color: ${T.accent}; transform: translateY(-1px); }
.rentalchatslayout-row.active { background: #EBF2F0; border-left-color: ${T.accent}; }
.rentalchatslayout-del-opt:hover { background: ${T.bg}; }

@media (max-width: 767px) {
  .rentalchatslayout-root {
    border-radius: 0 !important; border: none !important;
    height: calc(100vh - 80px) !important;
    height: calc(100dvh - 80px) !important;
    height: calc(var(--vv-height, 100dvh) - 80px) !important;
    max-width: 100% !important; width: 100% !important;
    margin: 0 !important; overflow: hidden !important;
    overscroll-behavior: contain !important;
  }
  .rentalchatslayout-sidebar  { display: none !important; }
  .rentalchatslayout-mainpane { display: none !important; }
  .rentalchatslayout-sidebar.mobile-show {
    display: flex !important;
    width: 100% !important; min-width: 0 !important; max-width: 100% !important;
    height: 100% !important; overflow: hidden !important;
    flex-shrink: 0 !important; border-right: none !important;
    overscroll-behavior: contain !important;
  }
  .rentalchatslayout-mainpane.mobile-show {
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
  .rentalchatslayout-mobile-back { display: flex !important; }
  .rentalchatslayout-mainpane.mobile-show .rentalchatslayout-mobile-back {
    padding-top: max(8px, env(safe-area-inset-top)) !important;
  }
}
@media (min-width: 768px) {
  .rentalchatslayout-sidebar  { display: flex !important; }
  .rentalchatslayout-mainpane { display: flex !important; }
  .rentalchatslayout-mobile-back { display: none !important; }
}

/* Prevent horizontal overflow on mobile */
.rentalchatslayout-sidebar.mobile-show *:not(.rkc-picker):not(.rkc-picker *),
.rentalchatslayout-mainpane.mobile-show *:not(.rkc-picker):not(.rkc-picker *) {
  max-width: 100% !important; box-sizing: border-box !important;
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

export default function RentalChatsLayout() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, loading: authLoading } = useAuth();
  const userId = currentUser?.id;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteMenuFor, setDeleteMenuFor] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [hiddenIds, setHiddenIds] = useState([]);

  const basePath = location.pathname.startsWith('/renter/chat')
    ? '/renter/chat'
    : location.pathname.startsWith('/rentals/chat')
    ? '/rentals/chat'
    : '/rental/chat';

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
    setLoading(true);
    setError('');
    try {
      const [bookingData, hidden] = await Promise.all([
        getMyRentalBookings(),
        getHiddenRentalBookingIds().catch(() => []),
      ]);
      const list = bookingData?.bookings ?? (Array.isArray(bookingData) ? bookingData : []);
      setBookings(list);
      setHiddenIds(Array.isArray(hidden) ? hidden : []);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { setLoading(false); return; }
    fetchAll();
  }, [authLoading, currentUser, fetchAll]);

  const visibleBookings = bookings.filter(b => !hiddenIds.includes(b.id));
  const selectedBooking = visibleBookings.find(b => String(b.id) === String(bookingId));
  const showChatOnMobile = !!bookingId;

  const isBorrower = selectedBooking?.borrower_id === userId;
  const otherUserName = selectedBooking
    ? (isBorrower
        ? (selectedBooking.owner_name || selectedBooking.owner_username)
        : (selectedBooking.borrower_name || selectedBooking.borrower_username))
    : '';
  const otherUserImage = selectedBooking
    ? (isBorrower
        ? selectedBooking.owner_profile_image
        : selectedBooking.borrower_profile_image)
    : null;
  const otherUserId = selectedBooking
    ? (isBorrower ? selectedBooking.owner_id : selectedBooking.borrower_id)
    : null;

  const handleSelectChat = (id) => navigate(`${basePath}/${id}`);

  const handleDeleteForMe = async (id) => {
    setDeleting(true);
    try {
      await hideRentalBookingChat(id);
      setHiddenIds(p => [...p, id]);
      if (String(id) === String(bookingId)) navigate(basePath);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to delete chat');
    } finally {
      setDeleting(false);
      setDeleteMenuFor(null);
    }
  };

  if (!authLoading && !currentUser) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Manrope, sans-serif' }}>
        <p style={{ color: T.text }}>Please log in to view your rental chats.</p>
      </div>
    );
  }

  return (
    <div className="rentalchatslayout-root" style={s.layout}>
      <style>{LAYOUT_CSS}</style>

      {/* LEFT: chat list */}
      <div className={`rentalchatslayout-sidebar${!showChatOnMobile ? ' mobile-show' : ''}`} style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <h2 style={s.sidebarTitle}>Rental Chats</h2>
        </div>
        <div className="rentalchatslayout-sidebar-scroll" style={s.sidebarScroll}>
          {loading ? (
            <p style={s.sidebarMuted}>Loading…</p>
          ) : error ? (
            <p style={{ ...s.sidebarMuted, color: T.danger }}>{error}</p>
          ) : visibleBookings.length === 0 ? (
            <div style={s.emptyList}>
              <span style={{ fontSize: 32 }}>📦</span>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: T.muted }}>No rental chats yet</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {visibleBookings.map(booking => {
                const isBorrowerRow = booking.borrower_id === userId;
                const name = isBorrowerRow
                  ? (booking.owner_name || booking.owner_username)
                  : (booking.borrower_name || booking.borrower_username);
                const imgField = isBorrowerRow
                  ? booking.owner_profile_image
                  : booking.borrower_profile_image;
                const isActive = String(booking.id) === String(bookingId);
                const menuOpen = deleteMenuFor === booking.id;
                return (
                  <li key={booking.id} style={{ position: 'relative' }}>
                    <div
                      className={`rentalchatslayout-row${isActive ? ' active' : ''}`}
                      onClick={() => handleSelectChat(booking.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && handleSelectChat(booking.id)}
                    >
                      <Avatar name={name} imageUrl={imgField} size={38} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={s.rowName}>{name || 'Unknown user'}</span>
                        <span style={s.rowSub}>{booking.item_name}</span>
                      </span>
                      <button
                        type="button"
                        aria-label="Delete chat"
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteMenuFor(menuOpen ? null : booking.id);
                        }}
                        style={s.trashBtn}
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>
                    {menuOpen && (
                      <div style={s.deleteMenu}>
                        <button
                          className="rentalchatslayout-del-opt"
                          disabled={deleting}
                          onClick={() => handleDeleteForMe(booking.id)}
                          style={s.deleteOpt}
                        >
                          Delete for me
                        </button>
                        <button
                          className="rentalchatslayout-del-opt"
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

      {/* RIGHT: chat window */}
      <div className={`rentalchatslayout-mainpane${showChatOnMobile ? ' mobile-show' : ''}`} style={s.mainPane}>
        {!bookingId || !selectedBooking ? (
          <div style={s.emptyMain}>
            <span style={{ fontSize: 42 }}>📦</span>
            <p style={s.emptyMainText}>Select a chat to start messaging</p>
          </div>
        ) : (
          <>
            <div className="rentalchatslayout-mobile-back" style={s.mobileBackBar}>
              <button
                type="button"
                onClick={() => navigate(basePath)}
                style={s.iconBtn}
                aria-label="Back to chats"
              >
                <BackArrow />
              </button>
              <button
                type="button"
                onClick={() => otherUserId && navigate(`/profile/${otherUserId}`)}
                style={s.headerProfileBtn}
                aria-label="View profile"
              >
                <Avatar name={otherUserName} imageUrl={otherUserImage} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div style={s.mobileBackName}>{otherUserName || 'Chat'}</div>
                </div>
              </button>
            </div>

            <div style={s.chatFill}>
              <RentalBookingChatWindow
                bookingId={bookingId}
                currentUserId={userId}
                otherUserName={otherUserName}
                otherUserImage={otherUserImage}
                otherUserId={otherUserId}
                rentalTitle={selectedBooking.item_name}
                rentalListingId={selectedBooking.rental_listing_id}
              />
            </div>
          </>
        )}
      </div>
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
  mobileBackBar: {
    display: 'none', alignItems: 'center', gap: 10, padding: '8px 12px',
    background: T.surface, borderBottom: `1px solid ${T.border}`, flexShrink: 0, minHeight: 56,
  },
  mobileBackName: {
    fontWeight: 600, fontSize: 15, color: T.text, fontFamily: 'Fraunces, serif',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2,
  },
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
};
