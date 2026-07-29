import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000';
const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const CHAT_CSS = `
.chatwindow-wrapper {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
}
.chatwindow-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  flex-shrink: 0;
}
.chatwindow-back-btn {
  width: 34px;
  height: 34px;
  min-width: 34px;
  border-radius: 999px;
  border: none;
  background: #c6e930;
  color: #0f3d2e;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
}
.chatwindow-back-btn:hover {
  background: #b3d426;
}
.chatwindow-header-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f3d2e;
}
.chatwindow-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  border: 1px solid #2f6b52;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
.chatwindow-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: visible;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f4f9f6, #ffffff);
}
.chatwindow-bubble-row {
  display: flex;
  flex-direction: column;
  max-width: 78%;
  position: relative;
}
.chatwindow-bubble-row.mine { align-self: flex-end; align-items: flex-end; }
.chatwindow-bubble-row.theirs { align-self: flex-start; align-items: flex-start; }
.chatwindow-sender-name {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.75;
  margin-bottom: 2px;
  margin-left: 10px;
  color: #1b4d3e;
}
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
  background: #0f3d2e;
  color: #fff;
  border-bottom-right-radius: 4px;
}
.chatwindow-bubble.theirs {
  background: #eaf4ee;
  color: #10241c;
  border-bottom-left-radius: 4px;
}
.chatwindow-quote {
  border-left: 3px solid rgba(15,61,46,0.35);
  padding: 4px 8px;
  margin-bottom: 4px;
  font-size: 12px;
  opacity: 0.85;
  border-radius: 4px;
  background: rgba(15,61,46,0.06);
}
.chatwindow-attachment {
  max-width: 220px;
  border-radius: 10px;
  margin-bottom: 4px;
  display: block;
}
.chatwindow-actions {
  display: flex;
  gap: 6px;
  margin-top: 2px;
  position: relative;
}
.chatwindow-actions button {
  font-size: 11px;
  padding: 2px 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #1b4d3e;
}
.chatwindow-reactions {
  display: flex;
  gap: 4px;
  margin-top: 2px;
  flex-wrap: wrap;
}
.chatwindow-reaction-badge {
  font-size: 12px;
  background: #eaf4ee;
  border-radius: 999px;
  padding: 1px 6px;
}
.chatwindow-picker {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  background: #fff;
  border: 1px solid #2f6b52;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  position: absolute;
  top: -40px;
  width: max-content;
  max-width: 85vw;
  z-index: 20;
}
.chatwindow-bubble-row.mine .chatwindow-picker {
  right: 0;
  left: auto;
}
.chatwindow-bubble-row.theirs .chatwindow-picker {
  left: 0;
  right: auto;
}
.chatwindow-picker button {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  flex-shrink: 0;
}
.chatwindow-reply-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: #eaf4ee;
  border-left: 3px solid #0f3d2e;
  font-size: 12.5px;
  margin: 0 12px;
  border-radius: 6px;
  flex-shrink: 0;
}
.chatwindow-attach-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #eaf4ee;
  margin: 0 12px;
  border-radius: 6px;
  flex-shrink: 0;
}
.chatwindow-attach-preview img,
.chatwindow-attach-preview video {
  width: 46px;
  height: 46px;
  object-fit: cover;
  border-radius: 8px;
}
.chatwindow-attach-preview button {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
}
.chatwindow-input-row {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #2f6b52;
  box-sizing: border-box;
  align-items: center;
  position: relative;
  background: #fff;
  flex-shrink: 0;
}
.chatwindow-attach-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 999px;
  border: none;
  background: #c6e930;
  color: #0f3d2e;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  flex-shrink: 0;
}
.chatwindow-attach-btn:hover {
  background: #b3d426;
}
.chatwindow-attach-menu {
  position: absolute;
  bottom: 52px;
  left: 12px;
  background: #fff;
  border: 1px solid #2f6b52;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.15);
  z-index: 8;
  display: flex;
  flex-direction: column;
  min-width: 170px;
  overflow: hidden;
}
.chatwindow-attach-menu button {
  padding: 10px 14px;
  text-align: left;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13.5px;
  color: #0f3d2e;
  display: flex;
  align-items: center;
  gap: 8px;
}
.chatwindow-attach-menu button:hover {
  background: #eaf4ee;
}
.chatwindow-input-row input[type="text"] {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid #2f6b52;
  outline: none;
  font-size: 14px;
}
.chatwindow-input-row button.send-btn {
  padding: 8px 18px;
  border-radius: 999px;
  border: none;
  background: #c6e930;
  color: #0f3d2e;
  cursor: pointer;
  font-weight: 700;
  flex-shrink: 0;
}
.chatwindow-input-row button.send-btn:hover {
  background: #b3d426;
}
.chatwindow-deleted-banner {
  padding: 14px;
  text-align: center;
  color: #1b4d3e;
  font-size: 13px;
  flex-shrink: 0;
}
.chatwindow-edit-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.chatwindow-edit-row input {
  flex: 1;
  min-width: 0;
  border-radius: 8px;
  border: none;
  padding: 4px 8px;
  font-size: 14px;
}
.chatwindow-edit-row button {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: inherit;
  flex-shrink: 0;
}
.chatwindow-delete-menu {
  position: absolute;
  bottom: 22px;
  right: 0;
  background: #fff;
  border: 1px solid #2f6b52;
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.15);
  z-index: 8;
  display: flex;
  flex-direction: column;
  min-width: 150px;
  max-width: 90vw;
  overflow: hidden;
}
.chatwindow-delete-menu button {
  padding: 8px 12px;
  text-align: left;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12.5px;
  color: #0f3d2e;
}
.chatwindow-delete-menu button:hover {
  background: #eaf4ee;
}
.chatwindow-delete-menu button.danger {
  color: #dc2626;
}
`;

function formatTime(ts) {
  if (!ts) return '';
  const hasTimezone = /Z|[+-]\d{2}:?\d{2}$/.test(ts);
  const d = hasTimezone ? new Date(ts) : new Date(ts.replace(' ', 'T'));
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ChatWindow({ tradeOfferId, currentUserId, otherUserName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [pickerForId, setPickerForId] = useState(null);
  const [deletedForEveryone, setDeletedForEveryone] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [deleteMenuForId, setDeleteMenuForId] = useState(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const galleryInputRef = useRef(null);
  const navigate = useNavigate();

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

    socket.on('messageReactionUpdated', (updatedMessage) => {
      setMessages(prev => prev.map(m => (m.id === updatedMessage.id ? updatedMessage : m)));
    });

    socket.on('messageEdited', (updatedMessage) => {
      setMessages(prev => prev.map(m => (m.id === updatedMessage.id ? updatedMessage : m)));
    });

    socket.on('messageDeleted', (updatedMessage) => {
      setMessages(prev => prev.map(m => (m.id === updatedMessage.id ? updatedMessage : m)));
    });

    socket.on('chatDeletedForEveryone', (payload) => {
      if (String(payload.tradeOfferId) === String(tradeOfferId)) {
        setMessages([]);
        setDeletedForEveryone(true);
      }
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
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < 150) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const sendMessage = async () => {
    if (!input.trim() && !pendingFile) return;
    const token = localStorage.getItem('token');

    if (pendingFile) {
      const formData = new FormData();
      formData.append('trade_offer_id', tradeOfferId);
      formData.append('message', input);
      if (replyingTo?.id) formData.append('reply_to_message_id', replyingTo.id);
      formData.append('attachment', pendingFile);

      await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    } else {
      await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          trade_offer_id: tradeOfferId,
          message: input,
          reply_to_message_id: replyingTo?.id || null,
        })
      });
    }

    setInput('');
    setReplyingTo(null);
    setDeletedForEveryone(false);
    clearPendingFile();
  };

  const clearPendingFile = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
  };

  const handleFileChosen = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be under 5MB');
      return;
    }
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
    setShowAttachMenu(false);
  };

  const toggleReaction = async (messageId, emoji) => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/chat/${messageId}/react`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ emoji }),
    });
    setPickerForId(null);
  };

  const saveEdit = async (messageId) => {
    if (!editText.trim()) return;
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/chat/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: editText }),
    });
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const deleteForEveryone = async (messageId) => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/chat/message/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setDeleteMenuForId(null);
  };

  const deleteForMe = async (messageId) => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/chat/message/${messageId}/hide`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setMessages(prev => prev.filter(m => m.id !== messageId));
    setDeleteMenuForId(null);
  };

  const findMessageById = (id) => messages.find(m => m.id === id);

  const otherPersonMessage = messages.find(m => String(m.sender_id) !== String(currentUserId));
  const headerName = otherUserName || otherPersonMessage?.sender_name || 'Chat';

  return (
    <div className="chatwindow-wrapper">
      <style>{CHAT_CSS}</style>

      <div className="chatwindow-header">
        <button
          type="button"
          onClick={() => navigate('/chats')}
          className="chatwindow-back-btn"
          aria-label="Back to chats"
        >
          ←
        </button>
        <span className="chatwindow-header-title">{headerName}</span>
      </div>

      <div className="chatwindow-container">
        {deletedForEveryone && (
          <div className="chatwindow-deleted-banner">This chat was deleted for everyone.</div>
        )}
        <div className="chatwindow-messages" ref={messagesContainerRef}>
          {messages.map(m => {
            const isMine = String(m.sender_id) === String(currentUserId);
            const quoted = m.reply_to_message_id ? findMessageById(m.reply_to_message_id) : null;
            const reactionEntries = Object.entries(m.reactions || {});
            const isEditingThis = editingId === m.id;
            const isSelected = pickerForId === m.id;

            return (
              <div key={m.id} className={`chatwindow-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                {!isMine && m.sender_name && (
                  <span className="chatwindow-sender-name">{m.sender_name}</span>
                )}
                <div
                  className={`chatwindow-bubble ${isMine ? 'mine' : 'theirs'}`}
                  onClick={() => {
                    if (m.deleted || isEditingThis) return;
                    setPickerForId(isSelected ? null : m.id);
                    setDeleteMenuForId(null);
                  }}
                >
                  {isSelected && !m.deleted && (
                    <div className="chatwindow-picker" onClick={e => e.stopPropagation()}>
                      {EMOJI_OPTIONS.map(emoji => (
                        <button key={emoji} onClick={() => toggleReaction(m.id, emoji)}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {quoted && !m.deleted && (
                    <div className="chatwindow-quote">
                      {quoted.message?.slice(0, 60)}{quoted.message?.length > 60 ? '…' : ''}
                    </div>
                  )}

                  {m.deleted ? (
                    <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.6 }}>This message was deleted</p>
                  ) : isEditingThis ? (
                    <div className="chatwindow-edit-row" onClick={e => e.stopPropagation()}>
                      <input
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(m.id); if (e.key === 'Escape') cancelEdit(); }}
                        autoFocus
                      />
                      <button onClick={() => saveEdit(m.id)}>✓</button>
                      <button onClick={cancelEdit}>✕</button>
                    </div>
                  ) : (
                    <>
                      {m.attachment_url && m.attachment_type === 'image' && (
                        <img src={`${API_URL}${m.attachment_url}`} alt="attachment" className="chatwindow-attachment" />
                      )}
                      {m.attachment_url && m.attachment_type === 'video' && (
                        <video src={`${API_URL}${m.attachment_url}`} controls className="chatwindow-attachment" />
                      )}
                      {m.message && (
                        <p style={{ margin: 0 }}>
                          {m.message}
                          {m.edited && <span style={{ fontSize: 10, opacity: 0.7 }}> (edited)</span>}
                        </p>
                      )}
                    </>
                  )}

                  {!m.deleted && (
                    <span style={{ fontSize: 10, opacity: 0.7, display: 'block', marginTop: 2 }}>
                      {formatTime(m.created_at)}
                    </span>
                  )}
                </div>

                {reactionEntries.length > 0 && !m.deleted && (
                  <div className="chatwindow-reactions">
                    {reactionEntries.map(([emoji, userIds]) => (
                      <span key={emoji} className="chatwindow-reaction-badge">
                        {emoji} {userIds.length > 1 ? userIds.length : ''}
                      </span>
                    ))}
                  </div>
                )}

                {!m.deleted && !isEditingThis && isSelected && (
                  <div className="chatwindow-actions" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setReplyingTo(m)}>↩ Reply</button>
                    {isMine && (
                      <button onClick={() => { setEditingId(m.id); setEditText(m.message); }}>✎ Edit</button>
                    )}
                    <button onClick={() => setDeleteMenuForId(deleteMenuForId === m.id ? null : m.id)}>
                      🗑 Delete
                    </button>

                    {deleteMenuForId === m.id && (
                      <div className="chatwindow-delete-menu" onClick={e => e.stopPropagation()}>
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

        {replyingTo && (
          <div className="chatwindow-reply-preview">
            <span>Replying to: {replyingTo.message?.slice(0, 50)}{replyingTo.message?.length > 50 ? '…' : ''}</span>
            <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        )}

        {pendingFile && (
          <div className="chatwindow-attach-preview">
            {pendingFile.type.startsWith('video') ? (
              <video src={pendingPreviewUrl} muted />
            ) : (
              <img src={pendingPreviewUrl} alt="preview" />
            )}
            <span style={{ fontSize: 12.5 }}>{pendingFile.name}</span>
            <button onClick={clearPendingFile}>✕</button>
          </div>
        )}

        <div className="chatwindow-input-row">
          <button
            type="button"
            className="chatwindow-attach-btn"
            onClick={() => setShowAttachMenu(prev => !prev)}
            aria-label="Attach media"
          >
            📷
          </button>

          {showAttachMenu && (
            <div className="chatwindow-attach-menu" onClick={e => e.stopPropagation()}>
              <button onClick={() => galleryInputRef.current?.click()}>🖼️ Choose from Gallery</button>
            </div>
          )}

          <input
            type="file"
            accept="image/*,video/*"
            ref={galleryInputRef}
            style={{ display: 'none' }}
            onChange={e => handleFileChosen(e.target.files?.[0])}
          />

          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
            placeholder="Type a message..."
          />
          <button className="send-btn" onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}