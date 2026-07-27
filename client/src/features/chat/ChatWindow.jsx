import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5000';
const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢'];

// Responsive + bubble styling, injected once via <style> (same pattern used elsewhere in this app)
const CHAT_CSS = `
.chatwindow-container {
  display: flex;
  flex-direction: column;
  height: 60vh;
  min-height: 320px;
  border: 1px solid var(--border, #ccc);
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg, #fff);
}
.chatwindow-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chatwindow-bubble-row {
  display: flex;
  flex-direction: column;
  max-width: 78%;
  position: relative;
}
.chatwindow-bubble-row.mine { align-self: flex-end; align-items: flex-end; }
.chatwindow-bubble-row.theirs { align-self: flex-start; align-items: flex-start; }
.chatwindow-bubble {
  padding: 8px 12px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.4;
  word-break: break-word;
  cursor: pointer;
  position: relative;
}
.chatwindow-bubble.mine {
  background: var(--accent, #16a34a);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.chatwindow-bubble.theirs {
  background: var(--social-bg, #f1f1f1);
  color: var(--text-h, #111);
  border-bottom-left-radius: 4px;
}
.chatwindow-quote {
  border-left: 3px solid rgba(0,0,0,0.25);
  padding: 4px 8px;
  margin-bottom: 4px;
  font-size: 12px;
  opacity: 0.85;
  border-radius: 4px;
  background: rgba(0,0,0,0.06);
}
.chatwindow-actions {
  display: flex;
  gap: 6px;
  margin-top: 2px;
}
.chatwindow-actions button {
  font-size: 11px;
  padding: 2px 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text, #666);
}
.chatwindow-reactions {
  display: flex;
  gap: 4px;
  margin-top: 2px;
  flex-wrap: wrap;
}
.chatwindow-reaction-badge {
  font-size: 12px;
  background: var(--border, #eee);
  border-radius: 999px;
  padding: 1px 6px;
}
.chatwindow-picker {
  display: flex;
  gap: 4px;
  padding: 4px 6px;
  background: var(--bg, #fff);
  border: 1px solid var(--border, #ccc);
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  position: absolute;
  top: -34px;
  z-index: 5;
}
.chatwindow-picker button {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
}
.chatwindow-reply-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: var(--social-bg, #f1f1f1);
  border-left: 3px solid var(--accent, #16a34a);
  font-size: 12.5px;
  margin: 0 12px;
  border-radius: 6px;
}
.chatwindow-input-row {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--border, #ccc);
}
.chatwindow-input-row input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--border, #ccc);
  outline: none;
  font-size: 14px;
}
.chatwindow-input-row button {
  padding: 8px 18px;
  border-radius: 999px;
  border: none;
  background: var(--accent, #16a34a);
  color: #fff;
  cursor: pointer;
  font-weight: 600;
}

@media (max-width: 600px) {
  .chatwindow-container { height: 70vh; border-radius: 0; }
  .chatwindow-bubble-row { max-width: 88%; }
}
`;

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatWindow({ tradeOfferId, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [pickerForId, setPickerForId] = useState(null);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    fetch(`${API_URL}/api/chat/${tradeOfferId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setMessages(Array.isArray(data) ? data : []));

    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.emit('joinTrade', String(tradeOfferId));

    socket.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // CHANGED: listen for reaction updates and patch the matching message in place
    socket.on('messageReactionUpdated', (updatedMessage) => {
      setMessages(prev => prev.map(m => (m.id === updatedMessage.id ? updatedMessage : m)));
    });

    socket.on('connect_error', (err) => {
      console.log('Socket connection failed:', err.message);
    });

    const pollInterval = setInterval(() => {
      fetch(`${API_URL}/api/chat/${tradeOfferId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setMessages(Array.isArray(data) ? data : []));
    }, 5000);

    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
    };
  }, [tradeOfferId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const token = localStorage.getItem('token');

    await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      // CHANGED: includes reply_to_message_id when replying to a specific message
      body: JSON.stringify({
        trade_offer_id: tradeOfferId,
        message: input,
        reply_to_message_id: replyingTo?.id || null,
      })
    });

    setInput('');
    setReplyingTo(null);
  };

  // CHANGED: toggles a reaction via the new backend route
  const toggleReaction = async (messageId, emoji) => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/chat/${messageId}/react`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ emoji }),
    });
    setPickerForId(null);
  };

  const findMessageById = (id) => messages.find(m => m.id === id);

  return (
    <div>
      <style>{CHAT_CSS}</style>
      <div className="chatwindow-container">
        <div className="chatwindow-messages">
          {messages.map(m => {
            const isMine = m.sender_id === currentUserId;
            const quoted = m.reply_to_message_id ? findMessageById(m.reply_to_message_id) : null;
            const reactionEntries = Object.entries(m.reactions || {});

            return (
              <div key={m.id} className={`chatwindow-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                <div
                  className={`chatwindow-bubble ${isMine ? 'mine' : 'theirs'}`}
                  onClick={() => setPickerForId(pickerForId === m.id ? null : m.id)}
                >
                  {pickerForId === m.id && (
                    <div className="chatwindow-picker" onClick={e => e.stopPropagation()}>
                      {EMOJI_OPTIONS.map(emoji => (
                        <button key={emoji} onClick={() => toggleReaction(m.id, emoji)}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {quoted && (
                    <div className="chatwindow-quote">
                      {quoted.message?.slice(0, 60)}{quoted.message?.length > 60 ? '…' : ''}
                    </div>
                  )}

                  <p style={{ margin: 0 }}>{m.message}</p>
                  <span style={{ fontSize: 10, opacity: 0.7, display: 'block', marginTop: 2 }}>
                    {formatTime(m.created_at)}
                  </span>
                </div>

                {reactionEntries.length > 0 && (
                  <div className="chatwindow-reactions">
                    {reactionEntries.map(([emoji, userIds]) => (
                      <span key={emoji} className="chatwindow-reaction-badge">
                        {emoji} {userIds.length > 1 ? userIds.length : ''}
                      </span>
                    ))}
                  </div>
                )}

                <div className="chatwindow-actions">
                  <button onClick={() => setReplyingTo(m)}>↩ Reply</button>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {replyingTo && (
          <div className="chatwindow-reply-preview">
            <span>Replying to: {replyingTo.message?.slice(0, 50)}{replyingTo.message?.length > 50 ? '…' : ''}</span>
            <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        )}

        <div className="chatwindow-input-row">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
            placeholder="Type a message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}