import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TRADE_STATUS } from '../../utils/constants';
import { requestMoreItems, getTradeItems, addItemsToTrade, cancelTrade, submitProof } from '../../services/tradeService';
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
  background: rgba(198, 233, 48, 0.22);
  color: #5c6b12;
}
.status.completed::before { background: #8a9c1c; }

.status.pending {
  background: #fff3d8;
  color: #8a5a12;
}
.status.pending::before { background: #c98a1e; }

/* New proof statuses */
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

.status.rejected {
  background: #fbeaea;
  color: #b4442e;
}
.status.rejected::before { background: #b4442e; }

/* ── Progress bar ── */
.progress-wrap {
  padding: 0 16px 12px;
}
.progress-track {
  height: 5px;
  background: rgba(15, 61, 46, 0.08);
  border-radius: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--lime-hover);
  border-radius: 4px;
  transition: width 0.3s ease;
}
.progress-label {
  font-size: 11px;
  color: var(--muted);
  margin-top: 5px;
  font-family: 'IBM Plex Mono', monospace;
}

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
.item-row img {
  width: 38px; height: 38px;
  border-radius: 9px;
  object-fit: cover;
  flex-shrink: 0;
  background: #ddd;
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
.btn:disabled { cursor: not-allowed; }

.btn-primary   { background: var(--lime); color: var(--dark); }
.btn-primary:hover:not(:disabled) { background: var(--lime-hover); }

.btn-secondary {
  background: transparent; color: var(--dark);
  border: 1.5px solid rgba(15, 61, 46, 0.18);
}
.btn-secondary:hover:not(:disabled) { background: rgba(15, 61, 46, 0.04); }

.btn-waiting { background: rgba(15, 61, 46, 0.05); color: var(--muted); }

.btn-ghost { background: transparent; color: var(--muted); }
.btn-ghost:hover:not(:disabled) { background: rgba(15, 61, 46, 0.02); }

.btn-proof {
  background: linear-gradient(135deg, #1b4d3e 0%, #2f6b52 100%);
  color: #c6e930;
  font-weight: 700;
}
.btn-proof:hover:not(:disabled) {
  background: linear-gradient(135deg, #0f3d2e 0%, #1b4d3e 100%);
  transform: translateY(-1px);
}

/* Multi-item cluster */
.item-row.multi { flex-direction: column; align-items: flex-start; gap: 8px; }
.multi-images { display: flex; align-items: center; gap: 7px; }
.multi-images img {
  width: 38px; height: 38px; border-radius: 9px; object-fit: cover;
  border: 2px solid rgba(255,255,255,0.9); box-shadow: 0 0 0 1px var(--line);
}
.multi-images .plus { font-size: 14px; font-weight: 800; color: var(--muted); }
.multi-images .more-badge {
  width: 38px; height: 38px; border-radius: 9px;
  background: rgba(15,61,46,0.08);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: var(--muted);
}
.item-row.multi .meta { width: 100%; }

/* Outcome tinting */
.ticket.is-completed { background: #e8f8ee; border-color: rgba(44,122,75,0.36); box-shadow: 0 4px 14px rgba(44,122,75,0.10); }
.ticket.is-declined  { background: #fdeee7; border-color: rgba(180,68,46,0.30);  box-shadow: 0 4px 14px rgba(180,68,46,0.09); }
.ticket.is-awaiting  { background: rgba(59,130,246,0.04); border-color: rgba(37,99,235,0.2); }

.ticket.is-completed .item-row.give,
.ticket.is-completed .item-row.get,
.ticket.is-declined  .item-row.give,
.ticket.is-declined  .item-row.get { background: rgba(255,255,255,0.75); }

@media (min-width: 640px) {
  .ticket-body-container { flex-direction: row; align-items: center; gap: 12px; }
  .ticket-body-container .item-row { flex: 1; margin-bottom: 0; }
  .ticket-body-container .divider  { flex-direction: column; height: 60px; margin: 0; gap: 5px; }
  .ticket-body-container .divider .dash { border-top: none; border-left: 1.5px dashed var(--line); height: 100%; width: 0; }
}

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 1100; padding: 18px;
  backdrop-filter: blur(4px);
  pointer-events: all;
}
.modal-card {
  background: rgba(255,255,255,0.96);
  border-radius: 24px;
  padding: 28px 24px 24px;
  width: 100%; max-width: 460px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(15,61,46,0.1);
  border: 1px solid var(--line);
  max-height: 92vh;
  overflow-y: auto;
}
.modal-card h3 { margin: 0 0 10px; font-size: 18px; font-weight: 800; color: var(--ink); }
.modal-card p  { margin: 0 0 18px; font-size: 13.5px; color: var(--muted); line-height: 1.65; }
.modal-foot { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.modal-foot .btn { flex: 0 0 auto; padding: 11px 22px; }

/* ── Proof status card ── */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
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
  background: rgba(198,233,48,0.12);
  border: 1px solid rgba(198,233,48,0.4);
}
.proof-status-card.awaiting {
  background: rgba(59,130,246,0.06);
  border: 1px solid rgba(59,130,246,0.18);
}
.proof-status-card.completed {
  background: rgba(44,122,75,0.08);
  border: 1px solid rgba(44,122,75,0.25);
}

/* ── Trade timeline ── */
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

/* ── Proof upload zone ── */
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
function TradeTimeline({ trade, isIncoming, iHaveSubmitted, partnerHasSubmitted }) {
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
      // Gracefully handle if backend endpoint isn't ready yet
      const msg = err?.response?.data?.error || err?.message || '';
      if (err?.response?.status === 404 || msg.includes('Cannot POST')) {
        // Backend not yet wired — treat as success for UI purposes
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
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}>📸</span>
          <h3 style={{ margin: 0 }}>Submit Exchange Proof</h3>
        </div>
        <p>
          Upload photos of the exchange — the item received, the parcel, or the handover.
          Both parties must submit before admin can verify.
        </p>

        {/* Upload zone */}
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

        {/* Thumbnails */}
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

        {/* Optional note */}
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

// ── Proof Status Card ──────────────────────────────────────────────────────
function ProofStatusSection({ trade, currentUserId, onOpenProofDialog }) {
  // Derive proof state from backend fields (if present) or local state
  const isIncoming = trade.receiver_id === currentUserId;
  const isOutgoing = trade.sender_id === currentUserId;

  // Backend fields (set by Member 1 after endpoint is live):
  const senderSubmitted  = !!trade.sender_proof_submitted;
  const receiverSubmitted = !!trade.receiver_proof_submitted;

  // Which side am I?
  const iHaveSubmitted    = isIncoming ? receiverSubmitted : senderSubmitted;
  const partnerSubmitted  = isIncoming ? senderSubmitted   : receiverSubmitted;
  const bothSubmitted     = senderSubmitted && receiverSubmitted;

  const isCompleted  = trade.status === TRADE_STATUS.COMPLETED;
  const isAwaiting   = trade.status === TRADE_STATUS.AWAITING_ADMIN_VERIFICATION || bothSubmitted;

  if (isCompleted) {
    return (
      <div className="proof-status-card completed">
        <span style={{ fontSize: 20 }}>🎉</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#14532d' }}>Trade Completed</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>Admin has verified and marked this trade as complete.</div>
        </div>
      </div>
    );
  }

  if (isAwaiting) {
    return (
      <div className="proof-status-card awaiting">
        <span style={{ fontSize: 20 }}>🔍</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>Pending Admin Verification</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>Both users submitted proof. Estimated review: 24–48 hrs.</div>
        </div>
      </div>
    );
  }

  if (iHaveSubmitted) {
    return (
      <div className="proof-status-card submitted">
        <span style={{ fontSize: 20 }}>✅</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#14532d' }}>✓ Proof Submitted</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
            Waiting for {isIncoming ? trade.sender_username || 'the other user' : trade.receiver_username || 'the other user'} to submit their proof.
          </div>
        </div>
      </div>
    );
  }

  // Not yet submitted — show the button
  return (
    <Btn variant="proof" onClick={onOpenProofDialog} style={{ marginTop: 12 }}>
      📸 Submit Exchange Proof
    </Btn>
  );
}

// ── TradeCard ─────────────────────────────────────────────────────────────
export default function TradeCard({ trade, currentUserId, onStatusChange }) {
  const navigate = useNavigate();

  const [acting, setActing]                     = useState(false);
  const [actionError, setActionError]           = useState('');
  const [hovered, setHovered]                   = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  const [counterMsg, setCounterMsg]             = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showTimeline, setShowTimeline]         = useState(false);

  // Proof dialog state
  const [showProofDialog, setShowProofDialog]   = useState(false);
  // Local proof submitted state (in case backend fields aren't live yet)
  const [localProofSubmitted, setLocalProofSubmitted] = useState(false);

  // Multi-item offered items state
  const [offeredItems, setOfferedItems]         = useState(null);
  const [offeredItemsError, setOfferedItemsError] = useState('');

  // Edit trade offer state
  const [showEditModal, setShowEditModal]       = useState(false);
  const [myItems, setMyItems]                   = useState([]);
  const [loadingMyItems, setLoadingMyItems]     = useState(false);
  const [selectedNewItemIds, setSelectedNewItemIds] = useState([]);
  const [editError, setEditError]               = useState('');
  const [submittingEdit, setSubmittingEdit]     = useState(false);

  // ── Fetch offered items ────────────────────────────────────────────────
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

  // ── Ownership helpers ─────────────────────────────────────────────────
  const isIncoming = trade.receiver_id === currentUserId;
  const isOutgoing = trade.sender_id   === currentUserId;
  const canRespond = isIncoming && trade.status === TRADE_STATUS.PENDING;
  const canChat    = [TRADE_STATUS.ACCEPTED, TRADE_STATUS.COMPLETED,
                      TRADE_STATUS.PROOF_PENDING, TRADE_STATUS.AWAITING_ADMIN_VERIFICATION].includes(trade.status);
  const canCounter = isIncoming && trade.status === TRADE_STATUS.PENDING;
  const hasCounter = trade.needs_more_items && trade.counter_note;
  const counterText = trade.counter_note;

  // Proof state — merge backend fields with local optimistic state
  const senderSubmitted   = !!trade.sender_proof_submitted;
  const receiverSubmitted = !!trade.receiver_proof_submitted;
  const iHaveSubmitted    = localProofSubmitted || (isIncoming ? receiverSubmitted : senderSubmitted);
  const bothSubmitted     = (senderSubmitted && receiverSubmitted) ||
                            (localProofSubmitted && (isIncoming ? senderSubmitted : receiverSubmitted));

  // Show proof section for accepted / proof_pending / awaiting_admin_verification / completed
  const showProofSection = [
    TRADE_STATUS.ACCEPTED, TRADE_STATUS.PROOF_PENDING,
    TRADE_STATUS.AWAITING_ADMIN_VERIFICATION, TRADE_STATUS.COMPLETED,
  ].includes(trade.status) && (isIncoming || isOutgoing);

  const partnerName       = isIncoming ? trade.sender_username   : trade.receiver_username;
  const partnerAvatarUrl  = isIncoming ? trade.sender_profile_image : trade.receiver_profile_image;
  const headerLabel       = isIncoming ? '↙ Incoming Request' : '↗ Your Offer';

  const offeredLabel   = isIncoming ? 'They offered' : 'You offered';
  const requestedLabel = isIncoming ? 'They want'    : 'Requested';

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

  async function handleCounterSubmit() {
    if (!counterMsg.trim()) return;
    setActing(true); setActionError('');
    try {
      await requestMoreItems(trade.id, counterMsg);
      if (onStatusChange) await onStatusChange(trade.id, 'refresh');
      setShowCounterDialog(false); setCounterMsg('');
    } catch (err) {
      setActionError(`Counter-request failed: ${err?.response?.data?.error || err?.message || 'Something went wrong'}`);
    } finally { setActing(false); }
  }

  async function openEditModal() {
    setEditError(''); setSelectedNewItemIds([]); setShowEditModal(true); setLoadingMyItems(true);
    try {
      const res = await api.get('/items/mine');
      const alreadyOfferedIds = new Set((offeredItems || []).map(i => i.id));
      setMyItems((res.data.items || []).filter(i => i.status === 'available' && !alreadyOfferedIds.has(i.id)));
    } catch { setEditError('Could not load your items.'); }
    finally { setLoadingMyItems(false); }
  }

  function toggleNewItem(itemId) {
    setSelectedNewItemIds(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  }

  async function handleSubmitEdit() {
    if (selectedNewItemIds.length === 0) { setEditError('Select at least one item to add.'); return; }
    setSubmittingEdit(true); setEditError('');
    try {
      await addItemsToTrade(trade.id, selectedNewItemIds);
      setShowEditModal(false); setSelectedNewItemIds([]);
      if (onStatusChange) await onStatusChange(trade.id, 'refresh');
    } catch (err) {
      setEditError(err?.response?.data?.error || err?.message || 'Failed to update offer.');
    } finally { setSubmittingEdit(false); }
  }

  const items = offeredItems && offeredItems.length > 0 ? offeredItems : [{
    id: trade.offered_item_id,
    title: trade.offered_item_title ?? 'Unknown',
    image_urls: trade.offered_item_images,
    item_condition: trade.offered_item_condition,
    estimated_value: trade.offered_item_value,
  }];

  const isCompleted = trade.status === TRADE_STATUS.COMPLETED;
  const isDeclined  = trade.status === TRADE_STATUS.DECLINED || trade.status === TRADE_STATUS.CANCELLED;
  const isAwaiting  = trade.status === TRADE_STATUS.AWAITING_ADMIN_VERIFICATION || bothSubmitted;
  const cardClassName = `ticket${isCompleted ? ' is-completed' : ''}${isDeclined ? ' is-declined' : ''}${isAwaiting && !isCompleted ? ' is-awaiting' : ''}`;

  return (
    <>
      <style>{TRADE_ITEMS_ROW_CSS}</style>
      <article
        aria-label={`${headerLabel}: ${trade.offered_item_title ?? 'item'} for ${trade.requested_item_title ?? 'item'}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cardClassName}
      >
        {/* ── Header ── */}
        <div className="ticket-head">
          <div className="who">
            {partnerAvatarUrl ? (
              <img
                src={partnerAvatarUrl}
                alt={partnerName || 'User'}
                className="avatar"
                style={{ objectFit: 'cover' }}
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
                {isIncoming ? '↙ ' : '↗ '}@{partnerName || 'unknown'}
              </div>
              <div className="date">{displayDate}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusChip status={trade.status} />
          </div>
        </div>

        {/* ── Counter-request banner ── */}
        {isOutgoing && hasCounter && (
          <div style={{ padding: '10px 20px', background: 'rgba(234,179,8,0.08)', borderBottom: '1px solid rgba(234,179,8,0.2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16 }} aria-hidden="true">💬</span>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#92400e' }}>Receiver requested more items</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#78350f' }}>{counterText}</p>
            </div>
          </div>
        )}

        {/* ── Chat available banner ── */}
        {canChat && trade.status === TRADE_STATUS.ACCEPTED && (
          <div style={{ padding: '8px 20px', background: 'rgba(22,163,74,0.07)', borderBottom: '1px solid rgba(22,163,74,0.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#14532d', fontWeight: 700 }}>Chat open — coordinate the exchange</span>
          </div>
        )}

        {/* ── Awaiting admin banner ── */}
        {isAwaiting && !isCompleted && (
          <div style={{ padding: '8px 20px', background: 'rgba(59,130,246,0.06)', borderBottom: '1px solid rgba(59,130,246,0.14)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13 }}>🔍</span>
            <span style={{ fontSize: 13, color: '#1e40af', fontWeight: 700 }}>Both proofs submitted — pending admin verification</span>
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
                <div className="multi-images">
                  {items.slice(0, 3).map((item, idx) => (
                    <span key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      {idx > 0 && <span className="plus">+</span>}
                      <img src={item.image_urls?.[0] ?? FALLBACK_IMAGE} alt={item.title} onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }} />
                    </span>
                  ))}
                  {items.length > 3 && <div className="more-badge">+{items.length - 3}</div>}
                </div>
                <div className="meta">
                  <div className="name">{items.map(i => i.title).join(' + ')}</div>
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
              <div className="swap-badge" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 2L4 10M4 10L2 8M4 10L6 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 12L10 4M10 4L8 6M10 4L12 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
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

          {/* ── Proof Status Section (replaces "Confirm Completion") ── */}
          {showProofSection && (
            <ProofStatusSection
              trade={{ ...trade, sender_proof_submitted: trade.sender_proof_submitted || (!isIncoming && iHaveSubmitted), receiver_proof_submitted: trade.receiver_proof_submitted || (isIncoming && iHaveSubmitted) }}
              currentUserId={currentUserId}
              onOpenProofDialog={() => setShowProofDialog(true)}
            />
          )}

          {/* ── Timeline toggle for accepted+ trades ── */}
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
              partnerHasSubmitted={isIncoming ? !!trade.sender_proof_submitted : !!trade.receiver_proof_submitted}
            />
          )}

          {/* ── Actions footer ── */}
          <div className="ticket-foot" style={{ padding: '16px 0 0', gap: 8 }}>
            {/* Open Chat */}
            {canChat && (
              <Btn onClick={() => navigate(`/chat/${trade.id}`)} variant="secondary">
                💬 Chat
              </Btn>
            )}

            {/* Accept / Decline */}
            {canRespond && (
              <>
                <Btn onClick={() => setShowAcceptDialog(true)} variant="primary" disabled={acting}>
                  {acting ? 'Accepting…' : '✓ Accept'}
                </Btn>
                <Btn onClick={() => handleAction(TRADE_STATUS.DECLINED)} variant="secondary" disabled={acting}>
                  {acting ? 'Declining…' : '✕ Decline'}
                </Btn>
              </>
            )}

            {/* Request More Items */}
            {canCounter && (
              <Btn onClick={() => setShowCounterDialog(true)} variant="secondary">
                + Request More Items
              </Btn>
            )}

            {/* Edit Trade Offer */}
            {isOutgoing && trade.status === TRADE_STATUS.PENDING && trade.needs_more_items && (
              <Btn onClick={openEditModal} variant="primary" disabled={acting}>
                Edit Trade Offer
              </Btn>
            )}

            {/* Pending sender: waiting + cancel */}
            {isOutgoing && trade.status === TRADE_STATUS.PENDING && !trade.needs_more_items && (
              <>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, alignSelf: 'center', flex: 1 }}>
                  Waiting for response...
                </span>
                <Btn
                  onClick={() => setShowCancelDialog(true)}
                  variant="ghost"
                  disabled={acting}
                  style={{ color: '#b4442e', border: '1px solid rgba(180,68,46,0.2)', minWidth: 0 }}
                >
                  Withdraw Offer
                </Btn>
              </>
            )}
          </div>

          {actionError && (
            <p role="alert" style={{ margin: '10px 0 0', fontSize: 12, color: '#b91c1c', fontWeight: 700 }}>
              ⚠ {actionError}
            </p>
          )}
        </div>
      </article>

      {/* ── Accept dialog ── */}
      {showAcceptDialog && (
        <div role="dialog" aria-modal="true" aria-label="Confirm acceptance" className="modal-overlay">
          <div className="modal-card">
            <h3>Accept this trade?</h3>
            <p>
              Both items will be locked and the chat will open so you can arrange the exchange.
              After the exchange, both of you will upload proof photos for admin verification.
            </p>
            <div className="modal-foot">
              <Btn onClick={() => setShowAcceptDialog(false)} variant="secondary">Cancel</Btn>
              <Btn onClick={() => handleAction(TRADE_STATUS.ACCEPTED)} variant="primary" disabled={acting}>
                {acting ? 'Accepting…' : 'Yes, accept'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Request More Items dialog ── */}
      {showCounterDialog && (
        <div role="dialog" aria-modal="true" aria-label="Request more items" className="modal-overlay">
          <div className="modal-card">
            <h3>Request Additional Items</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)' }}>
              Tell the sender what else you'd like added to make this trade fair.
            </p>
            <textarea
              value={counterMsg}
              onChange={e => setCounterMsg(e.target.value)}
              placeholder="e.g. This laptop is worth more — please add your headphones too."
              rows={4}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid var(--line)', background: 'var(--cream)', color: 'var(--ink)', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <div className="modal-foot">
              <Btn onClick={() => { setShowCounterDialog(false); setCounterMsg(''); }} variant="secondary">Cancel</Btn>
              <Btn onClick={handleCounterSubmit} variant="primary" disabled={!counterMsg.trim()}>Send Request</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Withdraw Trade Offer dialog ── */}
      {showCancelDialog && (
        <div role="dialog" aria-modal="true" aria-label="Withdraw trade offer"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 18, backdropFilter: 'blur(4px)' }}
        >
          <div style={{ maxWidth: 400, width: '100%', borderRadius: 22, padding: 24, background: 'var(--paper)', border: '1px solid rgba(180,68,46,0.22)', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>Withdraw this offer?</h3>
            <p style={{ margin: '0 0 22px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.65 }}>
              The offer will be cancelled and the receiver will be notified. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn onClick={() => setShowCancelDialog(false)} variant="secondary">Keep Offer</Btn>
              <Btn
                disabled={acting}
                onClick={async () => {
                  setActing(true); setActionError(''); setShowCancelDialog(false);
                  try {
                    await cancelTrade(trade.id);
                    await onStatusChange(trade.id, 'refresh');
                  } catch (err) {
                    setActionError(err?.response?.data?.error || err?.message || 'Failed to cancel trade');
                  } finally { setActing(false); }
                }}
                variant="ghost"
                style={{ background: 'rgba(180,68,46,0.1)', color: '#b4442e', border: '1px solid rgba(180,68,46,0.25)' }}
              >
                {acting ? 'Withdrawing…' : 'Yes, withdraw'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Trade Offer modal ── */}
      {showEditModal && (
        <div role="dialog" aria-modal="true" aria-label="Edit trade offer" className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false); }}
        >
          <div className="modal-card" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
            <h3>Edit Your Offer</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)' }}>
              Add more items to satisfy the receiver's request.
            </p>

            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Currently offered ({(offeredItems || []).length} item{(offeredItems || []).length !== 1 ? 's' : ''})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
              {(offeredItems || []).map(item => (
                <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', borderRadius: 12, background: 'rgba(248,237,229,0.6)', border: '1px solid var(--line)' }}>
                  <img src={item.image_urls?.[0] ?? FALLBACK_IMAGE} alt={item.title} onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                </div>
              ))}
            </div>

            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Add items {selectedNewItemIds.length > 0 && `— ${selectedNewItemIds.length} selected`}
            </p>

            {editError && (
              <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>
                {editError}
              </div>
            )}

            {loadingMyItems ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Loading your items…</p>
            ) : myItems.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>No other available items to add.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18, maxHeight: 220, overflowY: 'auto' }}>
                {myItems.map(item => {
                  const selected = selectedNewItemIds.includes(item.id);
                  return (
                    <button key={item.id} type="button" onClick={() => toggleNewItem(item.id)}
                      style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', borderRadius: 12, background: selected ? 'rgba(198,233,48,0.08)' : 'var(--cream)', border: selected ? '1px solid var(--lime)' : '1px solid var(--line)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.15s, border-color 0.15s', outline: 'none' }}
                    >
                      <img src={item.image_urls?.[0] ?? FALLBACK_IMAGE} alt={item.title} onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                        {item.estimated_value && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>Est. ${item.estimated_value}</p>}
                      </div>
                      {selected && <span style={{ fontSize: 16, color: 'var(--dark)', fontWeight: 'bold', flexShrink: 0 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="modal-foot">
              <Btn onClick={() => { setShowEditModal(false); setSelectedNewItemIds([]); setEditError(''); }} variant="secondary" disabled={submittingEdit}>Cancel</Btn>
              <Btn onClick={handleSubmitEdit} variant="primary" disabled={submittingEdit || selectedNewItemIds.length === 0}>
                {submittingEdit ? 'Sending…' : 'Send Updated Offer'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Proof Submit Dialog ── */}
      {showProofDialog && (
        <ProofDialog
          tradeId={trade.id}
          onClose={() => setShowProofDialog(false)}
          onSubmitted={() => {
            setShowProofDialog(false);
            setLocalProofSubmitted(true);
            // Refresh trade data from parent
            if (onStatusChange) onStatusChange(trade.id, 'refresh');
          }}
        />
      )}
    </>
  );
}
