import { useEffect, useState, useRef, useCallback, Fragment } from 'react';
import { io } from 'socket.io-client';
import { fmtTime, formatChatDateHeader, getDateKey } from '../../utils/helpers';

const API_URL = 'http://localhost:5000';

/* ─── Design tokens (duplicated from ChatWindow.jsx — kept self-contained since Avatar/tokens aren't exported there) ─── */
const T = {
  bg:            '#F6F5F0',
  surface:       '#FFFFFF',
  text:          '#24231F',
  muted:         '#5F5B52',
  border:        '#E4E2D9',
  accent:        '#3D6E63',
  accentStrong:  '#2F5B4D',
  mine:          '#3D6E63',
  theirs:        '#EDF2F0',
  radiusCard:    '14px',
};

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

const SKC_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500&family=Manrope:wght@400;500&display=swap');

.skc-wrap {
  width: 100%; max-width: 100%; box-sizing: border-box;
  display: flex; flex-direction: column; flex: 1; min-height: 0; height: 100%;
  font-family: Manrope, sans-serif; overflow: hidden;
}
.skc-header {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border-bottom: 1px solid ${T.border};
  background: ${T.surface}; flex-shrink: 0; z-index: 2;
}
.skc-header-name {
  font-size: 15px; font-weight: 600; color: ${T.text};
  font-family: Fraunces, serif;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
@media (max-width: 767px) { .skc-header { display: none !important; } }

.skc-item-strip {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px; background: ${T.bg};
  border-bottom: 1px solid ${T.border}; flex-shrink: 0;
  font-size: 12.5px; color: ${T.muted};
}
.skc-item-strip-title { flex: 1; min-width: 0; font-weight: 500; color: ${T.text};
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.skc-item-strip-btn {
  padding: 4px 10px; border-radius: 6px; border: 1px solid ${T.accent};
  background: transparent; color: ${T.accent}; font-size: 11.5px;
  font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0;
  font-family: Manrope, sans-serif;
}

.skc-container {
  display: flex; flex-direction: column;
  flex: 1; min-height: 0;
  border: 1px solid ${T.border}; border-radius: ${T.radiusCard};
  overflow: hidden; background: ${T.surface};
  box-sizing: border-box; margin: 10px 12px 0; width: calc(100% - 24px);
}
@media (max-width: 767px) {
  .skc-container { border-radius: 0; border-left: none; border-right: none; border-top: none; margin: 0; width: 100%; }
}

.skc-messages {
  flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;
  padding: 14px 12px 8px; display: flex; flex-direction: column; gap: 8px;
  width: 100%; box-sizing: border-box; background: ${T.bg};
  scroll-behavior: smooth;
}
.skc-date-separator { display: flex; align-items: center; justify-content: center; margin: 10px 0 4px; }
.skc-date-pill {
  background: ${T.surface}; color: ${T.muted}; border: 1px solid ${T.border};
  font-size: 11px; font-weight: 600; padding: 3px 12px; border-radius: 12px;
}

.skc-row { display: flex; flex-direction: column; max-width: 72%; }
.skc-row.mine   { align-self: flex-end;  align-items: flex-end;  }
.skc-row.theirs { align-self: flex-start; align-items: flex-start; }
.skc-sender { font-size: 11px; font-weight: 500; color: ${T.muted}; margin-bottom: 2px; margin-left: 4px; }

.skc-bubble {
  padding: 8px 12px; border-radius: 14px; font-size: 14px; line-height: 1.5;
  word-break: break-word; overflow-wrap: break-word; border: 1px solid transparent;
}
.skc-bubble.mine   { background: ${T.mine}; color: #fff; border-bottom-right-radius: 3px; }
.skc-bubble.theirs { background: ${T.theirs}; color: ${T.text}; border-bottom-left-radius: 3px; border-color: ${T.border}; }

.skc-bubble-footer { display: flex; justify-content: flex-end; margin-top: 3px; }
.skc-ts { font-size: 10px; opacity: 0.65; }

.skc-input-row {
  display: flex; gap: 8px; padding: 10px 12px;
  border-top: 1px solid ${T.border}; box-sizing: border-box;
  align-items: center; background: ${T.surface}; flex-shrink: 0; width: 100%;
}
@media (max-width: 767px) { .skc-input-row { padding-bottom: max(10px, env(safe-area-inset-bottom)); } }

.skc-text-input {
  flex: 1; min-width: 0; padding: 9px 14px; border-radius: 22px; border: 1px solid ${T.border};
  outline: none; font-size: 14px; font-family: Manrope, sans-serif;
  background: ${T.bg}; color: ${T.text};
}
.skc-text-input:focus { border-color: ${T.accent}; background: ${T.surface}; }
@media (max-width: 767px) { .skc-text-input { font-size: 16px; } }

.skc-send-btn {
  width: 38px; height: 38px; min-width: 38px; border-radius: 50%; border: none;
  background: ${T.accent}; color: #fff; cursor: pointer; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
.skc-send-btn:hover { background: ${T.accentStrong}; }
.skc-send-btn:disabled { background: ${T.border}; cursor: default; }
`;

/* ─── Component ───────────────────────────────────────────────── */
export default function SkillBookingChatWindow({
  bookingId,
  currentUserId,
  otherUserName,
  otherUserImage,
  skillTitle,       // skill listing title for context strip (optional)
  skillListingId,   // for "View Skill" navigation (optional)
  onViewSkill,       // callback → navigate to skill listing page (optional)
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const msgContRef = useRef(null);
  const initialScrollDone = useRef(false);
  const prevMsgCount = useRef(0);

  useEffect(() => {
    initialScrollDone.current = false;
    prevMsgCount.current = 0;
    setMessages([]);
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    const token = localStorage.getItem('token');

    fetch(`${API_URL}/api/skill-chat/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setMessages(Array.isArray(d) ? d : []));

    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;
    socket.emit('joinSkillBooking', String(bookingId));
    socket.on('newSkillMessage', m => {
      if (String(m.booking_id) === String(bookingId)) {
        setMessages(prev => [...prev, m]);
      }
    });
    socket.on('connect_error', e => console.log('Socket:', e.message));

    // Polling fallback, same interval as trade chat
    const poll = setInterval(() => {
      fetch(`${API_URL}/api/skill-chat/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => setMessages(Array.isArray(d) ? d : []));
    }, 5000);

    return () => { socket.disconnect(); clearInterval(poll); };
  }, [bookingId]);

  useEffect(() => {
    if (messages.length > 0 && !initialScrollDone.current) {
      initialScrollDone.current = true;
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [messages]);

  useEffect(() => {
    const c = msgContRef.current;
    if (!c) return;
    const isNew = messages.length > prevMsgCount.current;
    prevMsgCount.current = messages.length;
    if (!isNew) return;
    const dist = c.scrollHeight - c.scrollTop - c.clientHeight;
    if (dist < 220) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/skill-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ booking_id: bookingId, message: input }),
    });
    setInput('');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [input, bookingId]);

  const headerName = otherUserName
    || messages.find(m => String(m.sender_id) !== String(currentUserId))?.sender_name
    || 'Chat';

  return (
    <div className="skc-wrap">
      <style>{SKC_CSS}</style>

      <div className="skc-header">
        <Avatar name={headerName} imageUrl={otherUserImage} size={36} />
        <div className="skc-header-name">{headerName}</div>
      </div>

      {skillTitle && (
        <div className="skc-item-strip">
          <span>🎓</span>
          <span className="skc-item-strip-title">{skillTitle}</span>
          {skillListingId && onViewSkill && (
            <button className="skc-item-strip-btn" onClick={() => onViewSkill(skillListingId)}>
              View Skill
            </button>
          )}
        </div>
      )}

      <div className="skc-container">
        <div className="skc-messages" ref={msgContRef}>
          {messages.map((m, idx) => {
            const isMine = String(m.sender_id) === String(currentUserId);
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const showDateSeparator = !prevMsg || getDateKey(m.created_at) !== getDateKey(prevMsg.created_at);
            const dateLabel = showDateSeparator ? formatChatDateHeader(m.created_at) : null;

            return (
              <Fragment key={m.id || idx}>
                {showDateSeparator && dateLabel && (
                  <div className="skc-date-separator">
                    <span className="skc-date-pill">{dateLabel}</span>
                  </div>
                )}
                <div className={`skc-row ${isMine ? 'mine' : 'theirs'}`}>
                  {!isMine && m.sender_name && <span className="skc-sender">{m.sender_name}</span>}
                  <div className={`skc-bubble ${isMine ? 'mine' : 'theirs'}`}>
                    <p style={{ margin: 0 }}>{m.message}</p>
                    <div className="skc-bubble-footer">
                      <span className="skc-ts">{fmtTime(m.created_at)}</span>
                    </div>
                  </div>
                </div>
              </Fragment>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="skc-input-row">
          <input
            type="text"
            className="skc-text-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Message…"
          />
          <button className="skc-send-btn" onClick={sendMessage} disabled={!input.trim()} aria-label="Send message">
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}