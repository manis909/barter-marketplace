import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

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

/* ─── IST timestamp ─────────────────────────────────────────────────────── */
function formatTime(ts) {
  if (!ts) return '';
  // The DB column is TIMESTAMP (no timezone). The server runs in UTC, so the
  // value is UTC time but arrives without a 'Z' suffix — append it so that
  // new Date() parses it as UTC, not as local time.
  const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(ts) ? ts : ts.replace(' ', 'T') + 'Z';
  return new Date(normalized).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/* ─── Avatar (profile image with initial fallback) ─────────────────────── */
function Avatar({ name, imageUrl, size = 34 }) {
  const [imgErr, setImgErr] = useState(false);
  const src = imageUrl && !imgErr
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
        ? <img src={src} alt={name} onError={() => setImgErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : (name || '?').trim().charAt(0).toUpperCase()
      }
    </span>
  );
}

/* ─── Inline CSS (injected via <style>) ─────────────────────────────────── */
const CHAT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500&family=Manrope:wght@400;500&display=swap');

.cw-wrap {
  width: 100%; max-width: 100%; box-sizing: border-box;
  display: flex; flex-direction: column; flex: 1; min-height: 0; height: 100%;
  font-family: Manrope, sans-serif;
  overflow: hidden; /* contain everything — no page scroll */
}

/* ── Desktop header — always visible, never scrolls ── */
.cw-header {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border-bottom: 1px solid ${T.border};
  background: ${T.surface};
  flex-shrink: 0;   /* must not shrink */
  min-height: 0;
  z-index: 2;
}
.cw-header-name {
  font-size: 15px; font-weight: 600; color: ${T.text};
  font-family: Fraunces, serif; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; flex: 1;
}

/* Hide the in-window header on mobile — ChatsLayout's back bar already shows the name */
@media (max-width: 767px) { .cw-header { display: none !important; } }

.cw-container {
  display: flex; flex-direction: column;
  flex: 1;          /* fill all remaining height inside cw-wrap */
  min-height: 0;    /* CRITICAL — lets flexbox shrink below content height */
  border: 1px solid ${T.border}; border-radius: ${T.radiusCard};
  overflow: hidden; /* clip children — never let container itself scroll */
  background: ${T.surface};
  box-sizing: border-box;
  /* Inset spacing — replaces the removed padding on chatWindowWrap */
  margin: 12px 12px 0;
  width: calc(100% - 24px);
}
@media (max-width: 767px) {
  .cw-container {
    border-radius: 0; border-left: none; border-right: none; border-top: none;
    margin: 0; width: 100%;
  }
}

.cw-messages {
  flex: 1;          /* take all available space between header and input */
  min-height: 0;    /* CRITICAL — without this, flex won't clip the scroll area */
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 12px;
  display: flex; flex-direction: column; gap: 10px;
  width: 100%; box-sizing: border-box; background: ${T.bg};
  -webkit-overflow-scrolling: touch;
}
.cw-messages::-webkit-scrollbar { width: 4px; }
.cw-messages::-webkit-scrollbar-track { background: transparent; }
.cw-messages::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }

.cw-row { display: flex; flex-direction: column; max-width: 72%; position: relative; }
.cw-row.mine  { align-self: flex-end;  align-items: flex-end;  }
.cw-row.theirs{ align-self: flex-start; align-items: flex-start; }
@media (max-width: 767px) { .cw-row { max-width: 88%; } }

.cw-sender {
  font-size: 11px; font-weight: 500; color: ${T.muted};
  margin-bottom: 3px; margin-left: 4px;
}

.cw-bubble {
  padding: 9px 13px; border-radius: ${T.radiusCard};
  font-size: 13.5px; line-height: 1.5;
  word-break: break-word; overflow-wrap: break-word;
  cursor: pointer; position: relative;
  border: 1px solid transparent;
}
.cw-bubble.mine   { background: ${T.mine}; color: #fff; border-bottom-right-radius: 4px; }
.cw-bubble.theirs { background: ${T.theirs}; color: ${T.text}; border-bottom-left-radius: 4px; border-color: ${T.border}; }
.cw-bubble.mine:hover   { background: ${T.accentStrong}; }
.cw-bubble.theirs:hover { border-color: ${T.accent}; }

.cw-quote {
  border-left: 3px solid rgba(61,110,99,0.4); padding: 4px 8px;
  margin-bottom: 6px; font-size: 12px; opacity: 0.8;
  border-radius: 4px; background: rgba(61,110,99,0.07);
}

.cw-attachment { max-width: 220px; width: 100%; border-radius: 10px; margin-bottom: 6px; display: block; }
@media (max-width: 767px) { .cw-attachment { max-width: 180px; } }

.cw-ts { font-size: 10px; opacity: 0.6; display: block; margin-top: 3px; }

.cw-reactions { display: flex; gap: 4px; margin-top: 3px; flex-wrap: wrap; }
.cw-reaction-badge {
  font-size: 12px; background: ${T.surface}; border-radius: 999px;
  padding: 1px 7px; border: 1px solid ${T.border};
}

.cw-picker {
  display: flex; align-items: center; gap: 4px; padding: 5px 8px;
  background: ${T.surface}; border: 1px solid ${T.border};
  border-radius: 999px; position: absolute; top: -44px;
  width: max-content; max-width: 88vw; z-index: 20;
}
.cw-row.mine   .cw-picker { right: 0; left: auto; }
.cw-row.theirs .cw-picker { left: 0; right: auto; }
.cw-picker button { background: none; border: none; font-size: 17px; cursor: pointer; flex-shrink: 0; }

.cw-actions { display: flex; gap: 6px; margin-top: 4px; }
.cw-actions button {
  font-size: 11px; padding: 2px 7px; border: 1px solid ${T.border};
  background: ${T.surface}; cursor: pointer; color: ${T.muted};
  border-radius: 6px; transition: border-color 0.15s;
}
.cw-actions button:hover { border-color: ${T.accent}; color: ${T.accent}; }

.cw-del-menu {
  position: absolute; bottom: 26px; right: 0;
  background: ${T.surface}; border: 1px solid ${T.border};
  border-radius: ${T.radiusCard}; z-index: 8; display: flex;
  flex-direction: column; min-width: 155px; max-width: 90vw; overflow: hidden;
}
.cw-del-menu button {
  padding: 9px 13px; text-align: left; border: none; background: none;
  cursor: pointer; font-size: 12.5px; color: ${T.text};
  font-family: Manrope, sans-serif; transition: background 0.15s;
}
.cw-del-menu button:hover { background: ${T.bg}; }
.cw-del-menu button.danger { color: ${T.danger}; }

.cw-edit-row { display: flex; gap: 6px; align-items: center; }
.cw-edit-row input {
  flex: 1; min-width: 0; border-radius: 6px;
  border: 1px solid ${T.border}; padding: 4px 8px; font-size: 13.5px;
  background: #fff; color: ${T.text};
}
.cw-edit-row button { border: none; background: none; cursor: pointer; font-size: 14px; flex-shrink: 0; }

.cw-reply-preview {
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 12px; background: #EDF2F0;
  border-left: 3px solid ${T.accent}; font-size: 12.5px;
  margin: 0 12px 4px; border-radius: 6px;
  flex-shrink: 0; /* never scroll out of view */
  color: ${T.muted};
}
.cw-reply-preview button { background: none; border: none; cursor: pointer; font-size: 14px; color: ${T.muted}; }

.cw-attach-preview {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  background: #EDF2F0; margin: 0 12px 4px; border-radius: 8px;
  flex-shrink: 0; /* never scroll out of view */
}
.cw-attach-preview img, .cw-attach-preview video {
  width: 46px; height: 46px; object-fit: cover; border-radius: 7px;
}
.cw-attach-preview span { font-size: 12px; color: ${T.muted}; flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cw-attach-preview button { margin-left: auto; background: none; border: none; cursor: pointer; font-size: 14px; color: ${T.muted}; }

/* ── Input row — always visible, never scrolls ── */
.cw-input-row {
  display: flex; gap: 8px; padding: 10px 12px;
  border-top: 1px solid ${T.border}; box-sizing: border-box;
  align-items: center; background: ${T.surface};
  flex-shrink: 0;   /* must not shrink */
  width: 100%;
  position: relative; /* for the attach menu absolute positioning */
}
@media (max-width: 767px) {
  /* flex-shrink:0 is all that's needed — do NOT use position:sticky
     (it fights with the flex column layout and can cause the input to scroll away) */
  .cw-input-row { padding: 8px 10px; }
}

/* "+" attach button */
.cw-plus-btn {
  width: 36px; height: 36px; min-width: 36px; border-radius: 50%;
  border: 1px solid ${T.border}; background: ${T.surface}; color: ${T.accent};
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 400; flex-shrink: 0; line-height: 1;
  transition: border-color 0.15s, transform 0.15s;
}
.cw-plus-btn:hover { border-color: ${T.accent}; transform: translateY(-1px); }

/* Attach menu (Camera / Gallery) */
.cw-attach-menu {
  position: absolute; bottom: 54px; left: 12px;
  background: ${T.surface}; border: 1px solid ${T.border};
  border-radius: ${T.radiusCard}; z-index: 8;
  display: flex; flex-direction: column; min-width: 160px; overflow: hidden;
}
@media (max-width: 767px) { .cw-attach-menu { left: 10px; right: 10px; min-width: unset; } }
.cw-attach-menu button {
  padding: 11px 14px; text-align: left; border: none; background: none;
  cursor: pointer; font-size: 13.5px; color: ${T.text};
  display: flex; align-items: center; gap: 9px;
  font-family: Manrope, sans-serif; transition: background 0.15s;
}
.cw-attach-menu button:hover { background: ${T.bg}; }

.cw-text-input {
  flex: 1; min-width: 0; padding: 9px 14px;
  border-radius: ${T.radiusControl}; border: 1px solid ${T.border};
  outline: none; font-size: 14px; font-family: Manrope, sans-serif;
  background: ${T.surface}; color: ${T.text}; transition: border-color 0.2s;
}
.cw-text-input:focus { border-color: ${T.accent}; }
@media (max-width: 767px) { .cw-text-input { font-size: 16px; } }

.cw-send-btn {
  padding: 9px 20px; border-radius: ${T.radiusControl}; border: none;
  background: ${T.accent}; color: #fff; cursor: pointer; font-weight: 600;
  font-size: 13.5px; flex-shrink: 0; font-family: Manrope, sans-serif;
  transition: background 0.15s, transform 0.15s;
}
.cw-send-btn:hover { background: ${T.accentStrong}; transform: translateY(-1px); }

.cw-deleted-banner {
  padding: 14px; text-align: center; color: ${T.muted}; font-size: 13px; flex-shrink: 0;
}
`;

/* ─── Main component ────────────────────────────────────────────────────── */
export default function ChatWindow({
  tradeOfferId,
  currentUserId,
  otherUserName,
  otherUserImage,   // passed from ChatsLayout — used for desktop header avatar
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
  const [pendingFile,    setPendingFile]    = useState(null);
  const [pendingUrl,     setPendingUrl]     = useState(null);

  const socketRef      = useRef(null);
  const bottomRef      = useRef(null);
  const msgContRef     = useRef(null);
  const galleryRef     = useRef(null);
  const cameraRef      = useRef(null);
  const initialScrollDone = useRef(false);
  const prevMsgCount      = useRef(0);

  /* reset scroll guards whenever the conversation changes */
  useEffect(() => {
    initialScrollDone.current = false;
    prevMsgCount.current = 0;
  }, [tradeOfferId]);

  /* ── socket + polling (unchanged) ── */
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
    socket.on('newMessage',             m  => setMessages(p => [...p, m]));
    socket.on('messageReactionUpdated', m  => setMessages(p => p.map(x => x.id === m.id ? m : x)));
    socket.on('messageEdited',          m  => setMessages(p => p.map(x => x.id === m.id ? m : x)));
    socket.on('messageDeleted',         m  => setMessages(p => p.map(x => x.id === m.id ? m : x)));
    socket.on('chatDeletedForEveryone', pl => {
      if (String(pl.tradeOfferId) === String(tradeOfferId)) {
        setMessages([]);
        setDeletedForAll(true);
      }
    });
    socket.on('connect_error', e => console.log('Socket error:', e.message));

    const poll = setInterval(() => {
      fetch(`${API_URL}/api/chat/${tradeOfferId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => setMessages(Array.isArray(d) ? d : []));
    }, 5000);

    return () => { socket.disconnect(); clearInterval(poll); };
  }, [tradeOfferId]);

  /* ── scroll to bottom on initial load (unconditional, instant) ── */
  useEffect(() => {
    if (messages.length > 0 && !initialScrollDone.current) {
      initialScrollDone.current = true;
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [messages]);

  /* ── scroll to bottom on every new message (smooth, only when near bottom) ── */
  useEffect(() => {
    const c = msgContRef.current;
    if (!c) return;
    const isNewMessage = messages.length > prevMsgCount.current;
    prevMsgCount.current = messages.length;
    if (!isNewMessage) return;
    const distFromBottom = c.scrollHeight - c.scrollTop - c.clientHeight;
    if (distFromBottom < 200) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  /* ── cleanup object URLs ── */
  useEffect(() => () => { if (pendingUrl) URL.revokeObjectURL(pendingUrl); }, [pendingUrl]);

  /* ── send message (unchanged) ── */
  const sendMessage = async () => {
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
  };

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

  /* ── reactions / edit / delete (unchanged) ── */
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
  const headerName = otherUserName || messages.find(m => String(m.sender_id) !== String(currentUserId))?.sender_name || 'Chat';

  return (
    <div className="cw-wrap">
      <style>{CHAT_CSS}</style>

      {/* ── Desktop header: avatar + name, shown once, hidden on mobile ── */}
      <div className="cw-header">
        <Avatar name={headerName} imageUrl={otherUserImage} size={34} />
        <span className="cw-header-name">{headerName}</span>
      </div>

      <div className="cw-container">
        {deletedForAll && (
          <div className="cw-deleted-banner">This chat was deleted for everyone.</div>
        )}

        {/* ── Message list ── */}
        <div className="cw-messages" ref={msgContRef}>
          {messages.map(m => {
            const isMine      = String(m.sender_id) === String(currentUserId);
            const quoted      = m.reply_to_message_id ? findMsg(m.reply_to_message_id) : null;
            const reactions   = Object.entries(m.reactions || {});
            const isEditing   = editingId === m.id;
            const isSelected  = pickerForId === m.id;

            return (
              <div key={m.id} className={`cw-row ${isMine ? 'mine' : 'theirs'}`}>
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
                  {/* Emoji picker */}
                  {isSelected && !m.deleted && (
                    <div className="cw-picker" onClick={e => e.stopPropagation()}>
                      {EMOJI_OPTIONS.map(e => (
                        <button key={e} onClick={() => toggleReaction(m.id, e)}>{e}</button>
                      ))}
                    </div>
                  )}

                  {/* Quote */}
                  {quoted && !m.deleted && (
                    <div className="cw-quote">
                      {quoted.message?.slice(0, 60)}{quoted.message?.length > 60 ? '…' : ''}
                    </div>
                  )}

                  {/* Body */}
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
                      {m.attachment_url && (m.attachment_type === 'image' || String(m.attachment_type).startsWith('image/')) && (
                        <img
                          src={m.attachment_url.startsWith('http') ? m.attachment_url : `${API_URL}${m.attachment_url}`}
                          alt=""
                          className="cw-attachment"
                        />
                      )}
                      {m.attachment_url && (m.attachment_type === 'video' || String(m.attachment_type).startsWith('video/')) && (
                        <video
                          src={m.attachment_url.startsWith('http') ? m.attachment_url : `${API_URL}${m.attachment_url}`}
                          controls
                          className="cw-attachment"
                        />
                      )}
                      {m.message && (
                        <p style={{ margin: 0 }}>
                          {m.message}
                          {m.edited && <span style={{ fontSize: 10, opacity: 0.6 }}> (edited)</span>}
                        </p>
                      )}
                    </>
                  )}

                  {/* Timestamp — IST */}
                  {!m.deleted && (
                    <span className="cw-ts">{formatTime(m.created_at)}</span>
                  )}
                </div>

                {/* Reactions */}
                {reactions.length > 0 && !m.deleted && (
                  <div className="cw-reactions">
                    {reactions.map(([emoji, userIds]) => (
                      <span key={emoji} className="cw-reaction-badge">
                        {emoji}{userIds.length > 1 ? ` ${userIds.length}` : ''}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons (reply / edit / delete) */}
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
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply preview */}
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

        {/* ── Input row ── */}
        <div className="cw-input-row">

          {/* "+" button */}
          <button
            type="button"
            className="cw-plus-btn"
            onClick={() => setShowAttachMenu(p => !p)}
            aria-label="Attach media"
          >
            +
          </button>

          {/* Camera / Gallery menu */}
          {showAttachMenu && (
            <div className="cw-attach-menu" onClick={e => e.stopPropagation()}>
              <button onClick={() => { cameraRef.current?.click(); setShowAttachMenu(false); }}>
                📷 Camera
              </button>
              <button onClick={() => { galleryRef.current?.click(); setShowAttachMenu(false); }}>
                🖼️ Gallery
              </button>
            </div>
          )}

          {/* Camera input — capture from device camera */}
          <input
            type="file"
            accept="image/*,video/*"
            capture="environment"
            ref={cameraRef}
            style={{ display: 'none' }}
            onChange={e => handleFileChosen(e.target.files?.[0])}
          />

          {/* Gallery input — pick existing file */}
          <input
            type="file"
            accept="image/*,video/*"
            ref={galleryRef}
            style={{ display: 'none' }}
            onChange={e => handleFileChosen(e.target.files?.[0])}
          />

          <input
            type="text"
            className="cw-text-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
            placeholder="Type a message…"
          />

          <button className="cw-send-btn" onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}
