import { useEffect, useRef } from 'react';

// Status pill colours — same map as TradeCard for visual consistency
const STATUS_STYLE = {
  pending:   { bg: 'rgba(170,59,255,0.12)',  color: 'var(--accent)' },
  accepted:  { bg: 'rgba(34,197,94,0.12)',   color: '#16a34a' },
  declined:  { bg: 'rgba(239,68,68,0.12)',   color: '#dc2626' },
  completed: { bg: 'rgba(59,130,246,0.12)',  color: '#2563eb' },
  cancelled: { bg: 'rgba(107,99,117,0.12)', color: 'var(--text)' },
};

// Modal that shows full details of a single trade offer.
// Props:
//   trade   – trade offer object
//   onClose – callback to close the modal
export default function TradeModal({ trade, onClose }) {
  const closeBtnRef = useRef(null);
  const headingId   = 'trade-modal-heading';

  // Focus the close button on open; restore focus on close
  useEffect(() => {
    const prev = document.activeElement;
    closeBtnRef.current?.focus();
    return () => prev?.focus();
  }, []);

  // Escape closes; Tab is trapped inside the panel
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab') {
        const panel = document.getElementById('trade-modal-panel');
        if (!panel) return;
        const focusable = panel.querySelectorAll(
          'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  const safeDate = trade.created_at
    ? new Date(trade.created_at).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

  const statusStyle = STATUS_STYLE[trade.status] ?? { bg: 'var(--border)', color: 'var(--text)' };

  // Rows: [label, value, isStatus]
  const rows = [
    ['Offered Item',   trade.offered_item_title   ?? trade.offered_item_id  ?? '—', false],
    ['Requested Item', trade.requested_item_title ?? trade.requested_item_id ?? '—', false],
    ['Status',         trade.status ?? '—', true],
    ['Message',        trade.message || '—', false],
    ['Date',           safeDate, false],
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        id="trade-modal-panel"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '0',
          width: '100%',
          maxWidth: 460,
          textAlign: 'left',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
          boxSizing: 'border-box',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px 18px',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            background: 'var(--bg)',
            zIndex: 1,
          }}
        >
          <h2 id={headingId} style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            Trade Details
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close trade details modal"
            style={{
              background: 'none',
              border: '2px solid transparent',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              cursor: 'pointer',
              color: 'var(--text)',
              outline: 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
          >
            ✕
          </button>
        </div>

        {/* ── Detail rows ── */}
        <dl style={{ margin: 0, padding: '4px 0' }}>
          {rows.map(([label, value, isStatus], i) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '13px 24px',
                gap: 16,
                flexWrap: 'wrap',
                background: i % 2 === 1 ? 'var(--social-bg)' : 'transparent',
              }}
            >
              <dt style={{
                color: 'var(--text)',
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {label}
              </dt>
              <dd style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 500,
                textAlign: 'right',
                wordBreak: 'break-word',
                maxWidth: '65%',
              }}>
                {isStatus ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: statusStyle.color,
                    background: statusStyle.bg,
                    textTransform: 'capitalize',
                    borderRadius: 20,
                    padding: '3px 10px',
                    letterSpacing: '0.02em',
                  }}>
                    {value}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-h)' }}>{value}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>

        {/* ── Footer ── */}
        <div style={{ padding: '16px 24px 20px', borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '10px 0',
              borderRadius: 8,
              border: '2px solid transparent',
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              outline: 'none',
              transition: 'background 0.15s',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-border)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent-bg)')}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
