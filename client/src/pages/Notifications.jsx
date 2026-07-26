import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = () => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setNotifications(data.notifications || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNotifications();
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

  const handleClick = (n) => {
    markAsRead(n.id);
    if (n.trade_offer_id) {
      navigate(`/chat/${n.trade_offer_id}`);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 24 }}>
      <h2>Notifications</h2>

      {loading && <p>Loading...</p>}

      {!loading && notifications.length === 0 && (
        <p style={{ color: '#888' }}>No notifications yet</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {notifications.map(n => (
          <div
            key={n.id}
            onClick={() => handleClick(n)}
            style={{
              padding: 14,
              borderRadius: 8,
              border: '1px solid #eee',
              background: n.is_read ? 'white' : '#f0f8ff',
              cursor: 'pointer'
            }}
          >
            <strong>{n.title}</strong>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#555' }}>{n.body}</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#999' }}>
              {new Date(n.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}