import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../features/auth/AuthContext';
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

.apr-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.apr-tab {
  border: 1px solid var(--line);
  background: rgba(255,255,255,0.7);
  color: var(--ink);
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.apr-tab.active {
  background: var(--dark);
  color: #fff;
  border-color: var(--dark);
  box-shadow: 0 8px 18px rgba(15,61,46,0.18);
}

.apr-provider-list {
  display: grid;
  gap: 18px;
}

.apr-provider-card {
  background: var(--paper);
  border: 1.5px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 3px 12px rgba(15,61,46,0.05);
}

.apr-provider-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--line);
  background: rgba(15,61,46,0.02);
}

.apr-provider-card-header h3 {
  margin: 0;
  font-size: 18px;
  font-family: 'Fraunces', serif;
  color: var(--dark);
}

.apr-provider-status {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
}

.apr-provider-status.submitted,
.apr-provider-status.under_review {
  background: var(--amber);
  color: var(--amber-ink);
  border-color: var(--amber-border);
}

.apr-provider-status.changes_requested {
  background: #fff7ed;
  color: #9a5b06;
  border-color: #fdba74;
}

.apr-provider-status.rejected {
  background: var(--danger-bg);
  color: var(--danger);
  border-color: #fca5a5;
}

.apr-provider-status.approved {
  background: #d1fae5;
  color: #065f46;
  border-color: #6ee7b7;
}

.apr-provider-card-body {
  display: grid;
  gap: 12px;
  padding: 18px 20px 20px;
}

.apr-provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.apr-provider-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.apr-provider-field small {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.apr-provider-field span {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.apr-provider-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

.apr-review-button {
  border: none;
  background: var(--dark);
  color: #fff;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}

.apr-review-panel {
  background: var(--paper);
  border: 1.5px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 3px 12px rgba(15,61,46,0.05);
}

.apr-review-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--line);
  background: rgba(15,61,46,0.02);
}

.apr-review-panel-header h3 {
  margin: 0;
  font-size: 20px;
  font-family: 'Fraunces', serif;
  color: var(--dark);
}

.apr-review-panel-body {
  display: grid;
  gap: 18px;
  padding: 20px;
}

.apr-review-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

.apr-review-media {
  display: grid;
  gap: 10px;
}

.apr-review-media video,
.apr-review-media img {
  width: 100%;
  max-height: 260px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: #eef3ef;
}

.apr-review-section {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px;
  background: rgba(15,61,46,0.02);
}

.apr-review-section h4 {
  margin: 0 0 8px;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.apr-review-section p,
.apr-review-section li {
  margin: 0;
  color: var(--ink);
  line-height: 1.6;
  font-size: 14px;
}

.apr-review-section ul {
  margin: 0;
  padding-left: 18px;
}

.apr-review-reason {
  width: 100%;
  min-height: 110px;
  border: 1.5px solid var(--line);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  resize: vertical;
  box-sizing: border-box;
  outline: none;
}

.apr-review-reason:focus {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(31,77,62,0.08);
}

.apr-review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.apr-action-btn {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.apr-action-btn.primary {
  background: var(--dark);
  border-color: var(--dark);
  color: #fff;
}

.apr-action-btn.warning {
  background: #fff7ed;
  border-color: #fdba74;
  color: #9a5b06;
}

.apr-action-btn.danger {
  background: var(--danger-bg);
  border-color: #fca5a5;
  color: var(--danger);
}

.apr-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  const { token } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [globalMsg, setGlobalMsg] = useState(null); // { type: 'success'|'error', text }
  const [activeTab, setActiveTab] = useState('skill-applications');
  const [providerApplications, setProviderApplications] = useState([]);
  const [providerLoading, setProviderLoading] = useState(false);
  const [providerError, setProviderError] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedApplicationLoading, setSelectedApplicationLoading] = useState(false);
  const [reviewReason, setReviewReason] = useState('');
  const [reviewAction, setReviewAction] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [videoDeleting, setVideoDeleting] = useState(false);

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

  const loadSkillProviderApplications = useCallback(async () => {
    if (!token) return;
    setProviderLoading(true);
    setProviderError('');
    try {
      const response = await api.get('/skill-provider-applications/admin/list', {
        params: { limit: 50, offset: 0 },
      });

      setProviderApplications(response.data.applications || []);
    } catch (err) {
      setProviderError(err.response?.data?.error || err.message || 'Failed to load skill provider applications');
    } finally {
      setProviderLoading(false);
    }
  }, [token]);

  const handleDeleteDemoVideo = useCallback(async () => {
    if (!token || !selectedApplication) return;
    if (!window.confirm("Are you sure you want to delete this demo video? This cannot be undone.")) return;

    setVideoDeleting(true);
    setProviderError('');
    try {
      const response = await fetch(`/api/skill-provider-applications/${selectedApplication.id}/demo-video`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete video');
      }

      setGlobalMsg({ type: 'success', text: 'Demo video deleted successfully.' });
      setSelectedApplication(prev => prev ? { ...prev, demo_video_url: null, demo_video_path: null } : null);
      await loadSkillProviderApplications();
    } catch (err) {
      setProviderError(err.message || 'Failed to delete video');
    } finally {
      setVideoDeleting(false);
    }
  }, [selectedApplication, token, loadSkillProviderApplications]);

  const openSkillProviderApplication = useCallback(async (applicationId) => {
    if (!token || !applicationId) return;
    navigate(`/admin/skill-applications/${applicationId}`);
  }, [navigate, token]);

  const submitSkillProviderDecision = useCallback(async (action) => {
    if (!token || !selectedApplication) return;

    if ((action === 'request-changes' || action === 'reject') && !String(reviewReason || '').trim()) {
      setProviderError('A reason is required before requesting changes or rejecting the application.');
      return;
    }

    setReviewSubmitting(true);
    setProviderError('');
    try {
      const endpoint = action === 'approve'
        ? `/skill-provider-applications/admin/${selectedApplication.id}/approve`
        : action === 'request-changes'
          ? `/skill-provider-applications/admin/${selectedApplication.id}/request-changes`
          : `/skill-provider-applications/admin/${selectedApplication.id}/reject`;

      const response = action === 'approve'
        ? await api.post(endpoint)
        : await api.post(endpoint, { reason: reviewReason.trim() });

      setGlobalMsg({ type: 'success', text: action === 'approve' ? 'Application approved.' : action === 'request-changes' ? 'Changes requested.' : 'Application rejected.' });
      setReviewReason('');
      setReviewAction(null);
      setSelectedApplication(null);
      await loadSkillProviderApplications();
    } catch (err) {
      setProviderError(err.response?.data?.error || err.message || 'Action failed');
    } finally {
      setReviewSubmitting(false);
    }
  }, [loadSkillProviderApplications, reviewReason, selectedApplication, token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (activeTab === 'skill-applications') {
      loadSkillProviderApplications();
    }
  }, [activeTab, loadSkillProviderApplications]);

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
          <h1>Skilter Admin</h1>
          <p>
            {activeTab === 'skill-applications'
              ? `Skill Provider applications awaiting review — ${providerApplications.length}`
              : `UPI payment screenshots awaiting verification — ${bookings.length} pending`}
          </p>
        </div>

        <div className="apr-tabs" aria-label="Skilter admin tabs">
          <button
            type="button"
            className={`apr-tab ${activeTab === 'skill-applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('skill-applications')}
          >
            Skill Provider Applications
          </button>
          <button
            type="button"
            className={`apr-tab ${activeTab === 'payment-review' ? 'active' : ''}`}
            onClick={() => setActiveTab('payment-review')}
          >
            Payment Review
          </button>
        </div>

        {globalMsg && (
          <div className={`apr-alert apr-alert-${globalMsg.type}`}>
            {globalMsg.text}
          </div>
        )}

        {activeTab === 'skill-applications' ? (
          <>
            {providerError && (
              <div className="apr-alert apr-alert-error">{providerError}</div>
            )}

            {providerLoading ? (
              <div className="apr-empty">Loading skill provider applications…</div>
            ) : providerApplications.length === 0 ? (
              <div className="apr-empty">
                <p style={{ fontSize: 24, margin: '0 0 8px' }}>📋</p>
                <p>No pending or under-review applications.</p>
              </div>
            ) : (
              <div className="apr-provider-list">
                {providerApplications.map((application) => (
                  <div key={application.id} className="apr-provider-card">
                    <div className="apr-provider-card-header">
                      <h3>{application.skill_name}</h3>
                      <span className={`apr-provider-status ${application.status}`}>
                        {application.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="apr-provider-card-body">
                      <div className="apr-provider-grid">
                        <div className="apr-provider-field">
                          <small>Applicant</small>
                          <span>{application.applicant_name || 'N/A'}</span>
                        </div>
                        <div className="apr-provider-field">
                          <small>Category</small>
                          <span>{application.category || '—'}</span>
                        </div>
                        <div className="apr-provider-field">
                          <small>Experience</small>
                          <span>{application.experience_level || '—'}</span>
                        </div>
                        <div className="apr-provider-field">
                          <small>Submitted</small>
                          <span>
                            {application.submitted_at
                              ? new Date(application.submitted_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '—'}
                          </span>
                        </div>
                      </div>

                      <div className="apr-provider-actions">
                        <button
                          type="button"
                          className="apr-review-button"
                          onClick={() => openSkillProviderApplication(application.id)}
                        >
                          View / Review
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedApplication && (
              <div className="apr-review-panel" style={{ marginTop: 24 }}>
                <div className="apr-review-panel-header">
                  <h3>{selectedApplication.skill_name}</h3>
                  <span className={`apr-provider-status ${selectedApplication.status}`}>
                    {selectedApplication.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="apr-review-panel-body">
                  {selectedApplicationLoading ? (
                    <div className="apr-empty">Loading application details…</div>
                  ) : (
                    <>
                      <div className="apr-review-grid">
                        <div className="apr-review-section">
                          <h4>Applicant</h4>
                          <p>{selectedApplication.full_name || selectedApplication.applicant_name || 'N/A'}</p>
                        </div>
                        <div className="apr-review-section">
                          <h4>Category</h4>
                          <p>{selectedApplication.category || '—'}</p>
                        </div>
                        <div className="apr-review-section">
                          <h4>Experience</h4>
                          <p>{selectedApplication.experience_level || '—'}</p>
                        </div>
                        <div className="apr-review-section">
                          <h4>Submitted</h4>
                          <p>
                            {selectedApplication.submitted_at
                              ? new Date(selectedApplication.submitted_at).toLocaleString()
                              : '—'}
                          </p>
                        </div>
                      </div>

                      <div className="apr-review-section">
                        <h4>About</h4>
                        <p>{selectedApplication.about_you || 'No description provided.'}</p>
                      </div>

                      <div className="apr-review-section">
                        <h4>Skill description</h4>
                        <p>{selectedApplication.skill_description || 'No skill description provided.'}</p>
                      </div>

                      <div className="apr-review-grid">
                        <div className="apr-review-section">
                          <h4>Teaching mode</h4>
                          <p>{selectedApplication.teaching_mode || '—'}</p>
                        </div>
                        <div className="apr-review-section">
                          <h4>Teaching language</h4>
                          <p>{selectedApplication.teaching_language || '—'}</p>
                        </div>
                        <div className="apr-review-section">
                          <h4>Session duration</h4>
                          <p>{selectedApplication.session_duration || '—'}</p>
                        </div>
                        <div className="apr-review-section">
                          <h4>Availability</h4>
                          <p>{selectedApplication.availability || '—'}</p>
                        </div>
                      </div>

                      {selectedApplication.demo_video_url && (
                        <div className="apr-review-media">
                          <h4 style={{ margin: 0, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>Demo video</h4>
                          <video controls src={selectedApplication.demo_video_url} style={{ display: 'block', marginBottom: 8 }} />
                          {['approved', 'rejected', 'changes_requested'].includes(selectedApplication.status) && (
                            <button
                              type="button"
                              className="apr-action-btn danger"
                              style={{ maxWidth: 180, padding: '6px 12px', fontSize: 12 }}
                              onClick={handleDeleteDemoVideo}
                              disabled={videoDeleting}
                            >
                              {videoDeleting ? 'Deleting...' : 'Delete Demo Video'}
                            </button>
                          )}
                        </div>
                      )}

                      {selectedApplication.certificates && selectedApplication.certificates.length > 0 && (
                        <div className="apr-review-section">
                          <h4>Certificates</h4>
                          <ul>
                            {selectedApplication.certificates.map((certificate, index) => (
                              <li key={`${certificate.path || index}`}>
                                <a href={certificate.signedUrl || '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--green)', fontWeight: 600 }}>
                                  Certificate {index + 1}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="apr-review-section">
                        <h4>Decision reason</h4>
                        <textarea
                          className="apr-review-reason"
                          placeholder="Add a reason for changes or rejection…"
                          value={reviewReason}
                          onChange={(e) => setReviewReason(e.target.value)}
                          disabled={reviewSubmitting}
                        />
                      </div>

                      <div className="apr-review-actions">
                        <button
                          type="button"
                          className="apr-action-btn primary"
                          onClick={() => { setReviewAction('approve'); submitSkillProviderDecision('approve'); }}
                          disabled={reviewSubmitting}
                        >
                          {reviewSubmitting && reviewAction === 'approve' ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="apr-action-btn warning"
                          onClick={() => { setReviewAction('request-changes'); submitSkillProviderDecision('request-changes'); }}
                          disabled={reviewSubmitting}
                        >
                          {reviewSubmitting && reviewAction === 'request-changes' ? 'Requesting Changes…' : 'Request Changes'}
                        </button>
                        <button
                          type="button"
                          className="apr-action-btn danger"
                          onClick={() => { setReviewAction('reject'); submitSkillProviderDecision('reject'); }}
                          disabled={reviewSubmitting}
                        >
                          {reviewSubmitting && reviewAction === 'reject' ? 'Rejecting…' : 'Reject'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
