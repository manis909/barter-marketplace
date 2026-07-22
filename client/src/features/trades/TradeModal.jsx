import { useEffect, useRef } from 'react';

// Modal that shows full details of a single trade offer.
// Props:
//   trade   – trade offer object
//   onClose – callback to close the modal
export default function TradeModal({ trade, onClose }) {
  const closeBtnRef = useRef(null);
  const headingId = 'trade-modal-heading';

  // ── Focus management ────────────────────────────────────────────────────────
  // Move focus into the modal when it opens, return it when it closes.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeBtnRef.current?.focus();
    return () => {
      previouslyFocused?.focus();
    };
  }, []);

  // ── Keyboard handling ───────────────────────────────────────────────────────
  // Escape closes the modal.
  // Tab is trapped inside the modal so focus doesn't leave.
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        // Collect all focusable elements inside the modal
        const modal = document.getElementById('trade-modal-panel');
        if (!modal) return;
        const focusable = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Backdrop click — only close when clicking the backdrop itself
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  const safeDate = trade.created_at
    ? new Date(trade.created_at).toLocaleString()
    : '—';

  const rows = [
    ['Offered Item',   trade.offered_item_title   ?? trade.offered_item_id  ?? '—'],
    ['Requested Item', trade.requested_item_title ?? trade.requested_item_id ?? '—'],
    ['Status',         trade.status ?? '—'],
    ['Message',        trade.message || '—'],
    ['Date',           safeDate],
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
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',        // prevents modal from touching screen edges on mobile
      }}
    >
      <div
        id="trade-modal-panel"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '28px 32px',
          width: '100%',
          maxWidth: 440,
          textAlign: 'left',
          boxShadow: 'var(--shadow)',
          boxSizing: 'border-box',
          maxHeight: '90vh',
          overflowY: 'auto',    // scrollable on very small screens
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <h2 id={headingId} style={{ margin: 0, fontSize: 20 }}>
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
              borderRadius: 6,
              fontSize: 22,
              cursor: 'pointer',
              color: 'var(--text)',
              lineHeight: 1,
              padding: '2px 6px',
              outline: 'none',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
          >
            ✕
          </button>
        </div>

        {/* Detail rows */}
        <dl style={{ margin: 0 }}>
          {rows.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
                gap: 12,
                flexWrap: 'wrap',     // wraps on very narrow viewports
              }}
            >
              <dt
                style={{
                  color: 'var(--text)',
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {label}
              </dt>
              <dd
                style={{
                  margin: 0,
                  color: 'var(--text-h)',
                  fontSize: 14,
                  fontWeight: 500,
                  textAlign: 'right',
                  textTransform: label === 'Status' ? 'capitalize' : 'none',
                  wordBreak: 'break-word',  // prevents UUID overflow
                }}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 20,
            width: '100%',
            padding: '10px 0',
            borderRadius: 6,
            border: '2px solid transparent',
            background: 'var(--accent-bg)',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 500,
            outline: 'none',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
        >
          Close
        </button>
      </div>
    </div>
  );
}
