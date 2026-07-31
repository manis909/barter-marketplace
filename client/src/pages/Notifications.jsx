import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fmtDateAndTime } from '../utils/helpers';

const API_URL = 'http://localhost:5000';

/* ─── Design tokens (matches project palette) ───────────────────────────── */
const T = {
  bg:            '#F6F5F0',
  surface:       '#FFFFFF',
  text:          '#24231F',
  muted:         '#5F5B52',
  border:        '#E4E2D9',
  accent:        '#3D6E63',
  accentStrong:  '#2F5B4D',
  radiusCard:    16,
};

/* ─── Notification type → icon mapping ──────────────────────────────────── */
const ICON_MAP = {
  new_message:           '💬',
  trade_offer:           '🔄',
  trade_offer_updated:   '✏️',
  trade_counter:         '🔁',
  trade_completed:       '✅',
  wishlist:              '💖',
  item_approved:         '✔️',
  profile_update:        '👤',
  default:               '🔔',
};

function getIcon(type) {
  return ICON_MAP[type] || ICON_MAP.default;
}

/* ─── Navigation logic by notification type ─────────────────────────────── */
function getNavigationPath(notification) {
  const { type, trade_offer_id, item_id, user_id } = notification;

  if (trade_offer_id) {
    // All trade-related notifications → open the chat for that trade
    if (type === 'new_message' || type.startsWith('trade_')) {
      return `/chat/${trade_offer_id}`;
    }
  }

  if (item_id) {
    return `/item/${item_id}`;
  }

  if (user_id && type === 'profile_update') {
    return `/profile/${user_id}`;
  }

  // Fallback: trade requests or trades page based on type
  if (type === 'trade_offer') return '/trade-requests';
  if (type === 'trade_completed') return '/my-trades';
  if (type === 'wishlist') return '/wishlist';

  return null; // no navigation for unknown types
}

/* ─── Time formatting — delegates to the shared helper in utils/helpers.js ── */
// fmtDateAndTime() imported above: uses the browser's locale + timezone,
// no hardcoded 'en-IN' or 'Asia/Kolkata'.

/* ─── Injected CSS ───────────────────────────────────────────────────────── */
const NOTIF_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500&family=Manrope:wght@400;500&display=swap');

.notif-page {
  max-width: 620px;
  margin: 0 auto;
  padding: 24px 16px 48px;
  font-family: Manrope, sans-serif;
  box-sizing: border-box;
}

.notif-heading {
  font-family: Fraunces, serif;
  font-size: 22px;
  font-weight: 500;
  color: ${T.text};
  margin: 0 0 20px;
}

.notif-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Glass card ── */
.notif-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border-radius: ${T.radiusCard}px;
  /* Glassmorphism */
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(228, 226, 217, 0.75);
  cursor: pointer;
  transition: transform 0.18s ease, filter 0.18s ease, border-color 0.18s ease;
  position: relative;
  box-sizing: border-box;
}

.notif-card:hover {
  transform: translateY(-2px);
  filter: brightness(1.03);
  border-color: ${T.accent};
}

/* Unread indicator strip on the left */
.notif-card.unread::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: ${T.accent};
}

.notif-card.non-clickable {
  cursor: default;
}
.notif-card.non-clickable:hover {
  transform: none;
  filter: none;
  border-color: rgba(228, 226, 217, 0.75);
}

/* ── Icon circle ── */
.notif-icon {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  background: rgba(61, 110, 99, 0.10);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

/* ── Card body ── */
.notif-body {
  flex: 1;
  min-width: 0;
}

.notif-title {
  font-size: 14px;
  font-weight: 600;
  color: ${T.text};
  margin: 0 0 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notif-desc {
  font-size: 13px;
  color: ${T.muted};
  margin: 0 0 8px;
  line-height: 1.45;
  word-break: break-word;
}

.notif-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.notif-date {
  font-size: 11px;
  color: ${T.muted};
  opacity: 0.8;
}

.notif-time {
  font-size: 11px;
  color: ${T.muted};
  opacity: 0.8;
}

.notif-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: ${T.border};
  flex-shrink: 0;
}

/* ── Empty / Loading states ── */
.notif-empty {
  text-align: center;
  padding: 60px 24px;
  color: ${T.muted};
  font-size: 14px;
}

.notif-empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.notif-loading {
  text-align: center;
  padding: 60px 24px;
  color: ${T.muted};
  font-size: 14px;
}

/* ── Mobile ── */
@media (max-width: 600px) {
  .notif-page { padding: 16px 12px 40px; }
  .notif-card { padding: 14px 14px 14px 18px; gap: 12px; }
  .notif-icon { width: 36px; height: 36px; min-width: 36px; font-size: 16px; }
  .notif-title { font-size: 13.5px; }
  .notif-desc  { font-size: 12.5px; }
}
`;

/* ─── Single notification card ───────────────────────────────────────────── */
function NotificationCard({ notification, onClick }) {
  const { title, body, type, is_read, created_at } = notification;
  const icon = getIcon(type);
  const ts   = fmtDateAndTime(created_at);
  const path = getNavigationPath(notification);
  const clickable = !!path;

  return (
    <div
      className={`notif-card${!is_read ? ' unread' : ''}${!clickable ? ' non-clickable' : ''}`}
      onClick={() => clickable && onClick(path)}
      role={clickable ? 'button' : 'article'}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={e => clickable && e.key === 'Enter' && onClick(path)}
      aria-label={clickable ? `${title} — click to open` : title}
    >
      <div className="notif-icon">{icon}</div>

      <div className="notif-body">
        <p className="notif-title">{title || 'Notification'}</p>
        {body ? <p className="notif-desc">{body}</p> : null}
        {ts && (
          <div className="notif-meta">
            <span className="notif-date">{ts.date}</span>
            <span className="notif-dot" aria-hidden="true" />
            <span className="notif-time">{ts.time}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Page component ─────────────────────────────────────────────────────── */
export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /* ── Fetch + mark-all-read (unchanged logic) ── */
  const fetchNotifications = () => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setNotifications(data.notifications || []);
        setLoading(false);
      });
  };

  const markAllAsRead = async () => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  useEffect(() => {
    fetchNotifications();
    markAllAsRead();
  }, []);

  /* ── Card click → navigate ── */
  const handleCardClick = (path) => {
    navigate(path);
  };

  return (
    <div className="notif-page">
      <style>{NOTIF_CSS}</style>

      <h2 className="notif-heading">Notifications</h2>

      {loading && (
        <div className="notif-loading">
          <p>Loading…</p>
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="notif-empty">
          <div className="notif-empty-icon">🔔</div>
          <p>No notifications yet</p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="notif-list">
          {notifications.map(n => (
            <NotificationCard
              key={n.id}
              notification={n}
              onClick={handleCardClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
