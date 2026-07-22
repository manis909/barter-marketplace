import { useState } from 'react';
import TradeModal from './TradeModal';

// Displays a single trade offer row.
// Props:
//   trade             – trade offer object
//   onStatusChange    – async (id, newStatus) => void  called when receiver acts
//   currentUserId     – used to decide which action buttons to show
export default function TradeCard({ trade, onStatusChange, currentUserId }) {
  const [showModal, setShowModal]   = useState(false);
  const [acting, setActing]         = useState(false);   // true while PATCH is in-flight
  const [actionError, setActionError] = useState('');    // inline error if action fails

  const isReceiver = trade.receiver_id === currentUserId;
  const canAct     = isReceiver && trade.status === 'pending';

  const statusColor = {
    pending:   'var(--accent)',
    accepted:  '#22c55e',
    declined:  '#ef4444',
    completed: '#3b82f6',
    cancelled: 'var(--text)',
  }[trade.status] ?? 'var(--text)';

  // Safe date — avoids "Invalid Date" if created_at is missing
  const displayDate = trade.created_at
    ? new Date(trade.created_at).toLocaleDateString()
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

  // Shared style for action buttons so they're consistent and easy to update
  function actionBtnStyle(bg, disabled) {
    return {
      padding: '6px 14px',
      borderRadius: 6,
      border: '2px solid transparent',
      background: disabled ? 'var(--border)' : bg,
      color: disabled ? 'var(--text)' : '#fff',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 14,
      fontWeight: 500,
      opacity: disabled ? 0.6 : 1,
      outline: 'none',
      transition: 'opacity 0.15s',
      minWidth: 74,
    };
  }

  return (
    <>
      {/* ── Card ── */}
      <article
        aria-label={`Trade: ${trade.offered_item_title ?? 'item'} for ${trade.requested_item_title ?? 'item'}, status ${trade.status}`}
        style={{
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '16px 20px',
          background: 'var(--social-bg)',
        }}
      >
        {/* Top row — title + status + actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            flexWrap: 'wrap',     // wraps cleanly on narrow screens
          }}
        >
          {/* Item names */}
          <div style={{ flex: '1 1 180px', textAlign: 'left' }}>
            <p style={{ margin: 0, color: 'var(--text-h)', fontWeight: 500, lineHeight: 1.4 }}>
              {trade.offered_item_title ?? 'Offered Item'}
              <span aria-hidden="true"> → </span>
              <span className="sr-only"> for </span>
              {trade.requested_item_title ?? 'Requested Item'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text)' }}>
              {displayDate}
            </p>
          </div>

          {/* Status badge */}
          <span
            aria-label={`Status: ${trade.status}`}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: statusColor,
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
              paddingTop: 2,
            }}
          >
            {trade.status}
          </span>
        </div>

        {/* Bottom row — action buttons */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {/* Details is always visible */}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            aria-label={`View details for trade: ${trade.offered_item_title ?? 'item'} → ${trade.requested_item_title ?? 'item'}`}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-h)',
              cursor: 'pointer',
              fontSize: 14,
              outline: 'none',
            }}
            onFocus={e => (e.currentTarget.style.outline = '2px solid var(--accent)')}
            onBlur={e => (e.currentTarget.style.outline = 'none')}
          >
            Details
          </button>

          {/* Accept / Decline — only for receiver on pending trades */}
          {canAct && (
            <>
              <button
                type="button"
                disabled={acting}
                onClick={() => handleAction('accepted')}
                aria-label="Accept this trade offer"
                aria-busy={acting}
                style={actionBtnStyle('#22c55e', acting)}
                onFocus={e => { if (!acting) e.currentTarget.style.outline = '2px solid #22c55e'; }}
                onBlur={e => (e.currentTarget.style.outline = 'none')}
              >
                {acting ? 'Saving…' : 'Accept'}
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => handleAction('declined')}
                aria-label="Decline this trade offer"
                aria-busy={acting}
                style={actionBtnStyle('#ef4444', acting)}
                onFocus={e => { if (!acting) e.currentTarget.style.outline = '2px solid #ef4444'; }}
                onBlur={e => (e.currentTarget.style.outline = 'none')}
              >
                {acting ? 'Saving…' : 'Decline'}
              </button>
            </>
          )}
        </div>

        {/* Inline error if accept/decline fails */}
        {actionError && (
          <p
            role="alert"
            style={{ margin: '8px 0 0', fontSize: 13, color: '#ef4444' }}
          >
            {actionError}
          </p>
        )}
      </article>

      {/* ── Modal ── */}
      {showModal && (
        <TradeModal trade={trade} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
