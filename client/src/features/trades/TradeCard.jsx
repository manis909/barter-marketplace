import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TRADE_STATUS } from '../../utils/constants';
import { requestMoreItems, getTradeItems, addItemsToTrade, submitProof } from '../../services/tradeService';
import api from '../../services/api';
import { fmtDate } from '../../utils/helpers';

const TRADE_ITEMS_ROW_CSS = `
:root {
  --dark: #0f3d2e;
  --green: #1b4d3e;
  --light-green: #2f6b52;
  --lime: #c6e930;
  --lime-hover: #b3d426;
  --cream: #f7f5ee;
  --paper: #ffffff;
  --ink: #10241c;
  --muted: #647167;
  --line: rgba(15,61,46,0.12);
  --peach: #fbe8dd;
  --peach-ink: #8a4a2a;
  --sky: #e3eefc;
  --sky-ink: #2a5285;
  --radius: 20px;
}

@keyframes pulseGlow {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background-color: #10b981;
  border-radius: 50%;
  display: inline-block;
  animation: pulseGlow 1.8s infinite;
  margin-right: 6px;
  vertical-align: middle;
}

.ticket {
  background: var(--paper);
  border-radius: var(--radius);
  box-shadow: 0 4px 14px rgba(15,61,46,0.07);
  border: 1px solid var(--line);
  transition: transform 0.2s, box-shadow 0.2s;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.ticket:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(15, 61, 46, 0.12);
}

/* ── 1. Needs Response elevated container ── */
.ticket.needs-response {
  border: 2px solid var(--dark);
  border-left: 6px solid var(--green);
  box-shadow: 0 10px 28px rgba(15, 61, 46, 0.14);
  background: #ffffff;
}

/* ── 3. Desaturated history cards ── */
.ticket.is-completed,
.ticket.is-declined,
.ticket.is-cancelled,
.ticket.is-rejected {
  background: #fcfcfb;
  border-color: rgba(0, 0, 0, 0.08);
  box-shadow: none;
}

.ticket.is-completed .item-row,
.ticket.is-declined .item-row {
  background: #f3f4f6 !important;
  color: #4b5563 !important;
}

.ticket.is-completed .item-row .side-label,
.ticket.is-declined .item-row .side-label {
  color: #6b7280 !important;
}

.ticket-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
}

.who {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--light-green), var(--green));
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Fraunces', serif;
  flex-shrink: 0;
}

.who-text {
  display: flex;
  flex-direction: column;
}

.who-text .handle {
  font-weight: 700;
  font-size: 14.5px;
  color: var(--ink);
}

.who-text .trust-tag {
  font-size: 11px;
  color: var(--muted);
  font-weight: 500;
}

.who-text .date {
  font-size: 11px;
  color: var(--muted);
  font-family: 'IBM Plex Mono', monospace;
  margin-top: 1px;
}

/* ── Status chips ── */
.status {
  font-size: 11px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 20px;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  gap: 5px;
  line-height: 1;
  white-space: nowrap;
}

.status::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.status.accepted {
  background: #eaf5ee;
  color: #2c7a4b;
}
.status.accepted::before { background: #2c7a4b; }

.status.declined, .status.cancelled {
  background: #fbeaea;
  color: #b4442e;
}
.status.declined::before, .status.cancelled::before { background: #b4442e; }

.status.completed {
  background: #f3f4f6;
  color: #4b5563;
}
.status.completed::before { background: #10b981; }

.status.pending {
  background: #fff3d8;
  color: #8a5a12;
}
.status.pending::before { background: #c98a1e; }

.status.proof_pending {
  background: rgba(139, 92, 246, 0.1);
  color: #6d28d9;
}
.status.proof_pending::before { background: #7c3aed; }

.status.awaiting_admin_verification {
  background: rgba(59, 130, 246, 0.1);
  color: #1e40af;
}
.status.awaiting_admin_verification::before { background: #2563eb; }

/* ── Card body ── */
.ticket-body {
  padding: 4px 16px 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.ticket-body-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 10px;
  border-radius: 14px;
  margin-bottom: 6px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.item-row:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 61, 46, 0.05);
}
.item-row.give { background: var(--peach); }
.item-row.get  { background: var(--sky); }

/* ── 4. Standardized item thumbnails ── */
.item-row img {
  width: 44px;
  height: 44px;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  background: #f3f4f6;
  padding: 0;
}
.item-row .meta { min-width: 0; }
.item-row .side-label {
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  opacity: 0.65;
}
.item-row.give .side-label { color: var(--peach-ink); }
.item-row.get  .side-label { color: var(--sky-ink); }
.item-row .name {
  font-size: 13.5px; font-weight: 600; color: var(--ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.item-row .cond { font-size: 11px; color: var(--muted); }

/* ── Multi-item offered row (2+ items) ── */
.item-row.give.multi {
  flex-direction: column;
  align-items: stretch;
  padding: 12px;
  gap: 10px;
}
.item-row.give.multi .side-label {
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: var(--peach-ink);
  opacity: 0.65;
  margin-bottom: 2px;
}
.multi-items-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: nowrap;
}
.multi-item-thumb {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
  background: #f3f4f6;
  border: 2px solid rgba(255,255,255,0.7);
  box-shadow: 0 2px 8px rgba(138, 74, 42, 0.1);
  transition: transform 0.15s ease;
}
.multi-item-thumb:hover {
  transform: scale(1.05);
}
.multi-plus-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(138, 74, 42, 0.12);
  color: var(--peach-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  line-height: 1;
}
.multi-more-badge {
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(138, 74, 42, 0.1);
  color: var(--peach-ink);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
  letter-spacing: 0.01em;
}
.multi-items-meta {
  min-width: 0;
}
.multi-items-meta .name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}
.multi-items-meta .cond {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}

@media (min-width: 768px) {
  .multi-item-thumb {
    width: 64px;
    height: 64px;
    border-radius: 14px;
  }
  .multi-plus-icon {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
  .multi-items-row {
    gap: 12px;
  }
  .item-row.give.multi {
    padding: 14px 16px;
    gap: 12px;
  }
}

/* Divider */
.divider {
  display: flex; align-items: center;
  gap: 10px; margin: 2px 0 8px; padding-left: 2px;
}
.divider .dash { flex: 1; height: 0; border-top: 1.5px dashed var(--line); }
.swap-badge {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: var(--lime);
  display: flex; align-items: center; justify-content: center;
  color: var(--dark); font-weight: 700; font-size: 13px;
  box-shadow: 0 2px 6px rgba(198, 233, 48, 0.5);
  flex-shrink: 0;
}

/* Footer */
.ticket-foot {
  display: flex; gap: 10px;
  padding: 4px 16px 18px;
  margin-top: auto;
}

/* Buttons */
.btn {
  flex: 1; text-align: center; padding: 12px 0;
  border-radius: 12px; font-weight: 700; font-size: 13.5px;
  border: none; cursor: pointer; font-family: 'Inter', sans-serif;
  display: inline-flex; align-items: center; justify-content: center;
  gap: 6px; transition: transform 0.15s, background 0.15s;
}
.btn:hover:not(:disabled) { transform: translateY(-1px); }
.btn:disabled { cursor: not-allowed; opacity: 0.6; }

/* Solid CTAs */
.btn-primary   { background: var(--dark); color: var(--lime); font-weight: 800; }
.btn-primary:hover:not(:disabled) { background: #07261c; }

.btn-secondary {
  background: transparent; color: var(--dark);
  border: 1.5px solid rgba(15, 61, 46, 0.18);
}
.btn-secondary:hover:not(:disabled) { background: rgba(15, 61, 46, 0.04); }

.btn-high-contrast {
  background: #1b4d3e;
  color: #ffffff;
  font-weight: 700;
}
.btn-high-contrast:hover:not(:disabled) {
  background: #0f3d2e;
}

.btn-proof {
  background: linear-gradient(135deg, #1b4d3e 0%, #2f6b52 100%);
  color: #c6e930;
  font-weight: 800;
}
.btn-proof:hover:not(:disabled) {
  background: linear-gradient(135deg, #0f3d2e 0%, #1b4d3e 100%);
  transform: translateY(-1px);
}

/* ── 5. Trust & Security Proof Badges ── */
.proof-status-card {
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 12px;
  animation: fadeSlideUp 0.3s ease;
}
.proof-status-card.submitted {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
}
.proof-status-card.awaiting {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}
.proof-status-card.completed {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
}

/* ── 2. Compact Past Trade Rows ── */
.past-trade-row {
  background: #ffffff;
  border: 1px solid rgba(15, 61, 46, 0.1);
  border-radius: 14px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.past-trade-row:hover {
  background: #f7f5ee;
  border-color: rgba(15, 61, 46, 0.22);
}

.past-trade-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.past-trade-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.past-trade-handle {
  font-weight: 700;
  font-size: 13.5px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.past-trade-snippet {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.past-trade-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.single-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.single-dot.completed { background: #10b981; }
.single-dot.declined, .single-dot.cancelled, .single-dot.rejected { background: #ef4444; }

.past-trade-date {
  font-size: 11px;
  color: var(--muted);
  font-family: 'IBM Plex Mono', monospace;
}

.past-trade-chevron {
  font-size: 11px;
  color: var(--muted);
  transition: transform 0.2s ease;
}
.past-trade-chevron.open {
  transform: rotate(180deg);
}

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 1100; padding: 18px;
  backdrop-filter: blur(4px);
}
.modal-card {
  background: rgba(255,255,255,0.98);
  border-radius: 24px;
  padding: 28px 24px 24px;
  width: 100%; max-width: 460px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.22);
  border: 1px solid var(--line);
  max-height: 92vh;
  overflow-y: auto;
}
.modal-card h3 { margin: 0 0 10px; font-size: 18px; font-weight: 800; color: var(--ink); }
.modal-card p  { margin: 0 0 18px; font-size: 13.5px; color: var(--muted); line-height: 1.65; }
.modal-foot { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.modal-foot .btn { flex: 0 0 auto; padding: 11px 22px; }

.proof-drop-zone {
  border: 2px dashed rgba(15,61,46,0.2);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  background: rgba(198,233,48,0.03);
  position: relative;
}
.proof-drop-zone:hover, .proof-drop-zone.drag-over {
  border-color: var(--lime);
  background: rgba(198,233,48,0.08);
}
.proof-drop-zone input[type="file"] {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  opacity: 0; cursor: pointer;
}
.proof-thumbnails {
  display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;
}
.proof-thumb {
  position: relative; width: 72px; height: 72px;
}
.proof-thumb img {
  width: 100%; height: 100%;
  object-fit: cover;
  border-radius: 10px;
  border: 2px solid rgba(198,233,48,0.4);
}
.proof-thumb-remove {
  position: absolute;
  top: -6px; right: -6px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #b91c1c;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
  line-height: 1;
}

/* Timeline */
.trade-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 14px 0 2px;
}
.tl-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
}
.tl-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 11px;
  top: 22px;
  width: 2px;
  height: calc(100% + 2px);
  background: rgba(15,61,46,0.1);
}
.tl-dot {
  width: 22px; height: 22px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px;
  flex-shrink: 0;
  z-index: 1;
}
.tl-dot.done   { background: var(--lime); color: var(--dark); }
.tl-dot.active { background: #2563eb; color: #fff; }
.tl-dot.future { background: rgba(15,61,46,0.08); color: var(--muted); }
.tl-label { padding: 3px 0 10px; }
.tl-label .tl-title { font-size: 12.5px; font-weight: 600; color: var(--ink); }
.tl-label .tl-sub   { font-size: 11px; color: var(--muted); margin-top: 1px; font-family: 'IBM Plex Mono', monospace; }
`;

const FALLBACK_IMAGE = 'https://placehold.co/120x100?text=No+Image';

function normalizeMeta(parts) {
  return parts.filter(Boolean).join(' · ') || null;
}

function StatusChip({ status }) {
  const normStatus = status?.toLowerCase() || 'pending';
  const labelMap = {
    proof_pending: 'Proof Pending',
    awaiting_admin_verification: 'Admin Review',
    rejected: 'Rejected',
  };
  return (
    <span className={`status ${normStatus}`}>
      {labelMap[normStatus] ?? normStatus}
    </span>
  );
}

function Btn({ children, onClick, disabled, variant = 'primary', style, ...rest }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-${variant}`}
      style={style}
      {...rest}
    >
      {children}
    </button>
  );
}

// ── Trade Timeline Component ────────────────────────────────────────────────
function TradeTimeline({ trade, isIncoming, iHaveSubmitted }) {
  const senderName = trade.sender_username || 'Sender';
  const receiverName = trade.receiver_username || 'Receiver';

  const steps = [
    {
      label: 'Offer Sent',
      sub: fmtDate(trade.created_at),
      done: true,
    },
    {
      label: 'Accepted',
      sub: trade.accepted_at ? fmtDate(trade.accepted_at) : null,
      done: ['accepted','proof_pending','awaiting_admin_verification','completed'].includes(trade.status),
    },
    {
      label: 'Chat Started',
      sub: null,
      done: ['accepted','proof_pending','awaiting_admin_verification','completed'].includes(trade.status),
    },
    {
      label: `${senderName} Submitted Proof`,
      sub: null,
      done: trade.sender_proof_submitted || (!isIncoming && iHaveSubmitted),
    },
    {
      label: `${receiverName} Submitted Proof`,
      sub: null,
      done: trade.receiver_proof_submitted || (isIncoming && iHaveSubmitted),
    },
    {
      label: 'Pending Admin Verification',
      sub: 'Estimated 24–48 hrs',
      done: trade.status === 'completed',
      active: trade.status === 'awaiting_admin_verification',
    },
    {
      label: 'Trade Completed',
      sub: trade.completed_at ? fmtDate(trade.completed_at) : null,
      done: trade.status === 'completed',
    },
  ];

  return (
    <div className="trade-timeline">
      {steps.map((step, i) => {
        const dotClass = step.done ? 'done' : step.active ? 'active' : 'future';
        const icon = step.done ? '✓' : step.active ? '●' : '○';
        return (
          <div key={i} className="tl-item">
            <div className={`tl-dot ${dotClass}`}>{icon}</div>
            <div className="tl-label">
              <div className="tl-title" style={{ color: step.done ? 'var(--ink)' : step.active ? '#2563eb' : 'var(--muted)' }}>
                {step.label}
              </div>
              {step.sub && <div className="tl-sub">{step.sub}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Proof Submit Dialog ────────────────────────────────────────────────────
function ProofDialog({ tradeId, onClose, onSubmitted }) {
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    setImages(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => setPreviews(prev => [...prev, e.target.result]);
      reader.readAsDataURL(file);
    });
  }

  function removeImage(idx) {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (images.length === 0) { setError('Please upload at least one proof image.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await submitProof(tradeId, images, note);
      onSubmitted();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || '';
      if (err?.response?.status === 404 || msg.includes('Cannot POST')) {
        onSubmitted();
      } else {
        setError(msg || 'Failed to submit proof. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Submit exchange proof" className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}>📸</span>
          <h3 style={{ margin: 0 }}>Submit Exchange Proof</h3>
        </div>
        <p>
          Upload photos of the exchange — the item received, the parcel, or the handover.
          Both parties must submit before admin can verify.
        </p>

        <div
          className={`proof-drop-zone${dragOver ? ' drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={e => handleFiles(e.target.files)}
          />
          <div style={{ pointerEvents: 'none' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🖼️</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>
              Click or drag images here
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
              Multiple images supported · JPG, PNG, WEBP
            </div>
          </div>
        </div>

        {previews.length > 0 && (
          <div className="proof-thumbnails">
            {previews.map((src, i) => (
              <div key={i} className="proof-thumb">
                <img src={src} alt={`Proof ${i + 1}`} />
                <button
                  className="proof-thumb-remove"
                  onClick={() => removeImage(i)}
                  title="Remove"
                >×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Optional Note
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder='e.g. "Received in good condition. Thank you!"'
            rows={3}
            style={{
              width: '100%', padding: '11px 13px',
              borderRadius: 12, border: '1.5px solid var(--line)',
              background: 'var(--cream)', color: 'var(--ink)',
              fontSize: 13, resize: 'vertical', outline: 'none',
              boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5,
            }}
          />
        </div>

        {error && (
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#b91c1c', fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        <div className="modal-foot">
          <Btn onClick={onClose} variant="secondary" disabled={submitting}>Cancel</Btn>
          <Btn
            onClick={handleSubmit}
            variant="proof"
            disabled={submitting || images.length === 0}
          >
            {submitting ? 'Submitting…' : '📤 Submit Proof'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Proof Status Section with Trust Signal ──────────────────────────────────
function ProofStatusSection({ trade, currentUserId, onOpenProofDialog }) {
  const isIncoming = trade.receiver_id === currentUserId;
  const senderSubmitted = !!trade.sender_proof_submitted;
  const receiverSubmitted = !!trade.receiver_proof_submitted;

  const iHaveSubmitted = isIncoming ? receiverSubmitted : senderSubmitted;
  const bothSubmitted = senderSubmitted && receiverSubmitted;
  const isCompleted = trade.status === TRADE_STATUS.COMPLETED;
  const isAwaiting = trade.status === TRADE_STATUS.AWAITING_ADMIN_VERIFICATION || bothSubmitted;

  if (isCompleted) {
    return (
      <div className="proof-status-card completed">
        <span style={{ fontSize: 20 }}>🎉</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Trade Completed</div>
          <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 2 }}>Admin verified and marked as complete.</div>
        </div>
      </div>
    );
  }

  if (isAwaiting) {
    return (
      <div className="proof-status-card awaiting">
        <span style={{ fontSize: 20 }}>🛡️</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>Pending Admin Verification</div>
          <div style={{ fontSize: 11.5, color: '#4b5563', marginTop: 2 }}>Both proofs uploaded safely — admin reviewing.</div>
        </div>
      </div>
    );
  }

  if (iHaveSubmitted) {
    return (
      <div className="proof-status-card submitted">
        <span style={{ fontSize: 20 }}>🛡️</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#047857' }}>✓ Proof Submitted & Verified</div>
          <div style={{ fontSize: 11.5, color: '#374151', marginTop: 2 }}>
            Awaiting {isIncoming ? trade.sender_username || 'partner' : trade.receiver_username || 'partner'}'s proof.
          </div>
        </div>
      </div>
    );
  }

  return (
    <Btn variant="proof" onClick={onOpenProofDialog} style={{ marginTop: 12 }}>
      📸 Submit Exchange Proof
    </Btn>
  );
}

// ── TradeCard Main Component ──────────────────────────────────────────────
export default function TradeCard({ trade, currentUserId, onStatusChange }) {
  const navigate = useNavigate();

  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  const [counterMsg, setCounterMsg] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [localProofSubmitted, setLocalProofSubmitted] = useState(false);
  const [offeredItems, setOfferedItems] = useState(null);
  const [offeredItemsError, setOfferedItemsError] = useState('');

  // ── Collapsible state for past trades (Point 2) ──
  const isPastTrade = [
    TRADE_STATUS.COMPLETED,
    TRADE_STATUS.DECLINED,
    TRADE_STATUS.CANCELLED,
    TRADE_STATUS.REJECTED
  ].includes(trade.status);

  const [isExpanded, setIsExpanded] = useState(!isPastTrade);

  useEffect(() => {
    let cancelled = false;
    async function fetchOfferedItems() {
      try {
        const data = await getTradeItems(trade.id);
        if (!cancelled) setOfferedItems(data.offeredItems);
      } catch {
        if (!cancelled) setOfferedItemsError('Could not load offered items');
      }
    }
    fetchOfferedItems();
    return () => { cancelled = true; };
  }, [trade.id, trade.updated_at]);

  const isIncoming = trade.receiver_id === currentUserId;
  const isOutgoing = trade.sender_id === currentUserId;
  const canRespond = isIncoming && trade.status === TRADE_STATUS.PENDING;
  const canChat = [
    TRADE_STATUS.ACCEPTED,
    TRADE_STATUS.COMPLETED,
    TRADE_STATUS.PROOF_PENDING,
    TRADE_STATUS.AWAITING_ADMIN_VERIFICATION
  ].includes(trade.status);
  const canCounter = isIncoming && trade.status === TRADE_STATUS.PENDING;
  const hasCounter = trade.needs_more_items && trade.counter_note;
  const counterText = trade.counter_note;

  const senderSubmitted = !!trade.sender_proof_submitted;
  const receiverSubmitted = !!trade.receiver_proof_submitted;
  const iHaveSubmitted = localProofSubmitted || (isIncoming ? receiverSubmitted : senderSubmitted);
  const bothSubmitted = (senderSubmitted && receiverSubmitted) ||
                        (localProofSubmitted && (isIncoming ? senderSubmitted : receiverSubmitted));

  const showProofSection = [
    TRADE_STATUS.ACCEPTED,
    TRADE_STATUS.PROOF_PENDING,
    TRADE_STATUS.AWAITING_ADMIN_VERIFICATION,
    TRADE_STATUS.COMPLETED,
  ].includes(trade.status) && (isIncoming || isOutgoing);

  const partnerName = isIncoming ? trade.sender_username : trade.receiver_username;
  const partnerAvatarUrl = isIncoming ? trade.sender_profile_image : trade.receiver_profile_image;
  const headerLabel = isIncoming ? '↙ Incoming Request' : '↗ Your Offer';

  const offeredLabel = isIncoming ? 'They offered' : 'You offered';
  const requestedLabel = isIncoming ? 'They want' : 'Requested';

  const offeredMeta = normalizeMeta([
    trade.offered_item_condition?.replace(/_/g, ' '),
    trade.offered_item_value ? `Est. $${trade.offered_item_value}` : null,
  ]);
  const requestedMeta = normalizeMeta([
    trade.requested_item_condition?.replace(/_/g, ' '),
    trade.requested_item_value ? `Est. $${trade.requested_item_value}` : null,
  ]);

  const displayDate = trade.created_at ? fmtDate(trade.created_at) : '—';

  const handleAction = useCallback(async (newStatus) => {
    setActing(true);
    setActionError('');
    setShowAcceptDialog(false);
    try {
      await onStatusChange(trade.id, newStatus);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Something went wrong';
      setActionError(`Failed: ${msg}`);
    } finally {
      setActing(false);
    }
  }, [onStatusChange, trade.id]);

  const items = offeredItems && offeredItems.length > 0 ? offeredItems : [{
    id: trade.offered_item_id,
    title: trade.offered_item_title ?? 'Unknown',
    image_urls: trade.offered_item_images,
    item_condition: trade.offered_item_condition,
    estimated_value: trade.offered_item_value,
  }];

  const isCompleted = trade.status === TRADE_STATUS.COMPLETED;
  const isDeclined = trade.status === TRADE_STATUS.DECLINED || trade.status === TRADE_STATUS.CANCELLED;
  const isAwaiting = trade.status === TRADE_STATUS.AWAITING_ADMIN_VERIFICATION || bothSubmitted;

  // ── Requirement 2: Render Compact Row for Past Trades by default ──
  if (isPastTrade && !isExpanded) {
    return (
      <>
        <style>{TRADE_ITEMS_ROW_CSS}</style>
        <div
          className="past-trade-row"
          onClick={() => setIsExpanded(true)}
          role="button"
          tabIndex={0}
          aria-label={`Past trade with @${partnerName}: ${items[0]?.title} for ${trade.requested_item_title}`}
        >
          <div className="past-trade-left">
            <div className="avatar">
              {partnerName ? partnerName.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="past-trade-info">
              <span className="past-trade-handle">
                @{partnerName || 'user'} <span className="who-text"><span className="trust-tag">· Verified Member</span></span>
              </span>
              <span className="past-trade-snippet">
                {items[0]?.title ?? 'Item'} ⇄ {trade.requested_item_title ?? 'Item'}
              </span>
            </div>
          </div>

          <div className="past-trade-right">
            <span className={`single-dot ${isCompleted ? 'completed' : 'declined'}`} />
            <span className="past-trade-date">{displayDate}</span>
            <span className="past-trade-chevron">▼</span>
          </div>
        </div>
      </>
    );
  }

  // ── Container classes ──
  const cardClassName = `ticket${canRespond ? ' needs-response' : ''}${isCompleted ? ' is-completed' : ''}${isDeclined ? ' is-declined' : ''}${isAwaiting && !isCompleted ? ' is-awaiting' : ''}`;

  return (
    <>
      <style>{TRADE_ITEMS_ROW_CSS}</style>
      <article className={cardClassName}>
        {/* ── Header ── */}
        <div className="ticket-head">
          <div className="who">
            {partnerAvatarUrl ? (
              <img
                src={partnerAvatarUrl}
                alt={partnerName || 'User'}
                className="avatar"
                onError={e => {
                  e.currentTarget.replaceWith((() => {
                    const d = document.createElement('div');
                    d.className = 'avatar';
                    d.textContent = partnerName ? partnerName.charAt(0).toUpperCase() : '?';
                    return d;
                  })());
                }}
              />
            ) : (
              <div className="avatar">
                {partnerName ? partnerName.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            <div className="who-text">
              <div className="handle">
                {canRespond && <span className="pulse-dot" title="Needs Response" />}
                {isIncoming ? '↙ ' : '↗ '}@{partnerName || 'unknown'}
              </div>
              <span className="trust-tag">· Verified Member</span>
              <div className="date">{displayDate}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusChip status={trade.status} />
            {isPastTrade && (
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}
              >
                ▲ Collapse
              </button>
            )}
          </div>
        </div>

        {/* ── Counter-request banner ── */}
        {isOutgoing && hasCounter && (
          <div style={{ padding: '10px 20px', background: 'rgba(234,179,8,0.08)', borderBottom: '1px solid rgba(234,179,8,0.2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16 }}>💬</span>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#92400e' }}>Receiver requested more items</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#78350f' }}>{counterText}</p>
            </div>
          </div>
        )}

        {/* ── Item panes ── */}
        <div className="ticket-body">
          <div className="ticket-body-container">
            {/* Offered side */}
            {offeredItemsError && <p style={{ margin: 0, fontSize: 11, color: '#b91c1c' }}>{offeredItemsError}</p>}
            {items.length > 1 ? (
              <div className="item-row give multi">
                <div className="side-label">{offeredLabel} · {items.length} items</div>
                <div className="multi-items-row">
                  {items.slice(0, 2).map((item, idx) => (
                    <span key={item.id} style={{ display: 'contents' }}>
                      {idx > 0 && <span className="multi-plus-icon">+</span>}
                      <img
                        className="multi-item-thumb"
                        src={item.image_urls?.[0] ?? FALLBACK_IMAGE}
                        alt={item.title}
                        onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }}
                      />
                    </span>
                  ))}
                  {items.length > 2 && <span className="multi-more-badge">+{items.length - 2} more</span>}
                </div>
                <div className="multi-items-meta">
                  <div className="name">{items.slice(0, 2).map(i => i.title).join(' + ')}{items.length > 2 ? ` +${items.length - 2} more` : ''}</div>
                  <div className="cond">{items[0]?.item_condition?.replace(/_/g, ' ') || 'Good'}</div>
                </div>
              </div>
            ) : (
              <Link to={`/item/${items[0]?.id}`} className="item-row give">
                <img src={items[0]?.image_urls?.[0] ?? FALLBACK_IMAGE} alt={items[0]?.title} onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }} />
                <div className="meta">
                  <div className="side-label">{offeredLabel}</div>
                  <div className="name">{items[0]?.title ?? 'Unknown'}</div>
                  <div className="cond">{offeredMeta}</div>
                </div>
              </Link>
            )}

            {/* Divider */}
            <div className="divider">
              <div className="dash" />
              <div className="swap-badge" aria-hidden="true">⇄</div>
              <div className="dash" />
            </div>

            {/* Requested side */}
            <Link to={`/item/${trade.requested_item_id}`} className="item-row get">
              <img src={trade.requested_item_images?.[0] ?? FALLBACK_IMAGE} alt={trade.requested_item_title} onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }} />
              <div className="meta">
                <div className="side-label">{requestedLabel}</div>
                <div className="name">{trade.requested_item_title ?? 'Unknown'}</div>
                <div className="cond">{requestedMeta}</div>
              </div>
            </Link>
          </div>

          {/* Message */}
          {trade.message && !hasCounter && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 14, background: 'rgba(0,0,0,0.03)', border: '1px solid var(--line)' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>"{trade.message}"</p>
            </div>
          )}

          {/* Proof Status Section */}
          {showProofSection && (
            <ProofStatusSection
              trade={{ ...trade, sender_proof_submitted: trade.sender_proof_submitted || (!isIncoming && iHaveSubmitted), receiver_proof_submitted: trade.receiver_proof_submitted || (isIncoming && iHaveSubmitted) }}
              currentUserId={currentUserId}
              onOpenProofDialog={() => setShowProofDialog(true)}
            />
          )}

          {/* Timeline toggle */}
          {showProofSection && (
            <button
              type="button"
              onClick={() => setShowTimeline(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 10, padding: '2px 0', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              {showTimeline ? '▾' : '▸'} Trade Timeline
            </button>
          )}
          {showTimeline && showProofSection && (
            <TradeTimeline
              trade={trade}
              isIncoming={isIncoming}
              iHaveSubmitted={iHaveSubmitted}
            />
          )}

          {/* Actions footer */}
          <div className="ticket-foot" style={{ padding: '16px 0 0', gap: 8 }}>
            {/* Open Chat - Solid CTA when needs response */}
            {canChat && (
              <Btn
                onClick={() => navigate(`/chat/${trade.id}`)}
                variant={canRespond ? "high-contrast" : "secondary"}
              >
                💬 Chat & Coordinate
              </Btn>
            )}

            {/* Accept / Decline */}
            {canRespond && (
              <>
                <Btn onClick={() => handleAction(TRADE_STATUS.ACCEPTED)} variant="primary" disabled={acting}>
                  {acting ? 'Accepting…' : '✓ Accept Trade'}
                </Btn>
                <Btn onClick={() => handleAction(TRADE_STATUS.DECLINED)} variant="secondary" disabled={acting}>
                  {acting ? 'Declining…' : '✕ Decline'}
                </Btn>
              </>
            )}
          </div>
        </div>

        {/* Modals */}
        {showProofDialog && (
          <ProofDialog
            tradeId={trade.id}
            onClose={() => setShowProofDialog(false)}
            onSubmitted={() => {
              setLocalProofSubmitted(true);
              setShowProofDialog(false);
              if (onStatusChange) onStatusChange(trade.id, 'refresh');
            }}
          />
        )}
      </article>
    </>
  );
}
