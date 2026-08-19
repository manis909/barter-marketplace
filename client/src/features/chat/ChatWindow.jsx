import { useEffect, useState, useRef, useCallback, Fragment } from 'react';
import { io } from 'socket.io-client';
import { fmtTime, fmtDate, formatChatDateHeader, getDateKey } from '../../utils/helpers';

const API_URL = 'http://localhost:5000';
const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/* ─── Design tokens ─────────────────────────────────────────────────────── */
const T = {
  bg:            '#F6F5F0',
  surface:       '#FFFFFF',
  text:          '#24231F',
  muted:         '#5F5B52',
  border:        '#E4E2D9',
  accent:        '#3D6E63',
  accentStrong:  '#2F5B4D',
  danger:        '#dc2626',
  mine:          '#3D6E63',
  theirs:        '#EDF2F0',
  radiusCard:    '14px',
  radiusControl: '9px',
};

/* ─── Avatar ────────────────────────────────────────────────────────────── */
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
        : (name || '?').trim().charAt(0).toUpperCase()
      }
    </span>
  );
}

/* ─── CSS ───────────────────────────────────────────────────────────────── */
const CHAT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500&family=Manrope:wght@400;500&display=swap');

/* ── Outer wrapper — fills whatever space ChatsLayout gives it ── */
.cw-wrap {
  width: 100%; max-width: 100%; box-sizing: border-box;
  display: flex; flex-direction: column; flex: 1; min-height: 0; height: 100%;
  font-family: Manrope, sans-serif; overflow: hidden;
}

/* ── Desktop header (hidden on mobile; mobile header lives in ChatsLayout) ── */
.cw-header {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border-bottom: 1px solid ${T.border};
  background: ${T.surface}; flex-shrink: 0; z-index: 2;
}
.cw-header-info { flex: 1; min-width: 0; }
.cw-header-name {
  font-size: 15px; font-weight: 600; color: ${T.text};
  font-family: Fraunces, serif;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cw-header-status { font-size: 11px; color: ${T.muted}; margin-top: 1px; }
@media (max-width: 767px) { .cw-header { display: none !important; } }

/* ── Item context strip ── */
.cw-item-strip {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px; background: ${T.bg};
  border-bottom: 1px solid ${T.border}; flex-shrink: 0;
  font-size: 12.5px; color: ${T.muted};
}
.cw-item-strip-title {
  flex: 1; min-width: 0; font-weight: 500; color: ${T.text};
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cw-item-strip-btn {
  padding: 4px 10px; border-radius: 6px; border: 1px solid ${T.accent};
  background: transparent; color: ${T.accent}; font-size: 11.5px;
  font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0;
  font-family: Manrope, sans-serif; transition: background 0.15s;
}
.cw-item-strip-btn:hover { background: rgba(61,110,99,0.08); }

/* ── Bordered container wrapping messages + input ── */
.cw-container {
  display: flex; flex-direction: column;
  flex: 1; min-height: 0;
  border: 1px solid ${T.border}; border-radius: ${T.radiusCard};
  overflow: hidden; background: ${T.surface};
  box-sizing: border-box;
  margin: 10px 12px 0; width: calc(100% - 24px);
}
@media (max-width: 767px) {
  .cw-container {
    border-radius: 0; border-left: none; border-right: none; border-top: none;
    margin: 0; width: 100%;
  }
}

/* ── Message scroll area ── */
.cw-messages {
  flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;
  padding: 14px 12px 8px; display: flex; flex-direction: column; gap: 8px;
  width: 100%; box-sizing: border-box; background: ${T.bg};
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}
.cw-messages::-webkit-scrollbar { width: 3px; }
.cw-messages::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }

/* ── Date separator pill ── */
.cw-date-separator {
  display: flex; align-items: center; justify-content: center;
  margin: 10px 0 4px; width: 100%; box-sizing: border-box;
}
.cw-date-pill {
  background: ${T.surface}; color: ${T.muted};
  border: 1px solid ${T.border}; font-size: 11px; font-weight: 600;
  padding: 3px 12px; border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  letter-spacing: 0.2px; user-select: none;
}

/* ── Message row ── */
.cw-row { display: flex; flex-direction: column; max-width: 72%; position: relative; }
.cw-row.mine   { align-self: flex-end;  align-items: flex-end;  }
.cw-row.theirs { align-self: flex-start; align-items: flex-start; }
@media (max-width: 767px) { .cw-row { max-width: 75%; } }

.cw-sender { font-size: 11px; font-weight: 500; color: ${T.muted}; margin-bottom: 2px; margin-left: 4px; }

/* ── Bubble ── */
.cw-bubble {
  padding: 8px 12px; border-radius: 14px;
  font-size: 14px; line-height: 1.5;
  word-break: break-word; overflow-wrap: break-word;
  cursor: pointer; position: relative; border: 1px solid transparent;
  transition: filter 0.12s;
}
.cw-bubble.mine   { background: ${T.mine}; color: #fff; border-bottom-right-radius: 3px; }
.cw-bubble.theirs { background: ${T.theirs}; color: ${T.text}; border-bottom-left-radius: 3px; border-color: ${T.border}; }
.cw-bubble.mine:hover   { filter: brightness(0.92); }
.cw-bubble.theirs:hover { border-color: ${T.accent}; }
@media (max-width: 767px) { .cw-bubble { font-size: 14.5px; } }

/* ── Bubble footer: timestamp + status ── */
.cw-bubble-footer {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 4px; margin-top: 3px;
}
.cw-ts { font-size: 10px; opacity: 0.65; }
/* Sent status placeholder — ✓ shown for own messages */
.cw-status { font-size: 11px; opacity: 0.7; letter-spacing: -1px; }

.cw-quote {
  border-left: 3px solid rgba(61,110,99,0.4); padding: 4px 8px;
  margin-bottom: 5px; font-size: 12px; opacity: 0.8;
  border-radius: 4px; background: rgba(61,110,99,0.07);
}

/* ── Attachments inside bubble ── */
.cw-attachment {
  max-width: 220px; width: 100%; border-radius: 10px; margin-bottom: 5px;
  display: block; cursor: pointer;
}
@media (max-width: 767px) { .cw-attachment { max-width: 200px; } }

/* ── Reactions ── */
.cw-reactions { display: flex; gap: 4px; margin-top: 3px; flex-wrap: wrap; }
.cw-reaction-badge {
  font-size: 12px; background: ${T.surface}; border-radius: 999px;
  padding: 1px 7px; border: 1px solid ${T.border};
}

/* ── Emoji picker ── */
.cw-picker {
  display: flex; align-items: center; gap: 3px; padding: 5px 8px;
  background: ${T.surface}; border: 1px solid ${T.border};
  border-radius: 999px; position: absolute; top: -44px;
  width: max-content; max-width: 88vw; z-index: 20;
}
.cw-row.mine   .cw-picker { right: 0; left: auto; }
.cw-row.theirs .cw-picker { left: 0;  right: auto; }
.cw-picker button { background: none; border: none; font-size: 18px; cursor: pointer; flex-shrink: 0; padding: 2px; }

/* ── Action buttons (reply / edit / delete) ── */
.cw-actions { display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
.cw-actions button {
  font-size: 11px; padding: 3px 8px; border: 1px solid ${T.border};
  background: ${T.surface}; cursor: pointer; color: ${T.muted};
  border-radius: 6px; transition: border-color 0.12s; font-family: Manrope, sans-serif;
}
.cw-actions button:hover { border-color: ${T.accent}; color: ${T.accent}; }

/* ── Delete sub-menu ── */
.cw-del-menu {
  position: absolute; bottom: 26px; right: 0;
  background: ${T.surface}; border: 1px solid ${T.border};
  border-radius: ${T.radiusCard}; z-index: 8;
  display: flex; flex-direction: column; min-width: 155px; max-width: 90vw; overflow: hidden;
}
.cw-del-menu button {
  padding: 9px 13px; text-align: left; border: none; background: none;
  cursor: pointer; font-size: 12.5px; color: ${T.text};
  font-family: Manrope, sans-serif; transition: background 0.12s;
}
.cw-del-menu button:hover { background: ${T.bg}; }
.cw-del-menu button.danger { color: ${T.danger}; }

/* ── Edit row ── */
.cw-edit-row { display: flex; gap: 6px; align-items: center; }
.cw-edit-row input {
  flex: 1; min-width: 0; border-radius: 6px;
  border: 1px solid ${T.border}; padding: 4px 8px; font-size: 13.5px;
  background: #fff; color: ${T.text};
}
.cw-edit-row button { border: none; background: none; cursor: pointer; font-size: 14px; flex-shrink: 0; }

/* ── Reply / attach previews ── */
.cw-reply-preview {
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 12px; background: #EDF2F0;
  border-left: 3px solid ${T.accent}; font-size: 12.5px;
  margin: 0; border-top: 1px solid ${T.border};
  flex-shrink: 0; color: ${T.muted};
}
.cw-reply-preview button { background: none; border: none; cursor: pointer; font-size: 14px; color: ${T.muted}; }
.cw-attach-preview {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  background: #EDF2F0; border-top: 1px solid ${T.border}; flex-shrink: 0;
}
.cw-attach-preview img, .cw-attach-preview video {
  width: 48px; height: 48px; object-fit: cover; border-radius: 8px;
}
.cw-attach-preview span { font-size: 12px; color: ${T.muted}; flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cw-attach-preview button { margin-left: auto; background: none; border: none; cursor: pointer; font-size: 16px; color: ${T.muted}; }

/* ── Input row ── */
.cw-input-row {
  display: flex; gap: 8px; padding: 10px 12px;
  border-top: 1px solid ${T.border}; box-sizing: border-box;
  align-items: center; background: ${T.surface};
  flex-shrink: 0; width: 100%; position: relative;
}
@media (max-width: 767px) {
  .cw-input-row {
    padding: 8px 10px;
    /* Push the input above the home indicator on notched iPhones */
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }
}

/* ── "+" attach button ── */
.cw-plus-btn {
  width: 38px; height: 38px; min-width: 38px; border-radius: 50%;
  border: 1px solid ${T.border}; background: ${T.surface}; color: ${T.accent};
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 300; flex-shrink: 0; line-height: 1;
  transition: border-color 0.12s, background 0.12s;
}
.cw-plus-btn:hover { border-color: ${T.accent}; background: rgba(61,110,99,0.06); }

/* ── Desktop attach dropdown ── */
.cw-attach-menu-desktop {
  position: absolute; bottom: 56px; left: 12px;
  background: ${T.surface}; border: 1px solid ${T.border};
  border-radius: ${T.radiusCard}; z-index: 30;
  display: flex; flex-direction: column; min-width: 170px; overflow: hidden;
}
.cw-attach-menu-desktop button {
  padding: 11px 14px; text-align: left; border: none; background: none;
  cursor: pointer; font-size: 13.5px; color: ${T.text};
  display: flex; align-items: center; gap: 9px;
  font-family: Manrope, sans-serif; transition: background 0.12s;
}
.cw-attach-menu-desktop button:hover { background: ${T.bg}; }

/* ── Mobile bottom sheet ── */
.cw-bottom-sheet-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35);
  z-index: 200; display: flex; align-items: flex-end; justify-content: center;
}
.cw-bottom-sheet {
  width: 100%; max-width: 480px;
  background: ${T.surface}; border-radius: 20px 20px 0 0;
  padding: 12px 0 calc(12px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}
.cw-bottom-sheet-handle {
  width: 36px; height: 4px; border-radius: 2px; background: ${T.border};
  margin: 0 auto 16px;
}
.cw-bottom-sheet button {
  display: flex; align-items: center; gap: 14px;
  width: 100%; padding: 14px 20px; border: none; background: none;
  cursor: pointer; font-size: 15px; color: ${T.text};
  font-family: Manrope, sans-serif; text-align: left;
  transition: background 0.12s;
}
.cw-bottom-sheet button:hover, .cw-bottom-sheet button:active { background: ${T.bg}; }
.cw-bottom-sheet-icon { font-size: 22px; width: 28px; text-align: center; }

/* ── Text input ── */
.cw-text-input {
  flex: 1; min-width: 0; padding: 9px 14px;
  border-radius: 22px; border: 1px solid ${T.border};
  outline: none; font-size: 14px; font-family: Manrope, sans-serif;
  background: ${T.bg}; color: ${T.text}; transition: border-color 0.18s;
  line-height: 1.4;
}
.cw-text-input:focus { border-color: ${T.accent}; background: ${T.surface}; }
@media (max-width: 767px) { .cw-text-input { font-size: 16px; } }

/* ── Send button ── */
.cw-send-btn {
  width: 38px; height: 38px; min-width: 38px; border-radius: 50%; border: none;
  background: ${T.accent}; color: #fff; cursor: pointer; font-weight: 700;
  font-size: 16px; flex-shrink: 0; display: flex; align-items: center;
  justify-content: center; transition: background 0.12s, transform 0.12s;
}
.cw-send-btn:hover { background: ${T.accentStrong}; transform: scale(1.06); }
.cw-send-btn:disabled { background: ${T.border}; cursor: default; transform: none; }

/* ── Deleted banner ── */
.cw-deleted-banner {
  padding: 10px 14px; text-align: center; color: ${T.muted}; font-size: 13px;
  flex-shrink: 0; background: ${T.bg}; border-bottom: 1px solid ${T.border};
}

/* ── Chat locked banner (replaces input when trade is completed) ── */
.cw-chat-locked {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 14px 16px; flex-shrink: 0;
  background: ${T.bg}; border-top: 1px solid ${T.border};
  font-size: 13px; color: ${T.muted}; font-family: Manrope, sans-serif;
  text-align: center;
}
.cw-chat-locked-icon { font-size: 15px; flex-shrink: 0; }
`;

/* ─── Trade completed system message (renders inside .cw-messages scroll area) ── */
function TradeCompletedSystemMsg({ completedAt }) {
  const label = completedAt ? fmtDate(completedAt) : null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '14px 4px', alignSelf: 'stretch',
    }}>
      <div style={{ flex: 1, height: 1, background: '#C9E5D8' }} />
      <div style={{
        textAlign: 'center', padding: '10px 18px',
        background: '#EEF7F2', border: '1px solid #C9E5D8',
        borderRadius: '999px', fontFamily: 'Manrope, sans-serif',
      }}>
        <div style={{ fontSize: 15 }}>✅</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#3D6E63', marginTop: 2 }}>
          Trade Completed
        </div>
        <div style={{ fontSize: 11, color: '#5F5B52', marginTop: 1 }}>
          Both users confirmed the exchange.
        </div>
        {label && (
          <div style={{ fontSize: 10.5, color: '#5F5B52', marginTop: 2 }}>{label}</div>
        )}
      </div>
      <div style={{ flex: 1, height: 1, background: '#C9E5D8' }} />
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function ChatWindow({
  tradeOfferId,
  currentUserId,
  otherUserName,
  otherUserImage,
  otherUserId,         // ID of the other party — used for presence checks
  tradeItemTitle,      // item title for context strip
  tradeItemId,         // item ID for "View Item" navigation
  onViewItem,          // callback → navigate to item page
  tradeCompletedAt,    // non-null when trade is completed; rendered as system message inside scroll area
  chatLocked,          // true when trade.status === 'completed' — disables sending
}) {
  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState('');
  const [replyingTo,     setReplyingTo]     = useState(null);
  const [pickerForId,    setPickerForId]    = useState(null);
  const [deletedForAll,  setDeletedForAll]  = useState(false);
  const [editingId,      setEditingId]      = useState(null);
  const [editText,       setEditText]       = useState('');
  const [deleteMenuId,   setDeleteMenuId]   = useState(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isMobile,       setIsMobile]       = useState(() => window.innerWidth < 768);
  const [pendingFile,    setPendingFile]    = useState(null);
  const [pendingUrl,     setPendingUrl]     = useState(null);
  /* presence & read receipts */
  const [isOtherOnline,  setIsOtherOnline]  = useState(false);
  const [chatIsRead,     setChatIsRead]     = useState(false);

  const socketRef          = useRef(null);
  const bottomRef          = useRef(null);
  const msgContRef         = useRef(null);
  const galleryRef         = useRef(null);
  const cameraRef          = useRef(null);
  const fileRef            = useRef(null);
  const initialScrollDone  = useRef(false);
  const prevMsgCount       = useRef(0);

  /* detect mobile/desktop on resize */
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  /* reset scroll guards on trade switch */
  useEffect(() => {
    initialScrollDone.current = false;
    prevMsgCount.current = 0;
    setMessages([]);
    setDeletedForAll(false);
    setChatIsRead(false);   // reset read state when switching conversations
  }, [tradeOfferId]);

  /* ── socket + polling (logic unchanged) ── */
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/chat/${tradeOfferId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setMessages(Array.isArray(d) ? d : []));

    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;
    socket.emit('joinTrade', String(tradeOfferId));
    socket.on('newMessage',             m => setMessages(p => [...p, m]));
    socket.on('messageReactionUpdated', m => setMessages(p => p.map(x => x.id === m.id ? m : x)));
    socket.on('messageEdited',          m => setMessages(p => p.map(x => x.id === m.id ? m : x)));
    socket.on('messageDeleted',         m => setMessages(p => p.map(x => x.id === m.id ? m : x)));
    socket.on('chatDeletedForEveryone', pl => {
      if (String(pl.tradeOfferId) === String(tradeOfferId)) {
        setMessages([]); setDeletedForAll(true);
      }
    });
    socket.on('connect_error', e => console.log('Socket:', e.message));

    /* ── Presence events ── */
    socket.on('userOnline', ({ userId: uid }) => {
      if (String(uid) === String(otherUserId)) setIsOtherOnline(true);
    });
    socket.on('userOffline', ({ userId: uid }) => {
      if (String(uid) === String(otherUserId)) setIsOtherOnline(false);
    });

    /* ── Read receipt: other user opened this chat ── */
    socket.on('messagesRead', ({ tradeOfferId: tid }) => {
      if (String(tid) === String(tradeOfferId)) setChatIsRead(true);
    });

    /* ── Tell the other side our messages are read when we open ── */
    socket.emit('markRead', { tradeOfferId: String(tradeOfferId) });

    const poll = setInterval(() => {
      fetch(`${API_URL}/api/chat/${tradeOfferId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => setMessages(Array.isArray(d) ? d : []));
    }, 5000);

    return () => { socket.disconnect(); clearInterval(poll); };
  }, [tradeOfferId]);

  /* ── scroll to bottom on first load (instant) ── */
  useEffect(() => {
    if (messages.length > 0 && !initialScrollDone.current) {
      initialScrollDone.current = true;
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [messages]);

  /* ── scroll to bottom on new messages (smooth, only when near bottom) ── */
  useEffect(() => {
    const c = msgContRef.current;
    if (!c) return;
    const isNew = messages.length > prevMsgCount.current;
    prevMsgCount.current = messages.length;
    if (!isNew) return;
    const dist = c.scrollHeight - c.scrollTop - c.clientHeight;
    if (dist < 220) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── keyboard: scroll to bottom when virtual keyboard opens ── */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const c = msgContRef.current;
      if (!c) return;
      const dist = c.scrollHeight - c.scrollTop - c.clientHeight;
      if (dist < 300) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, []);

  /* ── cleanup object URLs ── */
  useEffect(() => () => { if (pendingUrl) URL.revokeObjectURL(pendingUrl); }, [pendingUrl]);

  /* ── send (logic unchanged) ── */
  const sendMessage = useCallback(async () => {
    if (!input.trim() && !pendingFile) return;
    const token = localStorage.getItem('token');
    if (pendingFile) {
      const fd = new FormData();
      fd.append('trade_offer_id', tradeOfferId);
      fd.append('message', input);
      if (replyingTo?.id) fd.append('reply_to_message_id', replyingTo.id);
      fd.append('attachment', pendingFile);
      await fetch(`${API_URL}/api/chat`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
    } else {
      await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          trade_offer_id: tradeOfferId,
          message: input,
          reply_to_message_id: replyingTo?.id || null,
        }),
      });
    }
    setInput(''); setReplyingTo(null); setDeletedForAll(false); clearPending();
    // force scroll to bottom after sending
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [input, pendingFile, tradeOfferId, replyingTo]);

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

  /* ── reactions / edit / delete (logic unchanged) ── */
  const toggleReaction = async (msgId, emoji) => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/chat/${msgId}/react`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ emoji }),
    });
    setPickerForId(null);
  };

  const saveEdit = async msgId => {
    if (!editText.trim()) return;
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/chat/${msgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: editText }),
    });
    setEditingId(null); setEditText('');
  };

  const deleteForEveryone = async msgId => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/chat/message/${msgId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    setDeleteMenuId(null);
  };

  const deleteForMe = async msgId => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/chat/message/${msgId}/hide`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    setMessages(p => p.filter(m => m.id !== msgId));
    setDeleteMenuId(null);
  };

  const findMsg = id => messages.find(m => m.id === id);
  const headerName = otherUserName
    || messages.find(m => String(m.sender_id) !== String(currentUserId))?.sender_name
    || 'Chat';

  return (
    <div className="cw-wrap">
      <style>{CHAT_CSS}</style>

      {/* ── Item context strip ── */}
      {tradeItemTitle && (
        <div className="cw-item-strip">
          <span>🛍</span>
          <span className="cw-item-strip-title">{tradeItemTitle}</span>
          {tradeItemId && onViewItem && (
            <button className="cw-item-strip-btn" onClick={() => onViewItem(tradeItemId)}>
              View Item
            </button>
          )}
        </div>
      )}

      <div className="cw-container">
        {deletedForAll && (
          <div className="cw-deleted-banner">This chat was deleted for everyone.</div>
        )}

        {/* ── Messages ── */}
        <div className="cw-messages" ref={msgContRef}>
          {messages.map((m, idx) => {
            const isMine     = String(m.sender_id) === String(currentUserId);
            const quoted     = m.reply_to_message_id ? findMsg(m.reply_to_message_id) : null;
            const reactions  = Object.entries(m.reactions || {});
            const isEditing  = editingId === m.id;
            const isSelected = pickerForId === m.id;
            const attachSrc  = m.attachment_url
              ? (m.attachment_url.startsWith('http') ? m.attachment_url : `${API_URL}${m.attachment_url}`)
              : null;
            const isImg = attachSrc && (m.attachment_type === 'image' || String(m.attachment_type).startsWith('image/'));
            const isVid = attachSrc && (m.attachment_type === 'video' || String(m.attachment_type).startsWith('video/'));

            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const showDateSeparator = !prevMsg || getDateKey(m.created_at) !== getDateKey(prevMsg.created_at);
            const dateLabel = showDateSeparator ? formatChatDateHeader(m.created_at) : null;

            return (
              <Fragment key={m.id || idx}>
                {showDateSeparator && dateLabel && (
                  <div className="cw-date-separator">
                    <span className="cw-date-pill">{dateLabel}</span>
                  </div>
                )}
                <div className={`cw-row ${isMine ? 'mine' : 'theirs'}`}>
                {!isMine && m.sender_name && (
                  <span className="cw-sender">{m.sender_name}</span>
                )}

                <div
                  className={`cw-bubble ${isMine ? 'mine' : 'theirs'}`}
                  onClick={() => {
                    if (m.deleted || isEditing) return;
                    setPickerForId(isSelected ? null : m.id);
                    setDeleteMenuId(null);
                  }}
                >
                  {isSelected && !m.deleted && (
                    <div className="cw-picker" onClick={e => e.stopPropagation()}>
                      {EMOJI_OPTIONS.map(e => (
                        <button key={e} onClick={() => toggleReaction(m.id, e)}>{e}</button>
                      ))}
                    </div>
                  )}

                  {quoted && !m.deleted && (
                    <div className="cw-quote">
                      {quoted.message?.slice(0, 60)}{quoted.message?.length > 60 ? '…' : ''}
                    </div>
                  )}

                  {m.deleted ? (
                    <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.55 }}>
                      This message was deleted
                    </p>
                  ) : isEditing ? (
                    <div className="cw-edit-row" onClick={e => e.stopPropagation()}>
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
                      {isImg && <img src={attachSrc} alt="" className="cw-attachment" />}
                      {isVid && <video src={attachSrc} controls className="cw-attachment" />}
                      {m.message && (
                        <p style={{ margin: 0 }}>
                          {m.message}
                          {m.edited && <span style={{ fontSize: 10, opacity: 0.6 }}> (edited)</span>}
                        </p>
                      )}
                    </>
                  )}

                  {/* Timestamp + sent status */}
                  {!m.deleted && (
                    <div className="cw-bubble-footer">
                      <span className="cw-ts">{fmtTime(m.created_at)}</span>
                      {/* ✓ for own messages; turns blue when recipient has read the chat */}
                      {isMine && (
                        <span className="cw-status" style={{ color: chatIsRead ? '#53bdeb' : 'rgba(255,255,255,0.7)' }}>
                          ✓✓
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {reactions.length > 0 && !m.deleted && (
                  <div className="cw-reactions">
                    {reactions.map(([emoji, userIds]) => (
                      <span key={emoji} className="cw-reaction-badge">
                        {emoji}{userIds.length > 1 ? ` ${userIds.length}` : ''}
                      </span>
                    ))}
                  </div>
                )}

                {!m.deleted && !isEditing && isSelected && (
                  <div className="cw-actions" onClick={e => e.stopPropagation()}>
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
                      <div className="cw-del-menu" onClick={e => e.stopPropagation()}>
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
          {/* Trade completed system message — scrolls naturally with messages */}
          {tradeCompletedAt != null && <TradeCompletedSystemMsg completedAt={tradeCompletedAt} />}

          <div ref={bottomRef} />
        </div>
        {replyingTo && (
          <div className="cw-reply-preview">
            <span>Replying to: {replyingTo.message?.slice(0, 50)}{replyingTo.message?.length > 50 ? '…' : ''}</span>
            <button onClick={() => setReplyingTo(null)}>✕</button>
          </div>
        )}

        {/* Attachment preview */}
        {pendingFile && (
          <div className="cw-attach-preview">
            {pendingFile.type.startsWith('video')
              ? <video src={pendingUrl} muted />
              : <img src={pendingUrl} alt="preview" />
            }
            <span>{pendingFile.name}</span>
            <button onClick={clearPending}>✕</button>
          </div>
        )}

        {/* ── Input row OR locked banner ── */}
        {chatLocked ? (
          <div className="cw-chat-locked">
            <span className="cw-chat-locked-icon">🔒</span>
            This conversation is closed. The trade has been completed.
          </div>
        ) : (
        <div className="cw-input-row">

          {/* Hidden file inputs */}
          <input type="file" accept="image/*,video/*" capture="environment"
            ref={cameraRef} style={{ display: 'none' }}
            onChange={e => handleFileChosen(e.target.files?.[0])} />
          <input type="file" accept="image/*,video/*"
            ref={galleryRef} style={{ display: 'none' }}
            onChange={e => handleFileChosen(e.target.files?.[0])} />
          <input type="file" accept="*/*"
            ref={fileRef} style={{ display: 'none' }}
            onChange={e => handleFileChosen(e.target.files?.[0])} />

          {/* "+" button */}
          <button type="button" className="cw-plus-btn"
            onClick={() => setShowAttachMenu(p => !p)}
            aria-label="Attach media">
            +
          </button>

          {/* Desktop: dropdown. Mobile: bottom sheet rendered via portal below */}
          {showAttachMenu && !isMobile && (
            <div className="cw-attach-menu-desktop" onClick={e => e.stopPropagation()}>
              <button onClick={() => { cameraRef.current?.click(); setShowAttachMenu(false); }}>
                <span>📷</span> Take Photo
              </button>
              <button onClick={() => { galleryRef.current?.click(); setShowAttachMenu(false); }}>
                <span>🖼️</span> Choose from Gallery
              </button>
              <button onClick={() => { fileRef.current?.click(); setShowAttachMenu(false); }}>
                <span>📄</span> Attach File
              </button>
            </div>
          )}

          <input
            type="text"
            className="cw-text-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Message…"
          />

          <button
            className="cw-send-btn"
            onClick={sendMessage}
            disabled={!input.trim() && !pendingFile}
            aria-label="Send message"
          >
            ➤
          </button>
        </div>
        )}
      </div>

      {/* Mobile bottom sheet for attachments */}
      {showAttachMenu && isMobile && (
        <div className="cw-bottom-sheet-overlay" onClick={() => setShowAttachMenu(false)}>
          <div className="cw-bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="cw-bottom-sheet-handle" />
            <button onClick={() => { cameraRef.current?.click(); setShowAttachMenu(false); }}>
              <span className="cw-bottom-sheet-icon">📷</span> Take Photo
            </button>
            <button onClick={() => { galleryRef.current?.click(); setShowAttachMenu(false); }}>
              <span className="cw-bottom-sheet-icon">🖼️</span> Choose from Gallery
            </button>
            <button onClick={() => { fileRef.current?.click(); setShowAttachMenu(false); }}>
              <span className="cw-bottom-sheet-icon">📄</span> Attach File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
