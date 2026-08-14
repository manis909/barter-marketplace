import { useState, useEffect, useCallback } from 'react';
import {
  getAdminPendingPayments,
  adminConfirmPayment,
  adminRejectPayment,
  getPaymentScreenshotUrl,
} from '../services/skillBookingService';

const ADMIN_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

:root {
  --dark:        #0f3d2e;
  --green:       #1b4d3e;
  --light-green: #2f6b52;
  --lime:        #c6e930;
  --cream:       #f7f5ee;
  --paper:       #ffffff;
  --ink:         #10241c;
  --muted:       #647167;
  --line:        rgba(15,61,46,0.12);
  --amber:       #fef3c7;
  --amber-ink:   #92400e;
  --amber-border:#f59e0b;
  --danger-bg:   #fee2e2;
  --danger:      #991b1b;
}

.apr-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  font-family: 'Inter', sans-serif;
  color: var(--ink);
  background: var(--cream);
  min-height: 100vh;
}

.apr-header {
  background: linear-gradient(135deg, var(--dark) 0%, var(--green) 55%, var(--light-green) 100%);
  border-radius: 22px;
  padding: 28px 32px;
  margin-bottom: 32px;
  color: #fff;
}

.apr-header h1 {
  font-family: 'Fraunces', serif;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 6px;
}

.apr-header p {
  margin: 0;
  font-size: 14px;
  opacity: 0.75;
}

.apr-alert {
  padding: 12px 18px;
  border-radius: 12px;
  font-size: 13.5px;
  margin-bottom: 20px;
}
.apr-alert-error   { background: var(--danger-bg); color: var(--danger); border: 1px solid #fca5a5; }
.apr-alert-success { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }

.apr-empty {
  text-align: center;
  padding: 60px 32px;
  background: var(--paper);
  border-radius: 18px;
  border: 1px dashed var(--line);
  color: var(--muted);
  font-size: 14px;
}

.apr-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 900px) {
  .apr-grid { grid-template-columns: repeat(2, 1fr); }
}

.apr-card {
  background: var(--paper);
  border-radius: 18px;
  border: 1.5px solid var(--line);
  box-shadow: 0 3px 12px rgba(15,61,46,0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.apr-card-header {
  background: rgba(15,61,46,0.03);
  border-bottom: 1px solid var(--line);
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.apr-card-header-left h2 {
  font-family: 'Fraunces', serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--dark);
  margin: 0 0 4px;
}

.apr-card-header-left p {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.apr-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: 10px;
  background: var(--amber);
  color: var(--amber-ink);
  border: 1.5px solid var(--amber-border);
  white-space: nowrap;
}

.apr-card-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
}

.apr-meta-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.apr-meta-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
}

.apr-meta-item strong {
  min-width: 90px;
  color: var(--muted);
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* UTR — monospace, click-to-copy */
.apr-utr {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  color: var(--ink);
  background: rgba(15,61,46,0.05);
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  user-select: all;
  border: 1px solid var(--line);
  transition: background 0.15s;
}
.apr-utr:hover { background: rgba(15,61,46,0.1); }

/* Screenshot */
.apr-screenshot-wrap {
  background: var(--cream);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  position: relative;
}

.apr-screenshot {
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  display: block;
}

.apr-screenshot-placeholder {
  color: var(--muted);
  font-size: 13px;
  text-align: center;
  padding: 24px;
}

/* Reject form */
.apr-reject-form {
  background: var(--danger-bg);
  border: 1px solid #fca5a5;
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.apr-reject-input {
  width: 100%;
  padding: 8px 12px;
  border: 1.5px solid #fca5a5;
  border-radius: 8px;
  font-size: 13px;
  background: #fff;
  color: var(--ink);
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.18s;
  resize: vertical;
}
.apr-reject-input:focus { border-color: var(--danger); }

.apr-actions {
  padding: 14px 18px;
  border-top: 1px solid var(--line);
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  background: rgba(15,61,46,0.01);
}

.btn-confirm {
  background: var(--dark);
  color: #fff;
  border: none;
  padding: 9px 20px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.2s;
  flex: 1;
}
.btn-confirm:hover    { opacity: 0.88; }
.btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-reject {
  background: transparent;
  color: var(--danger);
  border: 1.5px solid #fca5a5;
  padding: 9px 20px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
}
.btn-reject:hover    { background: var(--danger-bg); }
.btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-reject-confirm {
  background: var(--danger);
  color: #fff;
  border: none;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-reject-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-cancel-reject {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--line);
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
}
`;

// ── Screenshot loader ─────────────────────────────────────────────────────────
function BookingScreenshot({ bookingId }) {
  const [blobUrl, setBlobUrl]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [imgError, setImgError] = useState('');

  useEffect(() => {
    let active = true;
    let url    = null;

    async function load() {
      try {
        url = await getPaymentScreenshotUrl(bookingId);
        if (active) setBlobUrl(url);
      } catch (err) {
        if (active) setImgError(err.response?.data?.error || 'Could not load screenshot');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
      // Revoke blob URL to free memory when card unmounts
      if (url) URL.revokeObjectURL(url);
    };
  }, [bookingId]);

  if (loading) {
    return (
      <div className="apr-screenshot-placeholder">
        Loading screenshot…
      </div>
    );
  }

  if (imgError || !blobUrl) {
    return (
      <div className="apr-screenshot-placeholder" style={{ color: '#991b1b' }}>
        {imgError || 'No screenshot available'}
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt="Payment screenshot"
      className="apr-screenshot"
    />
  );
}

// ── Single booking review card ────────────────────────────────────────────────
function ReviewCard({ booking, onRefresh, setGlobalMsg }) {
  const [working, setWorking]             = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason]   = useState('');
  const [localError, setLocalError]       = useState('');

  async function handleConfirm() {
    setLocalError('');
    setWorking(true);
    try {
      await adminConfirmPayment(booking.id);
      setGlobalMsg({ type: 'success', text: `✓ Payment confirmed for ${booking.learner_name} — ${booking.skill_name}` });
      onRefresh();
    } catch (err) {
      const msg = err.response?.data?.error || 'Confirmation failed';
      // 409 = session full — surface prominently
      setLocalError(
        err.response?.status === 409
          ? `⚠️ ${msg}`
          : msg
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleReject() {
    setLocalError('');
    setWorking(true);
    try {
      await adminRejectPayment(booking.id, rejectReason);
      setGlobalMsg({ type: 'success', text: `Rejected — learner has been notified to re-submit.` });
      onRefresh();
    } catch (err) {
      setLocalError(err.response?.data?.error || 'Rejection failed');
    } finally {
      setWorking(false);
      setShowRejectForm(false);
    }
  }

  function copyUtr() {
    navigator.clipboard.writeText(booking.payment_utr || '').then(() => {
      setGlobalMsg({ type: 'success', text: `UTR copied: ${booking.payment_utr}` });
      setTimeout(() => setGlobalMsg(null), 2500);
    });
  }

  const submittedAt = booking.payment_submitted_at
    ? new Date(booking.payment_submitted_at).toLocaleString()
    : '—';

  return (
    <div className="apr-card">
      <div className="apr-card-header">
        <div className="apr-card-header-left">
          <h2>{booking.skill_name}</h2>
          <p>Teacher: @{booking.teacher_username}</p>
        </div>
        <span className="apr-badge">⏳ Pending</span>
      </div>

      <div className="apr-card-body">
        {/* Meta */}
        <div className="apr-meta-row">
          <div className="apr-meta-item">
            <strong>Learner</strong>
            <span>{booking.learner_name} (@{booking.learner_username})</span>
          </div>
          <div className="apr-meta-item">
            <strong>Submitted</strong>
            <span>{submittedAt}</span>
          </div>
          <div className="apr-meta-item">
            <strong>UTR</strong>
            {booking.payment_utr ? (
              <span
                id={`utr-copy-${booking.id}`}
                className="apr-utr"
                onClick={copyUtr}
                title="Click to copy"
              >
                {booking.payment_utr}
              </span>
            ) : (
              <span style={{ color: 'var(--muted)' }}>—</span>
            )}
          </div>
        </div>

        {/* Screenshot — loaded via auth-gated endpoint, displayed as blob: URL */}
        <div className="apr-screenshot-wrap">
          <BookingScreenshot bookingId={booking.id} />
        </div>

        {localError && (
          <div className="apr-alert apr-alert-error">{localError}</div>
        )}

        {/* Reject reason form */}
        {showRejectForm && (
          <div className="apr-reject-form">
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>
              Rejection reason (optional — shown to learner)
            </p>
            <textarea
              id={`reject-reason-${booking.id}`}
              className="apr-reject-input"
              rows={3}
              placeholder="e.g. Screenshot unclear, UTR not matching, wrong amount…"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              disabled={working}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                id={`reject-confirm-${booking.id}`}
                className="btn-reject-confirm"
                onClick={handleReject}
                disabled={working}
              >
                {working ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
              <button
                className="btn-cancel-reject"
                onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                disabled={working}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="apr-actions">
        <button
          id={`confirm-${booking.id}`}
          className="btn-confirm"
          onClick={handleConfirm}
          disabled={working || showRejectForm}
        >
          {working && !showRejectForm ? 'Confirming…' : '✓ Confirm Payment'}
        </button>
        {!showRejectForm && (
          <button
            id={`reject-open-${booking.id}`}
            className="btn-reject"
            onClick={() => setShowRejectForm(true)}
            disabled={working}
          >
            ✗ Reject
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminPaymentReview() {
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [globalMsg, setGlobalMsg] = useState(null); // { type: 'success'|'error', text }

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const data = await getAdminPendingPayments();
      setBookings(data.bookings || []);
    } catch (err) {
      setFetchError(
        err.response?.status === 403
          ? 'Access denied — admin privileges required.'
          : err.response?.data?.error || 'Failed to load pending payments.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-clear global message after 4 s
  useEffect(() => {
    if (!globalMsg) return;
    const t = setTimeout(() => setGlobalMsg(null), 4000);
    return () => clearTimeout(t);
  }, [globalMsg]);

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <style>{ADMIN_CSS}</style>
      <div className="apr-page">

        <div className="apr-header">
          <h1>💳 Payment Review</h1>
          <p>UPI payment screenshots awaiting verification — {bookings.length} pending</p>
        </div>

        {globalMsg && (
          <div className={`apr-alert apr-alert-${globalMsg.type}`}>
            {globalMsg.text}
          </div>
        )}

        {fetchError && (
          <div className="apr-alert apr-alert-error">{fetchError}</div>
        )}

        {loading ? (
          <div className="apr-empty">Loading pending payments…</div>
        ) : bookings.length === 0 && !fetchError ? (
          <div className="apr-empty">
            <p style={{ fontSize: 24, margin: '0 0 8px' }}>🎉</p>
            <p>No payments pending review. All caught up!</p>
          </div>
        ) : (
          <div className="apr-grid">
            {bookings.map(b => (
              <ReviewCard
                key={b.id}
                booking={b}
                onRefresh={load}
                setGlobalMsg={setGlobalMsg}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
