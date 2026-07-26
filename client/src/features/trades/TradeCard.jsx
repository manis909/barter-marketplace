import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TradeModal from './TradeModal';

// ── Status badge styles ────────────────────────────────────────────────────
const STATUS_STYLE = {
  pending:   { bg: 'rgba(234,88,12,0.10)',   color: '#ea580c' },   // orange
  accepted:  { bg: 'rgba(22,163,74,0.10)',   color: '#16a34a' },   // green
  declined:  { bg: 'rgba(220,38,38,0.10)',   color: '#dc2626' },   // red
  completed: { bg: 'rgba(107,114,128,0.10)', color: '#6b7280' },   // gray
  cancelled: { bg: 'rgba(107,114,128,0.10)', color: '#6b7280' },
};

const STATUS_LABEL = {
  pending:   'Pending',
  accepted:  'Accepted',
  declined:  'Declined',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// ── TradeCard ──────────────────────────────────────────────────────────────
// Props:
//   trade          – trade offer object from GET /api/trades/mine
//   currentUserId  – logged-in user's id (from AuthContext)
//   onStatusChange – async (tradeId, newStatus) => void
export default function TradeCard({ trade, currentUserId, onStatusChange }) {
  const navigate = useNavigate();

  const [showModal,         setShowModal]         = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [acting,            setActing]            = useState(false);
  const [actionError,       setActionError]       = useState('');
  const [hovered,           setHovered]           = useState(false);

  // ── Ownership helpers ───────────────────────────────────────────────────
  const isIncoming = trade.receiver_id === currentUserId;
  const isOutgoing = trade.sender_id   === currentUserId;
  const canRespond = isIncoming && trade.status === 'pending';
  const canChat    = ['accepted', 'completed'].includes(trade.status);

  const statusStyle = STATUS_STYLE[trade.status] ?? { bg: 'var(--border)', color: 'var(--text)' };

  const displayDate = trade.created_at
    ? new Date(trade.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

  // ── Human-readable item labels ──────────────────────────────────────────
  const offeredTitle   = trade.offered_item_title   ?? 'Unknown Item';
  const requestedTitle = trade.requested_item_title ?? 'Unknown Item';

  // From the perspective of the current user:
  //   Incoming: they offered X, they want my Y
  //   Outgoing: I offered X, I want their Y
  const topLabel    = isIncoming ? 'They offered'  : 'You offered';
  const topItem     = isIncoming ? offeredTitle     : offeredTitle;
  const bottomLabel = isIncoming ? 'They want'     : 'Requested';
  const bottomItem  = isIncoming ? requestedTitle  : requestedTitle;

  // ── Card header accent ──────────────────────────────────────────────────
  const headerBg    = isIncoming ? 'rgba(22,163,74,0.07)'  : 'rgba(37,99,235,0.07)';
  const headerColor = isIncoming ? '#15803d'               : '#1d4ed8';
  const headerLabel = isIncoming ? 'Incoming Trade Request' : 'Your Trade Offer';

  // ── Actions ─────────────────────────────────────────────────────────────
  async function handleAction(newStatus) {
    setActing(true);
    setActionError('');
    setShowAcceptConfirm(false);
    try {
      await onStatusChange(trade.id, newStatus);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Unknown error';
      setActionError(`Action failed: ${msg}`);
      console.error('Trade action error:', err?.response?.status, err?.response?.data || err);
    } finally {
      setActing(false);
    }
  }

  function btnStyle(bg, disabled) {
    return {
      padding: '7px 16px', borderRadius: 7, border: 'none',
      background: disabled ? 'var(--border)' : bg,
      color: disabled ? 'var(--text)' : '#fff',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 13, fontWeight: 600,
      opacity: disabled ? 0.55 : 1,
      outline: 'none',
      transition: 'background 0.15s',
      minWidth: 80,
    };
  }

  return (
    <>
      <article
        aria-label={`${headerLabel}: ${offeredTitle} for ${requestedTitle}, ${trade.status}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          background: 'var(--social-bg)',
          boxShadow: hovered ? 'var(--shadow)' : '0 1px 3px rgba(0,0,0,0.06)',
          transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
          transition: 'box-shadow 0.18s, transform 0.18s',
        }}
      >
        {/* ── Card header strip ── */}
        <div style={{
          background: headerBg,
          padding: '8px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: headerColor, letterSpacing: '0.02em' }}>
            {isIncoming ? '↙ ' : '↗ '}{headerLabel}
          </span>

          {/* Status badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            fontSize: 11, fontWeight: 700,
            color: statusStyle.color, background: statusStyle.bg,
            borderRadius: 20, padding: '2px 9px',
            letterSpacing: '0.02em', whiteSpace: 'nowrap',
          }}>
            {STATUS_LABEL[trade.status] ?? trade.status}
          </span>
        </div>

        {/* ── Card body ── */}
        <div style={{ padding: '14px 18px' }}>
          {/* Item labels */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {topLabel}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: 'var(--text-h)' }}>
                {topItem}
              </p>
            </div>
            <div style={{ alignSelf: 'center', color: 'var(--text)', fontSize: 16 }} aria-hidden="true">⇄</div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {bottomLabel}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: 'var(--text-h)' }}>
                {bottomItem}
              </p>
            </div>
          </div>

          <p style={{ margin: '0 0 12px', fontSize: 11, color: 'var(--text)' }}>{displayDate}</p>

          {/* ── Chat Available badge for accepted trades ── */}
          {canChat && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(22,163,74,0.09)',
              color: '#15803d',
              borderRadius: 20, padding: '3px 10px',
              fontSize: 12, fontWeight: 600, marginBottom: 12,
            }}>
              💬 Chat Available
            </div>
          )}

          {/* ── Outgoing: status message ── */}
          {isOutgoing && trade.status === 'pending' && (
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#ea580c', fontWeight: 500 }}>
              ⏳ Waiting for response…
            </p>
          )}

          {/* ── Action buttons row ── */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>

            {/* Details — always visible */}
            <button
              type="button"
              onClick={() => setShowModal(true)}
              aria-label={`View details for this trade`}
              style={{
                padding: '6px 14px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-h)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                outline: 'none', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onFocus={e => (e.currentTarget.style.outline = '2px solid var(--accent)')}
              onBlur={e => (e.currentTarget.style.outline = 'none')}
            >
              Details
            </button>

            {/* Open Chat — both sender and receiver see this once accepted */}
            {canChat && (
              <button
                type="button"
                onClick={() => navigate(`/chat/${trade.id}`)}
                aria-label="Open chat for this trade"
                style={{
                  padding: '6px 16px', borderRadius: 7, border: 'none',
                  background: '#16a34a', color: '#fff',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  outline: 'none', transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#15803d')}
                onMouseLeave={e => (e.currentTarget.style.background = '#16a34a')}
                onFocus={e => (e.currentTarget.style.outline = '2px solid #16a34a')}
                onBlur={e => (e.currentTarget.style.outline = 'none')}
              >
                💬 Open Chat
              </button>
            )}

            {/* Accept / Decline — incoming pending only */}
            {canRespond && (
              <>
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => setShowAcceptConfirm(true)}
                  aria-label="Accept this trade offer"
                  aria-busy={acting}
                  style={btnStyle('#16a34a', acting)}
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
                  style={btnStyle('#dc2626', acting)}
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

          {actionError && (
            <p role="alert" style={{ margin: '10px 0 0', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
              ⚠ {actionError}
            </p>
          )}
        </div>
      </article>

      {/* ── Accept confirmation modal ── */}
      {showAcceptConfirm && (
        <div
          role="dialog" aria-modal="true" aria-label="Confirm trade acceptance"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1100, padding: 16,
          }}
        >
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 24, maxWidth: 400, width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Accept this trade?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
              <strong>{offeredTitle}</strong> and <strong>{requestedTitle}</strong> will both be marked as traded.
              Any other pending offers for these items will be automatically declined.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAcceptConfirm(false)}
                style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 14 }}>
                Cancel
              </button>
              <button type="button" disabled={acting} onClick={() => handleAction('accepted')}
                style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                {acting ? 'Accepting...' : 'Yes, Accept Trade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Details modal ── */}
      {showModal && (
        <TradeModal trade={trade} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
