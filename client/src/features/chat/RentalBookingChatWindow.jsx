import { useEffect, useState, useRef, useCallback, Fragment } from 'react';
import { io } from 'socket.io-client';
import { fmtTime, formatChatDateHeader, getDateKey } from '../../utils/helpers';

const API_URL = 'http://localhost:5000';
const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

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
  mine:         '#3D6E63',
  theirs:       '#EDF2F0',
  radiusCard:   '14px',
};

/* ─── Avatar ─────────────────────────────────────────────────────────────── */
function Avatar({ name, imageUrl, size = 34 }) {
  const [err, setErr] = useState(false);
  const src = imageUrl && !err
    ? (imageUrl.startsWith('http') ? imageUrl : `${API_URL}${imageUrl}`)
    : null;
  return (
    <span style={{
      width: size, height: size, minWidth: size, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
      background: src ? 'transparent' : T.accent,
      color: '#fff', fontWeight: 700, fontSize: size * 0.38,
      border: `1px solid ${T.border}`,
    }}>
      {src
        ? <img src={src} alt={name} onError={() => setErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : (name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

/* ─── CSS ────────────────────────────────────────────────────────────────── */
const RKC_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500&family=Manrope:wght@400;500&display=swap');

.rkc-wrap {
  width: 100%; max-width: 100%; box-sizing: border-box;
  display: flex; flex-direction: column; flex: 1; min-height: 0; height: 100%;
  font-family: Manrope, sans-serif; overflow: hidden;
}

/* Desktop header — hidden on mobile */
.rkc-header {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border-bottom: 1px solid ${T.border};
  background: ${T.surface}; flex-shrink: 0; z-index: 2;
}
.rkc-header-info { flex: 1; min-width: 0; }
.rkc-header-name {
  font-size: 15px; font-weight: 600; color: ${T.text};
  font-family: Fraunces, serif;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rkc-header-status { font-size: 11px; color: ${T.accent}; margin-top: 1px; }
@media (max-width: 767px) { .rkc-header { display: none !important; } }

/* Rental item context strip */
.rkc-item-strip {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px; background: ${T.bg};
  border-bottom: 1px solid ${T.border}; flex-shrink: 0;
  font-size: 12.5px; color: ${T.muted};
}
.rkc-item-strip-title {
  flex: 1; min-width: 0; font-weight: 500; color: ${T.text};
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rkc-item-strip-btn {
  padding: 4px 10px; border-radius: 6px; border: 1px solid ${T.accent};
  background: transparent; color: ${T.accent}; font-size: 11.5px;
  font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0;
  font-family: Manrope, sans-serif;
}

/* Outer border */
.rkc-container {
  display: flex; flex-direction: column;
  flex: 1; min-height: 0;
  border: 1px solid ${T.border}; border-radius: ${T.radiusCard};
  overflow: hidden; background: ${T.surface};
  box-sizing: border-box; margin: 10px 12px 0; width: calc(100% - 24px);
}
@media (max-width: 767px) {
  .rkc-container { border-radius: 0; border-left: none; border-right: none; border-top: none; margin: 0; width: 100%; }
}

/* Message scroll area */
.rkc-messages {
  flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;
  padding: 14px 12px 8px; display: flex; flex-direction: column; gap: 8px;
  width: 100%; box-sizing: border-box; background: ${T.bg};
  scroll-behavior: smooth; -webkit-overflow-scrolling: touch;
}
.rkc-messages::-webkit-scrollbar { width: 3px; }
.rkc-messages::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }

/* Date separators */
.rkc-date-separator { display: flex; align-items: center; justify-content: center; margin: 10px 0 4px; }
.rkc-date-pill {
  background: ${T.surface}; color: ${T.muted}; border: 1px solid ${T.border};
  font-size: 11px; font-weight: 600; padding: 3px 12px; border-radius: 12px;
}

/* Message row */
.rkc-row { display: flex; flex-direction: column; max-width: 72%; position: relative; }
.rkc-row.mine   { align-self: flex-end;  align-items: flex-end;  }
.rkc-row.theirs { align-self: flex-start; align-items: flex-start; }
@media (max-width: 767px) { .rkc-row { max-width: 75%; } }

.rkc-sender { font-size: 11px; font-weight: 500; color: ${T.muted}; margin-bottom: 2px; margin-left: 4px; }

/* Bubble */
.rkc-bubble {
  padding: 8px 12px; border-radius: 14px; font-size: 14px; line-height: 1.5;
  word-break: break-word; overflow-wrap: break-word;
  cursor: pointer; position: relative; border: 1px solid transparent;
  transition: filter 0.12s;
}
.rkc-bubble.mine   { background: ${T.mine}; color: #fff; border-bottom-right-radius: 3px; }
.rkc-bubble.theirs { background: ${T.theirs}; color: ${T.text}; border-bottom-left-radius: 3px; border-color: ${T.border}; }
.rkc-bubble.mine:hover   { filter: brightness(0.92); }
.rkc-bubble.theirs:hover { border-color: ${T.accent}; }
@media (max-width: 767px) { .rkc-bubble { font-size: 14.5px; } }

/* Timestamp + read receipt */
.rkc-bubble-footer { display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin-top: 3px; }
.rkc-ts     { font-size: 10px; opacity: 0.65; }
.rkc-status { font-size: 11px; opacity: 0.7; letter-spacing: -1px; }

/* Quote strip */
.rkc-quote {
  border-left: 3px solid rgba(61,110,99,0.4); padding: 4px 8px;
  margin-bottom: 5px; font-size: 12px; opacity: 0.8;
  border-radius: 4px; background: rgba(61,110,99,0.07);
}

/* Attachments */
.rkc-attachment {
  max-width: 220px; width: 100%; border-radius: 10px; margin-bottom: 5px;
  display: block; cursor: pointer;
}
@media (max-width: 767px) { .rkc-attachment { max-width: 200px; } }

/* Reactions */
.rkc-reactions { display: flex; gap: 4px; margin-top: 3px; flex-wrap: wrap; }
.rkc-reaction-badge {
  font-size: 12px; background: ${T.surface}; border-radius: 999px;
  padding: 1px 7px; border: 1px solid ${T.border};
}

/* Emoji picker */
.rkc-picker {
  display: flex !important;
  align-items: center !important;
  gap: 3px !important;
  padding: 5px 8px !important;
  background: ${T.surface} !important;
  border: 1px solid ${T.border} !important;
  border-radius: 999px !important;
  position: absolute !important;
  top: -46px !important;
  width: max-content !important;
  min-width: max-content !important;
  max-width: min(320px, 88vw) !important;
  z-index: 30 !important;
  white-space: nowrap !important;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
  box-sizing: border-box !important;
}
.rkc-row.mine   .rkc-picker { right: 0; left: auto; }
.rkc-row.theirs .rkc-picker { left: 0;  right: auto; }
.rkc-picker button {
  background: none !important;
  border: none !important;
  font-size: 18px !important;
  cursor: pointer !important;
  flex-shrink: 0 !important;
  padding: 2px !important;
  width: 28px !important;
  height: 28px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 50% !important;
  transition: transform 0.12s !important;
  line-height: 1 !important;
}
.rkc-picker button:hover {
  transform: scale(1.2) !important;
}

/* Action buttons */
.rkc-actions { display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
.rkc-actions button {
  font-size: 11px; padding: 3px 8px; border: 1px solid ${T.border};
  background: ${T.surface}; cursor: pointer; color: ${T.muted};
  border-radius: 6px; transition: border-color 0.12s; font-family: Manrope, sans-serif;
}
.rkc-actions button:hover { border-color: ${T.accent}; color: ${T.accent}; }

/* Delete sub-menu */
.rkc-del-menu {
  position: absolute; bottom: 26px; right: 0;
  background: ${T.surface}; border: 1px solid ${T.border};
  border-radius: ${T.radiusCard}; z-index: 8;
  display: flex; flex-direction: column; min-width: 155px; max-width: 90vw; overflow: hidden;
}
.rkc-del-menu button {
  padding: 9px 13px; text-align: left; border: none; background: none;
  cursor: pointer; font-size: 12.5px; color: ${T.text};
  font-family: Manrope, sans-serif; transition: background 0.12s;
}
.rkc-del-menu button:hover { background: ${T.bg}; }
.rkc-del-menu button.danger { color: ${T.danger}; }

/* Edit row */
.rkc-edit-row { display: flex; gap: 6px; align-items: center; }
.rkc-edit-row input {
  flex: 1; min-width: 0; border-radius: 6px;
  border: 1px solid ${T.border}; padding: 4px 8px; font-size: 13.5px;
  background: #fff; color: ${T.text};
}
.rkc-edit-row button { border: none; background: none; cursor: pointer; font-size: 14px; flex-shrink: 0; }

/* Reply preview strip */
.rkc-reply-preview {
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 12px; background: #EDF2F0;
  border-left: 3px solid ${T.accent}; font-size: 12.5px;
  margin: 0; border-top: 1px solid ${T.border};
  flex-shrink: 0; color: ${T.muted};
}
.rkc-reply-preview button { background: none; border: none; cursor: pointer; font-size: 14px; color: ${T.muted}; }

/* Attachment preview strip */
.rkc-attach-preview {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  background: #EDF2F0; border-top: 1px solid ${T.border}; flex-shrink: 0;
}
.rkc-attach-preview img, .rkc-attach-preview video {
  width: 48px; height: 48px; object-fit: cover; border-radius: 8px;
}
.rkc-attach-preview span { font-size: 12px; color: ${T.muted}; flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rkc-attach-preview button { margin-left: auto; background: none; border: none; cursor: pointer; font-size: 16px; color: ${T.muted}; }

/* Input row */
.rkc-input-row {
  display: flex; gap: 8px; padding: 10px 12px;
  border-top: 1px solid ${T.border}; box-sizing: border-box;
  align-items: center; background: ${T.surface};
  flex-shrink: 0; width: 100%; position: relative;
}
@media (max-width: 767px) {
  .rkc-input-row { padding: 8px 10px; padding-bottom: max(10px, env(safe-area-inset-bottom)); }
}

/* "+" attach button */
.rkc-plus-btn {
  width: 38px; height: 38px; min-width: 38px; border-radius: 50%;
  border: 1px solid ${T.border}; background: ${T.surface}; color: ${T.accent};
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 300; flex-shrink: 0; line-height: 1;
  transition: border-color 0.12s, background 0.12s;
}
.rkc-plus-btn:hover { border-color: ${T.accent}; background: rgba(61,110,99,0.06); }

/* Desktop attach dropdown */
.rkc-attach-menu-desktop {
  position: absolute; bottom: 56px; left: 12px;
  background: ${T.surface}; border: 1px solid ${T.border};
  border-radius: ${T.radiusCard}; z-index: 30;
  display: flex; flex-direction: column; min-width: 170px; overflow: hidden;
}
.rkc-attach-menu-desktop button {
  padding: 11px 14px; text-align: left; border: none; background: none;
  cursor: pointer; font-size: 13.5px; color: ${T.text};
  display: flex; align-items: center; gap: 9px;
  font-family: Manrope, sans-serif; transition: background 0.12s;
}
.rkc-attach-menu-desktop button:hover { background: ${T.bg}; }

/* Mobile bottom sheet */
.rkc-bottom-sheet-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35);
  z-index: 200; display: flex; align-items: flex-end; justify-content: center;
}
.rkc-bottom-sheet {
  width: 100%; max-width: 480px;
  background: ${T.surface}; border-radius: 20px 20px 0 0;
  padding: 12px 0 calc(12px + env(safe-area-inset-bottom)); box-sizing: border-box;
}
.rkc-bottom-sheet-handle { width: 36px; height: 4px; border-radius: 2px; background: ${T.border}; margin: 0 auto 16px; }
.rkc-bottom-sheet button {
  display: flex; align-items: center; gap: 14px;
  width: 100%; padding: 14px 20px; border: none; background: none;
  cursor: pointer; font-size: 15px; color: ${T.text};
  font-family: Manrope, sans-serif; transition: background 0.12s;
}
.rkc-bottom-sheet button:hover, .rkc-bottom-sheet button:active { background: ${T.bg}; }
.rkc-bottom-sheet-icon { font-size: 22px; width: 28px; text-align: center; }

/* Text input */
.rkc-text-input {
  flex: 1; min-width: 0; padding: 9px 14px; border-radius: 22px; border: 1px solid ${T.border};
  outline: none; font-size: 14px; font-family: Manrope, sans-serif;
  background: ${T.bg}; color: ${T.text}; transition: border-color 0.18s; line-height: 1.4;
}
.rkc-text-input:focus { border-color: ${T.accent}; background: ${T.surface}; }
@media (max-width: 767px) { .rkc-text-input { font-size: 16px; } }

/* Send button */
.rkc-send-btn {
  width: 38px; height: 38px; min-width: 38px; border-radius: 50%; border: none;
  background: ${T.accent}; color: #fff; cursor: pointer; font-weight: 700;
  font-size: 16px; flex-shrink: 0; display: flex; align-items: center;
  justify-content: center; transition: background 0.12s, transform 0.12s;
}
.rkc-send-btn:hover { background: ${T.accentStrong}; transform: scale(1.06); }
.rkc-send-btn:disabled { background: ${T.border}; cursor: default; transform: none; }
`;

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function RentalBookingChatWindow({
  bookingId,
  currentUserId,
  otherUserName,
  otherUserImage,
  otherUserId,       // for presence checks
  rentalTitle,
  itemTitle,
  itemName,
  rentalListingId,
  listingId,
  onViewRental,
  onViewItem,
  onViewListing,
}) {
  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState('');
  const [replyingTo,     setReplyingTo]     = useState(null);
  const [pickerForId,    setPickerForId]    = useState(null);
  const [editingId,      setEditingId]      = useState(null);
  const [editText,       setEditText]       = useState('');
  const [deleteMenuId,   setDeleteMenuId]   = useState(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isMobile,       setIsMobile]       = useState(() => window.innerWidth < 768);
  const [pendingFile,    setPendingFile]    = useState(null);
  const [pendingUrl,     setPendingUrl]     = useState(null);
  const [isOtherOnline,  setIsOtherOnline]  = useState(false);
  const [chatIsRead,     setChatIsRead]     = useState(false);

  const socketRef         = useRef(null);
  const bottomRef         = useRef(null);
  const msgContRef        = useRef(null);
  const galleryRef        = useRef(null);
  const cameraRef         = useRef(null);
  const initialScrollDone = useRef(false);
  const prevMsgCount      = useRef(0);

  const displayTitle    = rentalTitle || itemTitle || itemName;
  const targetListingId = rentalListingId || listingId;
  const viewHandler     = onViewRental || onViewItem || onViewListing;

  /* mobile/desktop detection */
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  /* reset on booking switch */
  useEffect(() => {
    initialScrollDone.current = false;
    prevMsgCount.current = 0;
    setMessages([]);
    setChatIsRead(false);
  }, [bookingId]);

  /* cleanup pending object URL */
  useEffect(() => () => { if (pendingUrl) URL.revokeObjectURL(pendingUrl); }, [pendingUrl]);

  /* socket + polling */
  useEffect(() => {
    if (!bookingId) return;
    const token = localStorage.getItem('token');

    fetch(`${API_URL}/api/rental-chat/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setMessages(Array.isArray(d) ? d : []))
      .catch(err => console.error('Fetch rental chat error:', err));

    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.emit('joinRentalBooking', String(bookingId));

    /* new message */
    socket.on('newRentalMessage', m => {
      if (String(m.booking_id) === String(bookingId))
        setMessages(p => [...p, m]);
    });
    /* reaction update */
    socket.on('rentalMessageReactionUpdated', m =>
      setMessages(p => p.map(x => x.id === m.id ? m : x)));
    /* edit */
    socket.on('rentalMessageEdited', m =>
      setMessages(p => p.map(x => x.id === m.id ? m : x)));
    /* delete for everyone */
    socket.on('rentalMessageDeleted', m =>
      setMessages(p => p.map(x => x.id === m.id ? m : x)));

    /* presence */
    socket.on('userOnline',  ({ userId: uid }) => {
      if (String(uid) === String(otherUserId)) setIsOtherOnline(true);
    });
    socket.on('userOffline', ({ userId: uid }) => {
      if (String(uid) === String(otherUserId)) setIsOtherOnline(false);
    });

    /* read receipts */
    socket.on('rentalMessagesRead', ({ bookingId: bid }) => {
      if (String(bid) === String(bookingId)) setChatIsRead(true);
    });
    socket.emit('markRentalRead', { bookingId: String(bookingId) });

    socket.on('connect_error', e => console.log('RKC socket:', e.message));

    const poll = setInterval(() => {
      fetch(`${API_URL}/api/rental-chat/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => setMessages(Array.isArray(d) ? d : []))
        .catch(err => console.error('Rental chat poll error:', err));
    }, 5000);

    return () => {
      socket.disconnect();
      clearInterval(poll);
    };
  }, [bookingId, otherUserId]);

  /* scroll to bottom on first load */
  useEffect(() => {
    if (messages.length > 0 && !initialScrollDone.current) {
      initialScrollDone.current = true;
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [messages]);

  /* scroll to bottom on new messages */
  useEffect(() => {
    const c = msgContRef.current;
    if (!c) return;
    const isNew = messages.length > prevMsgCount.current;
    prevMsgCount.current = messages.length;
    if (!isNew) return;
    const dist = c.scrollHeight - c.scrollTop - c.clientHeight;
    if (dist < 220) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* mobile keyboard-aware scroll */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const h = () => {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    };
    vv.addEventListener('resize', h);
    return () => vv.removeEventListener('resize', h);
  }, []);

  /* ── send ── */
  const sendMessage = useCallback(async () => {
    if (!input.trim() && !pendingFile) return;
    const token = localStorage.getItem('token');

    if (pendingFile) {
      const fd = new FormData();
      fd.append('booking_id', bookingId);
      if (input.trim()) fd.append('message', input.trim());
      if (replyingTo?.id) fd.append('reply_to_message_id', replyingTo.id);
      fd.append('attachment', pendingFile);
      await fetch(`${API_URL}/api/rental-chat`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
    } else {
      await fetch(`${API_URL}/api/rental-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          booking_id: bookingId,
          message: input.trim(),
          reply_to_message_id: replyingTo?.id || null,
        }),
      });
    }

    setInput('');
    setReplyingTo(null);
    setPendingFile(null);
    setPendingUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [input, pendingFile, bookingId, replyingTo]);

  const clearPending = () => {
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    setPendingFile(null); setPendingUrl(null);
  };

  const handleFileChosen = file => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File must be under 5 MB'); return; }
    setPendingFile(file);
    setPendingUrl(URL.createObjectURL(file));
    setShowAttachMenu(false);
  };

  /* ── reactions ── */
  const toggleReaction = async (msgId, emoji) => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/rental-chat/${msgId}/react`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ emoji }),
    });
    setPickerForId(null);
  };

  /* ── edit ── */
  const saveEdit = async msgId => {
    if (!editText.trim()) return;
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/rental-chat/${msgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: editText }),
    });
    setEditingId(null); setEditText('');
  };

  /* ── delete ── */
  const deleteForEveryone = async msgId => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/rental-chat/message/${msgId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    setDeleteMenuId(null);
  };

  const deleteForMe = async msgId => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/rental-chat/message/${msgId}/hide`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    setMessages(p => p.filter(m => m.id !== msgId));
    setDeleteMenuId(null);
  };

  const findMsg = id => messages.find(m => m.id === id);
  const headerName = otherUserName
    || messages.find(m => String(m.sender_id) !== String(currentUserId))?.sender_name
    || 'Chat';

  /* ─── render ────────────────────────────────────────────────────────────── */
  return (
    <div className="rkc-wrap">
      <style>{RKC_CSS}</style>

      {/* Desktop header */}
      <div className="rkc-header">
        <Avatar name={headerName} imageUrl={otherUserImage} size={38} />
        <div className="rkc-header-info">
          <div className="rkc-header-name">{headerName}</div>
          <div className="rkc-header-status">
            {isOtherOnline ? '● Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Rental item context strip */}
      {displayTitle && (
        <div className="rkc-item-strip">
          <span>📦</span>
          <span className="rkc-item-strip-title">{displayTitle}</span>
          {targetListingId && viewHandler && (
            <button className="rkc-item-strip-btn" onClick={() => viewHandler(targetListingId)}>
              View Item
            </button>
          )}
        </div>
      )}

      <div className="rkc-container">

        {/* Message list */}
        <div className="rkc-messages" ref={msgContRef}>
          {messages.map((m, idx) => {
            const isMine     = String(m.sender_id) === String(currentUserId);
            const quoted     = m.reply_to_message_id ? findMsg(m.reply_to_message_id) : null;
            const reactions  = Object.entries(m.reactions || {});
            const isEditing  = editingId === m.id;
            const isSelected = pickerForId === m.id;
            const prevMsg    = idx > 0 ? messages[idx - 1] : null;
            const showDate   = !prevMsg || getDateKey(m.created_at) !== getDateKey(prevMsg.created_at);
            const dateLabel  = showDate ? formatChatDateHeader(m.created_at) : null;

            const attachSrc = m.attachment_url
              ? (m.attachment_url.startsWith('http') ? m.attachment_url : `${API_URL}${m.attachment_url}`)
              : null;
            const isImg = attachSrc && (m.attachment_type === 'image' || String(m.attachment_type).startsWith('image/'));
            const isVid = attachSrc && (m.attachment_type === 'video' || String(m.attachment_type).startsWith('video/'));

            return (
              <Fragment key={m.id || idx}>
                {showDate && dateLabel && (
                  <div className="rkc-date-separator">
                    <span className="rkc-date-pill">{dateLabel}</span>
                  </div>
                )}

                <div className={`rkc-row ${isMine ? 'mine' : 'theirs'}`}>
                  {!isMine && m.sender_name && <span className="rkc-sender">{m.sender_name}</span>}

                  <div
                    className={`rkc-bubble ${isMine ? 'mine' : 'theirs'}`}
                    onClick={() => {
                      if (m.deleted || isEditing) return;
                      setPickerForId(isSelected ? null : m.id);
                      setDeleteMenuId(null);
                    }}
                  >
                    {/* Emoji picker */}
                    {isSelected && !m.deleted && (
                      <div className="rkc-picker" onClick={e => e.stopPropagation()}>
                        {EMOJI_OPTIONS.map(e => (
                          <button key={e} onClick={() => toggleReaction(m.id, e)}>{e}</button>
                        ))}
                      </div>
                    )}

                    {/* Quote */}
                    {quoted && !m.deleted && (
                      <div className="rkc-quote">
                        {quoted.message
                          ? `${quoted.message.slice(0, 60)}${quoted.message.length > 60 ? '…' : ''}`
                          : quoted.attachment_url ? '📎 Attachment' : ''}
                      </div>
                    )}

                    {/* Body */}
                    {m.deleted ? (
                      <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.55 }}>
                        This message was deleted
                      </p>
                    ) : isEditing ? (
                      <div className="rkc-edit-row" onClick={e => e.stopPropagation()}>
                        <input
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(m.id);
                            if (e.key === 'Escape') { setEditingId(null); setEditText(''); }
                          }}
                          autoFocus
                        />
                        <button onClick={() => saveEdit(m.id)}>✓</button>
                        <button onClick={() => { setEditingId(null); setEditText(''); }}>✕</button>
                      </div>
                    ) : (
                      <>
                        {isImg && <img src={attachSrc} alt="" className="rkc-attachment" />}
                        {isVid && <video src={attachSrc} controls className="rkc-attachment" />}
                        {m.message && (
                          <p style={{ margin: 0 }}>
                            {m.message}
                            {m.edited && <span style={{ fontSize: 10, opacity: 0.6 }}> (edited)</span>}
                          </p>
                        )}
                      </>
                    )}

                    {/* Timestamp + read receipt tick */}
                    {!m.deleted && (
                      <div className="rkc-bubble-footer">
                        <span className="rkc-ts">{fmtTime(m.created_at)}</span>
                        {isMine && (
                          <span
                            className="rkc-status"
                            style={{ color: chatIsRead ? '#53bdeb' : 'rgba(255,255,255,0.7)' }}
                          >
                            ✓✓
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Reactions */}
                  {reactions.length > 0 && !m.deleted && (
                    <div className="rkc-reactions">
                      {reactions.map(([emoji, userIds]) => (
                        <span key={emoji} className="rkc-reaction-badge">
                          {emoji}{userIds.length > 1 ? ` ${userIds.length}` : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action buttons (shown when bubble is selected) */}
                  {!m.deleted && !isEditing && isSelected && (
                    <div className="rkc-actions" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setReplyingTo(m)}>↩ Reply</button>
                      {isMine && (
                        <button onClick={() => { setEditingId(m.id); setEditText(m.message); }}>
                          ✎ Edit
                        </button>
                      )}
                      <button onClick={() => setDeleteMenuId(deleteMenuId === m.id ? null : m.id)}>
                        🗑 Delete
                      </button>
                      {deleteMenuId === m.id && (
                        <div className="rkc-del-menu" onClick={e => e.stopPropagation()}>
                          {isMine && (
                            <button className="danger" onClick={() => deleteForEveryone(m.id)}>
                              Delete for everyone
                            </button>
                          )}
                          <button onClick={() => deleteForMe(m.id)}>Delete for me</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Fragment>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply preview */}
        {replyingTo && (
          <div className="rkc-reply-preview">
            <span>Replying to: {replyingTo.message?.slice(0, 50)}{replyingTo.message?.length > 50 ? '…' : ''}</span>
            <button onClick={() => setReplyingTo(null)}>✕</button>
          </div>
        )}

        {/* Attachment preview */}
        {pendingFile && (
          <div className="rkc-attach-preview">
            {pendingFile.type.startsWith('video')
              ? <video src={pendingUrl} muted />
              : <img src={pendingUrl} alt="preview" />}
            <span>{pendingFile.name}</span>
            <button onClick={clearPending}>✕</button>
          </div>
        )}

        {/* Input row */}
        <div className="rkc-input-row">
          {/* Hidden file inputs */}
          <input type="file" accept="image/*,video/*" capture="environment"
            ref={cameraRef} style={{ display: 'none' }}
            onChange={e => handleFileChosen(e.target.files?.[0])} />
          <input type="file" accept="image/*,video/*"
            ref={galleryRef} style={{ display: 'none' }}
            onChange={e => handleFileChosen(e.target.files?.[0])} />

          <button type="button" className="rkc-plus-btn"
            onClick={() => setShowAttachMenu(p => !p)}
            aria-label="Attach media">
            +
          </button>

          {/* Desktop dropdown */}
          {showAttachMenu && !isMobile && (
            <div className="rkc-attach-menu-desktop" onClick={e => e.stopPropagation()}>
              <button onClick={() => { cameraRef.current?.click(); setShowAttachMenu(false); }}>
                <span>📷</span> Take Photo
              </button>
              <button onClick={() => { galleryRef.current?.click(); setShowAttachMenu(false); }}>
                <span>🖼️</span> Choose from Gallery
              </button>
            </div>
          )}

          <input
            type="text"
            className="rkc-text-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Message…"
          />
          <button
            className="rkc-send-btn"
            onClick={sendMessage}
            disabled={!input.trim() && !pendingFile}
            aria-label="Send message"
          >
            ➤
          </button>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {showAttachMenu && isMobile && (
        <div className="rkc-bottom-sheet-overlay" onClick={() => setShowAttachMenu(false)}>
          <div className="rkc-bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="rkc-bottom-sheet-handle" />
            <button onClick={() => { cameraRef.current?.click(); setShowAttachMenu(false); }}>
              <span className="rkc-bottom-sheet-icon">📷</span> Take Photo
            </button>
            <button onClick={() => { galleryRef.current?.click(); setShowAttachMenu(false); }}>
              <span className="rkc-bottom-sheet-icon">🖼️</span> Choose from Gallery
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
