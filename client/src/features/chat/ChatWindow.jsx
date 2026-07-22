import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5000';
export default function ChatWindow({ tradeOfferId, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // Initial fetch of existing messages
    fetch(`${API_URL}/api/chat/${tradeOfferId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setMessages(Array.isArray(data) ? data : []));

    // Socket connection — token passed via auth, per Member 5's io.use() middleware
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.emit('joinTrade', String(tradeOfferId));

    socket.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('connect_error', (err) => {
      console.log('Socket connection failed:', err.message);
    });

    // Polling fallback in case the socket connection drops
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

  const sendMessage = async () => {
    if (!input.trim()) return;
    const token = localStorage.getItem('token');

    await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ trade_offer_id: tradeOfferId, message: input })
    });

    setInput('');
  };

  return (
    <div>
      <div style={{ height: 300, overflowY: 'auto', border: '1px solid #ccc', padding: 8 }}>
        {messages.map(m => (
          <div key={m.id} style={{ textAlign: m.sender_id === currentUserId ? 'right' : 'left' }}>
            <p>{m.message}</p>
          </div>
        ))}
      </div>
      <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}