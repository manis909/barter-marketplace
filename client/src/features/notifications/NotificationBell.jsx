import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5000';

// Notification types that belong to each platform.
// Used to filter the real-time newNotification socket event so only
// notifications for the *current* platform bump that platform's count.
const SKILTER_TYPES = new Set([
  'skill_booking',
  'skill_booking_accepted',
  'skill_booking_declined',
  'skill_booking_completed',
  'skill_booking_cancelled',
  'new_skill_message',
  'payment_submitted',
  'skill_booking_paid_teacher',
  'skill_booking_paid_learner',
  'payment_rejected',
]);

// Returns true if the notification belongs to the given platform.
function belongsToPlatform(notification, platform) {
  if (platform === 'skilter') return SKILTER_TYPES.has(notification.type);
  // 'barter' (default): everything that is NOT a Skilter type
  return !SKILTER_TYPES.has(notification.type);
}

function filterNotificationsByPlatform(notifications, platform) {
  return notifications.filter(notification => belongsToPlatform(notification, platform));
}

/**
 * NotificationBell
 *
 * Props:
 *   platform — 'barter' (default) | 'skilter'
 *
 * When platform='barter' it calls  GET /api/notifications          (all, minus Skilter types — filtered client-side)
 * When platform='skilter' it calls GET /api/notifications/skilter  (Skilter types only)
 *
 * The read-all endpoint used when the bell is clicked also matches the platform:
 *   barter  → PATCH /api/notifications/read-all
 *   skilter → PATCH /api/notifications/skilter/read-all
 *
 * The UI (bell icon, badge, position, styling) is identical for both platforms.
 */
export default function NotificationBell({ platform = 'barter' }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const socketRef = useRef(null);

  // Derive the correct fetch URL for this platform
  const fetchUrl = platform === 'skilter'
    ? `${API_URL}/api/notifications/skilter`
    : `${API_URL}/api/notifications`;

  const fetchUnreadCount = () => {
    const token = localStorage.getItem('token');
    fetch(fetchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const notifications = filterNotificationsByPlatform(data.notifications || [], platform);
        const count = notifications.filter(n => !n.is_read).length;
        setUnreadCount(count);
      });
  };

  useEffect(() => {
    fetchUnreadCount();

    // Poll as a reliability fallback, same pattern already used for chat
    const interval = setInterval(fetchUnreadCount, 10000);

    // Realtime push: bump count only when the incoming notification
    // belongs to this bell's platform — prevents Skilter notifications
    // from inflating the Barter count and vice versa.
    const token = localStorage.getItem('token');
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('newNotification', (notification) => {
      if (belongsToPlatform(notification, platform)) {
        setUnreadCount(prev => prev + 1);
      }
    });

    socket.on('connect_error', (err) => {
      console.log('Notification socket connection failed:', err.message);
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
    // Re-run when platform changes (e.g. user switches platform in the navbar)
  }, [platform]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = () => {
    // Mark notifications as read for this platform only, then navigate
    const token = localStorage.getItem('token');
    const readAllUrl = platform === 'skilter'
      ? `${API_URL}/api/notifications/skilter/read-all`
      : `${API_URL}/api/notifications/read-all`;

    fetch(readAllUrl, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {}); // fire-and-forget; don't block navigation

    setUnreadCount(0);
    navigate('/notifications', { state: { platform } });
  };

  // ── The rendered UI is identical to the original — no visual changes ──
  return (
    <button
      onClick={handleClick}
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
