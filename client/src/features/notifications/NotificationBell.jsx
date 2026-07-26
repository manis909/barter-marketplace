import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

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
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={() => navigate('/notifications')}
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