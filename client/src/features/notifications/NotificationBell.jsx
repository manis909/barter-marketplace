import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5000';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const fetchUnreadCount = () => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const count = (data.notifications || []).filter(n => !n.is_read).length;
        setUnreadCount(count);
      });
  };

  useEffect(() => {
    fetchUnreadCount();

    // Poll as a reliability fallback, same pattern already used for chat
    const interval = setInterval(fetchUnreadCount, 10000);

    // Realtime push: instantly bump the count when a new notification arrives
    const token = localStorage.getItem('token');
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('newNotification', () => {
      setUnreadCount(prev => prev + 1);
    });

    socket.on('connect_error', (err) => {
      console.log('Notification socket connection failed:', err.message);
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  return (
    <button
      onClick={() => {
        setUnreadCount(0);
        navigate('/notifications');
      }}
      style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer' }}
    >
      🔔
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute', top: -5, right: -5,
          background: 'red', color: 'white', borderRadius: '50%',
          fontSize: 10, padding: '2px 6px'
        }}>
          {unreadCount}
        </span>
      )}
    </button>
  );
}