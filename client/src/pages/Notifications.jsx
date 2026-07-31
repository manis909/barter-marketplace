import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fmtDateAndTime, normalizeToUTC } from '../utils/helpers';

const API_URL = 'http://localhost:5000';

/* ─── Design tokens ─────────────────────────────────────────────────────── */
const T = {
  bg:         '#F6F5F0',
  surface:    '#FFFFFF',
  text:       '#24231F',
  muted:      '#5F5B52',
  border:     '#E4E2D9',
  accent:     '#3D6E63',
  accentStrong: '#2F5B4D',
  danger:     '#dc2626',
  radiusCard: 16,
};

/* ─── Notification type → icon ───────────────────────────────────────────── */
const ICON_MAP = {
  new_message:         '💬',
  trade_offer:         '🔄',
  trade_offer_updated: '✏️',
  trade_counter:       '🔁',
  trade_completed:     '✅',
  wishlist:            '💖',
  item_approved:       '✔️',
  profile_update:      '👤',
  default:             '🔔',
};
const getIcon = type => ICON_MAP[type] || ICON_MAP.default;

/* ─── Navigation by type ─────────────────────────────────────────────────── */
function getNavigationPath(n) {
  const { type, trade_offer_id, item_id, user_id } = n;
  if (trade_offer_id && (type === 'new_message' || type.startsWith('trade_')))
    return `/chat/${trade_offer_id}`;
  if (item_id) return `/item/${item_id}`;
  if (user_id && type === 'profile_update') return `/profile/${user_id}`;
  if (type === 'trade_offer') return '/trade-requests';
  if (type === 'trade_completed') return '/my-trades';
  if (type === 'wishlist') return '/wishlist';
  return null;
}

/* ─── Group notifications into Today / This Week / Earlier ──────────────── */
function groupNotifications(list) {
  const now   = new Date();
  // Start of today at midnight in local time
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  // Start of this week (Sunday = 0)
  const weekStart  = new Date(todayStart - now.getDay() * 86400000).getTime();

  const groups = { today: [], week: [], earlier: [] };
  for (const n of list) {
    const ts = new Date(normalizeToUTC(n.created_at)).getTime();
    if (ts >= todayStart)      groups.today.push(n);
    else if (ts >= weekStart)  groups.week.push(n);
    else                       groups.earlier.push(n);
  }
  // Return only non-empty groups in display order
  return [
    { label: 'Today',     items: groups.today   },
    { label: 'This Week', items: groups.week     },
    { label: 'Earlier',   items: groups.earlier  },
  ].filter(g => g.items.length > 0);
}

/* ─── CSS ────────────────────────────────────────────────────────────────── */
const NOTIF_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500&family=Manrope:wght@400;500&display=swap');

.notif-page {
  max-width: 620px;
  margin: 0 auto;
  padding: 24px 16px 48px;
  font-family: Manrope, sans-serif;
  box-sizing: border-box;
  /* prevent body scroll while dragging on mobile */
  -webkit-tap-highlight-color: transparent;
}

/* ── Header row ── */
.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.notif-heading {
  font-family: Fraunces, serif;
  font-size: 22px;
  font-weight: 500;
  color: ${T.text};
  margin: 0;
}

.notif-header-action {
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: Manrope, sans-serif;
  transition: background 0.15s, color 0.15s;
}

.notif-header-action.delete-btn {
  background: rgba(220, 38, 38, 0.10);
  color: ${T.danger};
}
.notif-header-action.delete-btn:hover {
  background: rgba(220, 38, 38, 0.18);
}

.notif-header-action.cancel-btn {
  background: ${T.bg};
  color: ${T.muted};
}
.notif-header-action.cancel-btn:hover {
  background: ${T.border};
}

/* ── Group label ── */
.notif-group-label {
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${T.muted};
  margin: 20px 0 8px 2px;
}
.notif-group-label:first-of-type { margin-top: 0; }

/* ── Notification list ── */
.notif-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Glass card ── */
.notif-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border-radius: ${T.radiusCard}px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(228, 226, 217, 0.75);
  cursor: pointer;
  transition: transform 0.18s ease, filter 0.18s ease, border-color 0.18s ease, background 0.15s;
  position: relative;
  box-sizing: border-box;
  user-select: none;
  -webkit-user-select: none;
}

.notif-card:hover {
  transform: translateY(-2px);
  filter: brightness(1.03);
  border-color: ${T.accent};
}

/* Unread left strip */
.notif-card.unread::before {
  content: '';
  position: absolute;
  left: 0; top: 12px; bottom: 12px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: ${T.accent};
}

/* Selection mode */
.notif-card.selected {
  background: rgba(61, 110, 99, 0.10);
  border-color: ${T.accent};
  transform: none;
  filter: none;
}

.notif-card.non-clickable { cursor: default; }
.notif-card.non-clickable:hover {
  transform: none; filter: none;
  border-color: rgba(228, 226, 217, 0.75);
}

/* Checkbox overlay — shown in selection mode */
.notif-checkbox {
  position: absolute;
  top: 12px; right: 14px;
  width: 20px; height: 20px;
  border-radius: 50%;
  border: 2px solid ${T.border};
  background: ${T.surface};
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background 0.12s, border-color 0.12s;
}
.notif-card.selected .notif-checkbox {
  background: ${T.accent};
  border-color: ${T.accent};
}
.notif-checkbox-tick {
  color: #fff;
  font-size: 11px;
  line-height: 1;
}

/* ── Icon circle ── */
.notif-icon {
  width: 40px; height: 40px; min-width: 40px;
  border-radius: 50%;
  background: rgba(61, 110, 99, 0.10);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}

/* ── Card body ── */
.notif-body { flex: 1; min-width: 0; }

.notif-title {
  font-size: 14px; font-weight: 600; color: ${T.text};
  margin: 0 0 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.notif-desc {
  font-size: 13px; color: ${T.muted}; margin: 0 0 8px;
  line-height: 1.45; word-break: break-word;
}

.notif-meta {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}

.notif-date, .notif-time {
  font-size: 11px; color: ${T.muted}; opacity: 0.8;
}

.notif-dot {
  width: 3px; height: 3px; border-radius: 50%;
  background: ${T.border}; flex-shrink: 0;
}

/* ── Empty / Loading ── */
.notif-empty {
  text-align: center; padding: 60px 24px;
  color: ${T.muted}; font-size: 14px;
}
.notif-empty-icon { font-size: 40px; margin-bottom: 12px; }
.notif-loading {
  text-align: center; padding: 60px 24px;
  color: ${T.muted}; font-size: 14px;
}

/* ── Mobile ── */
@media (max-width: 600px) {
  .notif-page { padding: 16px 12px 40px; }
  .notif-card { padding: 14px 14px 14px 18px; gap: 12px; }
  .notif-icon { width: 36px; height: 36px; min-width: 36px; font-size: 16px; }
  .notif-title { font-size: 13.5px; }
  .notif-desc  { font-size: 12.5px; }
  .notif-checkbox { top: 10px; right: 12px; }
}
`;

/* ─── Single notification card ───────────────────────────────────────────── */
const LONG_PRESS_MS = 500;  // ms to trigger long-press

function NotificationCard({ notification, selectionMode, selected, onSelect, onClick }) {
  const { title, body, type, is_read, created_at } = notification;
  const icon      = getIcon(type);
  const ts        = fmtDateAndTime(created_at);
  const path      = getNavigationPath(notification);
  const clickable = !!path && !selectionMode;

  const timerRef   = useRef(null);
  const movedRef   = useRef(false);

  const startPress = useCallback(() => {
    movedRef.current = false;
    timerRef.current = setTimeout(() => {
      if (!movedRef.current) onSelect(notification.id, /* startSelectionMode */ true);
    }, LONG_PRESS_MS);
  }, [notification.id, onSelect]);

  const cancelPress = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  const handleMove = useCallback(() => {
    movedRef.current = true;
    clearTimeout(timerRef.current);
  }, []);

  const handleClick = useCallback(() => {
    if (selectionMode) {
      // In selection mode a tap toggles the checkbox, never navigates
      onSelect(notification.id, false);
    } else if (clickable) {
      onClick(path);
    }
  }, [selectionMode, clickable, notification.id, onSelect, onClick, path]);

  const classes = [
    'notif-card',
    !is_read ? 'unread' : '',
    !clickable && !selectionMode ? 'non-clickable' : '',
    selected ? 'selected' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      onClick={handleClick}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerMove={handleMove}
      role={selectionMode ? 'checkbox' : clickable ? 'button' : 'article'}
      aria-checked={selectionMode ? selected : undefined}
      tabIndex={selectionMode || clickable ? 0 : undefined}
      onKeyDown={e => {
        if (e.key === 'Enter') handleClick();
        if (e.key === ' ' && selectionMode) { e.preventDefault(); onSelect(notification.id, false); }
      }}
      aria-label={title}
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

      {/* Checkbox — visible only in selection mode */}
      {selectionMode && (
        <span className="notif-checkbox" aria-hidden="true">
          {selected && <span className="notif-checkbox-tick">✓</span>}
        </span>
      )}
    </div>
  );
}

/* ─── Page component ─────────────────────────────────────────────────────── */
export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds,   setSelectedIds]   = useState(new Set());
  const [deleting,      setDeleting]      = useState(false);
  const navigate = useNavigate();

  /* ── fetch ── */
  const fetchNotifications = useCallback(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setNotifications(data.notifications || []);
        setLoading(false);
      });
  }, []);

  /* ── mark all read ── */
  const markAllAsRead = useCallback(async () => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, []);

  useEffect(() => {
    fetchNotifications();
    markAllAsRead();
  }, [fetchNotifications, markAllAsRead]);

  /* ── selection ── */
  const handleSelect = useCallback((id, enterSelectionMode) => {
    if (enterSelectionMode && !selectionMode) {
      // Long-press: enter selection mode and select this card
      setSelectionMode(true);
      setSelectedIds(new Set([id]));
      return;
    }
    // Toggle in existing selection mode
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, [selectionMode]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  /* ── delete selected ── */
  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    const token = localStorage.getItem('token');
    try {
      const ids = [...selectedIds];
      await fetch(`${API_URL}/api/notifications/bulk`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids }),
      });
      // Remove from local state immediately
      setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
      exitSelectionMode();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  }, [selectedIds, exitSelectionMode]);

  /* ── navigate ── */
  const handleCardClick = useCallback(path => navigate(path), [navigate]);

  /* ── grouped data ── */
  const groups = groupNotifications(notifications);

  return (
    <div className="notif-page">
      <style>{NOTIF_CSS}</style>

      {/* ── Header ── */}
      <div className="notif-header">
        <h2 className="notif-heading">Notifications</h2>

        {selectionMode ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="notif-header-action cancel-btn" onClick={exitSelectionMode}>
              Cancel
            </button>
            <button
              className="notif-header-action delete-btn"
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0 || deleting}
            >
              {deleting ? 'Deleting…' : `Delete (${selectedIds.size})`}
            </button>
          </div>
        ) : null}
      </div>

      {/* ── States ── */}
      {loading && (
        <div className="notif-loading"><p>Loading…</p></div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="notif-empty">
          <div className="notif-empty-icon">🔔</div>
          <p>No notifications yet</p>
        </div>
      )}

      {/* ── Grouped notification list ── */}
      {!loading && notifications.length > 0 && groups.map(group => (
        <div key={group.label}>
          <p className="notif-group-label">{group.label}</p>
          <div className="notif-list">
            {group.items.map(n => (
              <NotificationCard
                key={n.id}
                notification={n}
                selectionMode={selectionMode}
                selected={selectedIds.has(n.id)}
                onSelect={handleSelect}
                onClick={handleCardClick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
