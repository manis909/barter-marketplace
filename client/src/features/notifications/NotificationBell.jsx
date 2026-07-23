import { useEffect, useState } from 'react';

const API_URL = 'http://localhost:5000';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = () => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setNotifications(data.notifications || []));
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id) => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setIsOpen(!isOpen)} style={{ position: 'relative' }}>
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

      {isOpen && (
        <div style={{
          position: 'absolute', right: 0, top: '100%',
          width: 300, maxHeight: 400, overflowY: 'auto',
          border: '1px solid #ccc', background: 'white', zIndex: 10
        }}>
          {notifications.length === 0 && (
            <p style={{ padding: 8 }}>No notifications yet</p>
          )}
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => markAsRead(n.id)}
              style={{
                padding: 8,
                borderBottom: '1px solid #eee',
                background: n.is_read ? 'white' : '#f0f8ff',
                cursor: 'pointer'
              }}
            >
              <strong>{n.title}</strong>
              <p style={{ margin: 0, fontSize: 13 }}>{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}