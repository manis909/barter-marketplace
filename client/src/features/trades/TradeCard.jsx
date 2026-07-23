import { useState } from 'react';
import TradeModal from './TradeModal';

// Status → { bg, color } for the pill badge
const STATUS_STYLE = {
  pending:   { bg: 'rgba(170,59,255,0.12)',  color: 'var(--accent)' },
  accepted:  { bg: 'rgba(34,197,94,0.12)',   color: '#16a34a' },
  declined:  { bg: 'rgba(239,68,68,0.12)',   color: '#dc2626' },
  completed: { bg: 'rgba(59,130,246,0.12)',  color: '#2563eb' },
  cancelled: { bg: 'rgba(107,99,117,0.12)', color: 'var(--text)' },
};

// Displays a single trade offer row.
// Props:
//   trade             – trade offer object
//   onStatusChange    – async (id, newStatus) => void  called when receiver acts
//   currentUserId     – used to decide which action buttons to show
export default function TradeCard({ trade, onStatusChange, currentUserId }) {
  const [showModal, setShowModal]     = useState(false);
  const [acting, setActing]           = useState(false);
  const [actionError, setActionError] = useState('');
  const [hovered, setHovered]         = useState(false);

  const isReceiver = trade.receiver_id === currentUserId;
  const canAct     = isReceiver && trade.status === 'pending';

  const statusStyle = STATUS_STYLE[trade.status] ?? { bg: 'var(--border)', color: 'var(--text)' };

  const displayDate = trade.created_at
    ? new Date(trade.created_at).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : '—';

  async function handleAction(newStatus) {
    setActing(true);
    setActionError('');
    try {
      await onStatusChange(trade.id, newStatus);
    } catch {
      setActionError('Action failed. Please try again.');
    } finally {
      setActing(false);
    }
  }

  function actionBtnStyle(bg, isDisabled) {
    return {
      padding: '7px 16px',
      borderRadius: 7,
      border: 'none',
      background: isDisabled ? 'var(--border)' : bg,
      color: isDisabled ? 'var(--text)' : '#fff',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      fontSize: 13,
      fontWeight: 600,
      opacity: isDisabled ? 0.55 : 1,
      outline: 'none',
      transition: 'background 0.15s, opacity 0.15s, transform 0.1s',
      minWidth: 80,
      letterSpacing: '0.01em',
    };
  }

  return (
    <>
      <article
        aria-label={`Trade: ${trade.offered_item_title ?? 'item'} for ${trade.requested_item_title ?? 'item'}, status ${trade.status}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '18px 20px',
          background: 'var(--social-bg)',
          boxShadow: hovered
            ? 'var(--shadow)'
            : '0 1px 3px rgba(0,0,0,0.06)',
          transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
          transition: 'box-shadow 0.18s, transform 0.18s',
        }}
      >
        {/* Top row — title + status badge */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {/* Item names */}
          <div style={{ flex: '1 1 180px' }}>
            <p style={{
              margin: 0,
              color: 'var(--text-h)',
              fontWeight: 600,
              fontSize: 15,
              lineHeight: 1.45,
            }}>
              {trade.offered_item_title ?? 'Offered Item'}
              <span
                aria-hidden="true"
                style={{ margin: '0 6px', color: 'var(--text)', fontWeight: 400 }}
              >
                →
              </span>
              <span style={{
                position: 'absolute',
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0,0,0,0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}>for </span>
              {trade.requested_item_title ?? 'Requested Item'}
            </p>
            <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text)' }}>
              {displayDate}
            </p>
          </div>

          {/* Status pill badge */}
          <span
            aria-label={`Status: ${trade.status}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: statusStyle.color,
              background: statusStyle.bg,
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
              borderRadius: 20,
              padding: '3px 10px',
              letterSpacing: '0.02em',
            }}
          >
            {trade.status}
          </span>
        </div>

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 14,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            aria-label={`View details for trade: ${trade.offered_item_title ?? 'item'} → ${trade.requested_item_title ?? 'item'}`}
            style={{
              padding: '7px 16px',
              borderRadius: 7,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-h)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              outline: 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            onFocus={e => (e.currentTarget.style.outline = '2px solid var(--accent)')}
            onBlur={e => (e.currentTarget.style.outline = 'none')}
          >
            Details
          </button>

          {canAct && (
            <>
              <button
                type="button"
                disabled={acting}
                onClick={() => handleAction('accepted')}
                aria-label="Accept this trade offer"
                aria-busy={acting}
                style={actionBtnStyle('#16a34a', acting)}
                onMouseEnter={e => { if (!acting) e.currentTarget.style.background = '#15803d'; }}
                onMouseLeave={e => { if (!acting) e.currentTarget.style.background = '#16a34a'; }}
                onFocus={e => { if (!acting) e.currentTarget.style.outline = '2px solid #16a34a'; }}
                onBlur={e => (e.currentTarget.style.outline = 'none')}
              >
                {acting ? '⏳ Saving…' : '✓ Accept'}
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => handleAction('declined')}
                aria-label="Decline this trade offer"
                aria-busy={acting}
                style={actionBtnStyle('#dc2626', acting)}
                onMouseEnter={e => { if (!acting) e.currentTarget.style.background = '#b91c1c'; }}
                onMouseLeave={e => { if (!acting) e.currentTarget.style.background = '#dc2626'; }}
                onFocus={e => { if (!acting) e.currentTarget.style.outline = '2px solid #dc2626'; }}
                onBlur={e => (e.currentTarget.style.outline = 'none')}
              >
                {acting ? '⏳ Saving…' : '✕ Decline'}
              </button>
            </>
          )}
        </div>

        {/* Inline error */}
        {actionError && (
          <p
            role="alert"
            style={{ margin: '10px 0 0', fontSize: 13, color: '#dc2626', fontWeight: 500 }}
          >
            ⚠ {actionError}
          </p>
        )}
      </article>

      {showModal && (
        <TradeModal trade={trade} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
