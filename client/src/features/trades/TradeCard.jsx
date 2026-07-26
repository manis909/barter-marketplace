import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TRADE_STATUS } from '../../utils/constants';
import TradeModal from './TradeModal';

const FALLBACK_IMAGE = 'https://placehold.co/120x100?text=No+Image';

const STATUS_STYLE = {
  pending:   { bg: 'rgba(224,122,95,0.16)', color: '#C8624B' },
  accepted:  { bg: 'rgba(22,163,74,0.14)', color: '#166534' },
  declined:  { bg: 'rgba(220,38,38,0.12)', color: '#991B1B' },
  completed: { bg: 'rgba(107,114,128,0.12)', color: '#444D56' },
  cancelled: { bg: 'rgba(107,114,128,0.12)', color: '#444D56' },
};

const STATUS_LABEL = {
  pending:   'Pending',
  accepted:  'Accepted',
  declined:  'Declined',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function badgeStyle(color, bg) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    color,
    background: bg,
    borderRadius: 18,
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.02em',
  };
}

function buttonVariant(bg, disabled) {
  return {
    padding: '9px 16px',
    borderRadius: 12,
    border: 'none',
    background: disabled ? 'rgba(226,230,231,0.85)' : bg,
    color: disabled ? 'rgba(31,41,55,0.65)' : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13,
    fontWeight: 700,
    minWidth: 110,
    transition: 'transform 0.18s, background 0.18s',
  };
}


// ── TradeCard ──────────────────────────────────────────────────────────────
// Props:
//   trade          – trade offer object from GET /api/trades/mine
//   currentUserId  – logged-in user's id (from AuthContext)
//   onStatusChange – async (tradeId, newStatus) => void
export default function TradeCard({ trade, currentUserId, onStatusChange }) {
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [hovered, setHovered] = useState(false);

  const isIncoming = trade.receiver_id === currentUserId;
  const canRespond = isIncoming && trade.status === TRADE_STATUS.PENDING;
  const canChat = [TRADE_STATUS.ACCEPTED, TRADE_STATUS.COMPLETED].includes(trade.status);
  const canComplete = trade.status === TRADE_STATUS.ACCEPTED;

  const statusStyle = STATUS_STYLE[trade.status] ?? { bg: 'rgba(229,231,235,0.7)', color: 'var(--text)' };
  const displayDate = trade.created_at
    ? new Date(trade.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

  const offeredTitle = trade.offered_item_title ?? 'Unknown item';
  const requestedTitle = trade.requested_item_title ?? 'Unknown item';
  const offeredImage = trade.offered_item_images?.[0] ?? FALLBACK_IMAGE;
  const requestedImage = trade.requested_item_images?.[0] ?? FALLBACK_IMAGE;

  const topLabel = isIncoming ? 'They offered' : 'You offered';
  const bottomLabel = isIncoming ? 'They want' : 'Requested';
  const partnerName = isIncoming ? trade.sender_username : trade.receiver_username;
  const headerLabel = isIncoming ? 'Incoming Request' : 'Outgoing Offer';
  const headerTint = isIncoming ? 'rgba(240,253,244,0.9)' : 'rgba(239,246,255,0.9)';
  const headerAccent = isIncoming ? '#16A34A' : '#2563EB';

  async function handleAction(newStatus) {
    setActing(true);
    setActionError('');
    setShowAcceptConfirm(false);
    try {
      await onStatusChange(trade.id, newStatus);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Something went wrong';
      setActionError(`Action failed: ${msg}`);
      console.error('Trade action error:', err?.response?.status, err?.response?.data || err);
    } finally {
      setActing(false);
    }
  }

  function actionButton(bg, disabled) {
    return {
      padding: '10px 16px', borderRadius: 16, border: 'none',
      background: disabled ? 'rgba(226,230,231,0.85)' : bg,
      color: disabled ? 'rgba(31,41,55,0.65)' : '#fff',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 13,
      fontWeight: 700,
      minWidth: 120,
      transition: 'transform 0.18s, background 0.18s',
    };
  }

  return (
    <>
      <article
        aria-label={`${headerLabel}: ${offeredTitle} for ${requestedTitle}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: 26,
          border: '1px solid rgba(224,122,95,0.18)',
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.92)',
          boxShadow: hovered ? '0 20px 50px rgba(208,150,120,0.16)' : '0 10px 30px rgba(208,150,120,0.08)',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'transform 0.18s, box-shadow 0.18s',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'center',
          padding: '18px 22px',
          background: headerTint,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: headerAccent, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {headerLabel}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 700, color: 'var(--text-h)' }}>
              Trade with @{partnerName || 'unknown'}
            </p>
          </div>

          <span style={badgeStyle(statusStyle.color, statusStyle.bg)}>
            {STATUS_LABEL[trade.status] ?? trade.status}
          </span>
        </div>

        <div style={{ padding: '20px 22px 18px' }}>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 24, background: 'rgba(248,237,229,0.75)', border: '1px solid rgba(224,122,95,0.16)' }}>
              <img
                src={offeredImage}
                alt={offeredTitle}
                onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }}
                style={{ width: 84, height: 84, borderRadius: 20, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(224,122,95,0.16)' }}
              />
              <div>
                <p style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text)' }}>
                  {topLabel}
                </p>
                <p style={{ margin: '6px 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--text-h)' }}>{offeredTitle}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                  {trade.offered_item_condition ? `${trade.offered_item_condition.replace(/_/g, ' ')} · ` : ''}
                  {trade.offered_item_value ? `Est. $${trade.offered_item_value}` : 'Value unknown'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 24, background: 'rgba(237,246,255,0.82)', border: '1px solid rgba(37,99,235,0.14)' }}>
              <img
                src={requestedImage}
                alt={requestedTitle}
                onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }}
                style={{ width: 84, height: 84, borderRadius: 20, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(37,99,235,0.16)' }}
              />
              <div>
                <p style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text)' }}>
                  {bottomLabel}
                </p>
                <p style={{ margin: '6px 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--text-h)' }}>{requestedTitle}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                  {trade.requested_item_condition ? `${trade.requested_item_condition.replace(/_/g, ' ')} · ` : ''}
                  {trade.requested_item_value ? `Est. $${trade.requested_item_value}` : 'Value unknown'}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 16, color: 'var(--text)', fontSize: 13 }}>
            <span style={{ fontWeight: 700 }}>Partner</span>
            <span style={{ color: 'var(--muted)' }}>@{partnerName || 'unknown'}</span>
            <span style={{ color: 'var(--muted)' }}>·</span>
            <span>{displayDate}</span>
          </div>

          {trade.message && (
            <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 18, background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(224,122,95,0.14)' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Message</p>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{trade.message}</p>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              aria-label="View trade details"
              style={{ ...actionButton('#ffffff', false), background: 'rgba(255,255,255,0.92)', color: 'var(--text-h)', border: '1px solid rgba(224,122,95,0.2)' }}
            >
              View Details
            </button>

            {canChat && (
              <button
                type="button"
                onClick={() => navigate(`/chat/${trade.id}`)}
                aria-label="Open chat for this trade"
                style={actionButton('#16a34a', false)}
              >
                💬 Open Chat
              </button>
            )}

            {canRespond && (
              <>
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => setShowAcceptConfirm(true)}
                  aria-label="Accept this trade offer"
                  aria-busy={acting}
                  style={actionButton('#16a34a', acting)}
                >
                  {acting ? 'Accepting…' : 'Accept'}
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => handleAction(TRADE_STATUS.DECLINED)}
                  aria-label="Decline this trade offer"
                  aria-busy={acting}
                  style={actionButton('#d14343', acting)}
                >
                  {acting ? 'Declining…' : 'Decline'}
                </button>
              </>
            )}

            {canComplete && (
              <button
                type="button"
                disabled={acting}
                onClick={() => handleAction(TRADE_STATUS.COMPLETED)}
                aria-label="Mark this trade as completed"
                aria-busy={acting}
                style={actionButton('#0ea5e9', acting)}
              >
                {acting ? 'Completing…' : 'Mark Completed'}
              </button>
            )}
          </div>

          {actionError && (
            <p role="alert" style={{ marginTop: 14, fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>
              ⚠ {actionError}
            </p>
          )}
        </div>
      </article>

      {showAcceptConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm trade acceptance"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 18,
          }}
        >
          <div style={{
            maxWidth: 420,
            width: '100%',
            borderRadius: 22,
            padding: 24,
            background: 'rgba(255,255,255,0.96)',
            border: '1px solid rgba(224,122,95,0.18)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-h)' }}>Confirm acceptance</h3>
            <p style={{ margin: '12px 0 22px', color: 'var(--text)', fontSize: 14, lineHeight: 1.65 }}>
              Accepting this trade will lock both items and notify your partner to coordinate the exchange.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowAcceptConfirm(false)}
                style={{ padding: '10px 18px', borderRadius: 14, border: '1px solid rgba(148,163,184,0.3)', background: 'white', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => handleAction(TRADE_STATUS.ACCEPTED)}
                style={actionButton('#16a34a', acting)}
              >
                {acting ? 'Accepting…' : 'Yes, accept trade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && <TradeModal trade={trade} onClose={() => setShowModal(false)} />}
    </>
  );
}
