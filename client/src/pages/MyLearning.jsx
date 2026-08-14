import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAuth } from '../features/auth/AuthContext';
import { getMySkillBookings, updateSkillBookingStatus, submitUpiPayment } from '../services/skillBookingService';
import Footer from '../components/Footer';

const BARTER_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

:root {
  --dark: #0f3d2e;
  --green: #1b4d3e;
  --light-green: #2f6b52;
  --lime: #c6e930;
  --cream: #f7f5ee;
  --paper: #ffffff;
  --ink: #10241c;
  --muted: #647167;
  --line: rgba(15,61,46,0.12);
  --peach: #fbe8dd;
  --peach-ink: #8a4a2a;
  --sky: #e3eefc;
  --sky-ink: #2a5285;
  --amber: #fef3c7;
  --amber-ink: #92400e;
  --amber-border: #f59e0b;
}

@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}

.skeleton {
  background: linear-gradient(90deg, var(--line) 25%, rgba(15,61,46,0.06) 50%, var(--line) 75%);
  background-size: 600px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 8px;
}

.mylearning-container {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  background: var(--cream);
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  color: var(--ink);
}

.hero {
  background: linear-gradient(135deg, var(--dark) 0%, var(--green) 42%, var(--light-green) 78%, #4f8a67 100%);
  padding: 40px 24px 80px;
  position: relative;
  overflow: hidden;
}

.hero-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1.5px solid rgba(255,255,255,0.28);
  background: rgba(255,255,255,0.14);
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background 0.18s;
  text-decoration: none;
}

.hero-back:hover { background: rgba(255,255,255,0.26); }

.title-card {
  background: var(--paper);
  margin: -40px 16px 0;
  border-radius: 22px;
  padding: 24px 22px;
  position: relative;
  z-index: 2;
  box-shadow: 0 12px 30px rgba(15,61,46,0.10);
}

@media (min-width: 768px) {
  .title-card { margin: -44px 32px 0; padding: 28px 32px; border-radius: 26px; }
}

.title-card h1 {
  font-family: 'Fraunces', serif;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--dark);
}

.segment {
  display: flex;
  margin: 28px 16px 4px;
  background: rgba(15,61,46,0.06);
  border-radius: 12px;
  padding: 4px;
}

@media (min-width: 768px) { .segment { margin: 32px 32px 4px; } }

.segment button {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 0;
  font-family: 'Inter';
  font-weight: 600;
  font-size: 13.5px;
  color: var(--muted);
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.segment button.on { background: var(--dark); color: #fff; }

.section-label {
  margin: 20px 16px 10px;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--muted);
  text-transform: uppercase;
  font-weight: 600;
}

@media (min-width: 768px) { .section-label { margin: 24px 32px 12px; } }

.cards-grid {
  padding: 0 16px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: start;
}

@media (min-width: 768px) {
  .cards-grid { padding: 0 32px; grid-template-columns: repeat(2, 1fr); gap: 20px; }
}

@media (min-width: 1400px) {
  .cards-grid { grid-template-columns: repeat(3, 1fr); }
}

.ticket-card {
  background: var(--paper);
  border-radius: 20px;
  border: 1px solid var(--line);
  box-shadow: 0 2px 8px rgba(15,61,46,0.04);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ticket-header {
  padding: 16px 20px;
  background: rgba(15,61,46,0.02);
  border-bottom: 1.5px dashed var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ticket-header::before,
.ticket-header::after {
  content: '';
  position: absolute;
  bottom: -7px;
  width: 14px;
  height: 14px;
  background: var(--cream);
  border-radius: 50%;
  border: 1px solid var(--line);
  z-index: 2;
}

.ticket-header::before { left: -8px; }
.ticket-header::after  { right: -8px; }

.ticket-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex-grow: 1;
}

.ticket-actions {
  margin-top: auto;
  padding: 16px 20px;
  border-top: 1px solid var(--line);
  background: rgba(15,61,46,0.01);
  display: flex;
  gap: 10px;
}

.badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.badge-pending            { background: #fef3c7; color: #92400e; }
.badge-accepted           { background: #d1fae5; color: #065f46; }
.badge-declined           { background: #fee2e2; color: #991b1b; }
.badge-completed          { background: #e0f2fe; color: #075985; }
.badge-cancelled          { background: #f3f4f6; color: #4b5563; }
/* Amber — deliberately NOT green, NOT success-looking */
.badge-pending-verification {
  background: #fef3c7;
  color: #78350f;
  border: 1.5px solid #f59e0b;
}

.btn-primary {
  background: var(--dark);
  color: #fff;
  border: none;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-secondary {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--line);
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-secondary:hover { background: rgba(15,61,46,0.03); color: var(--dark); }
.btn-secondary:disabled { opacity: 0.55; cursor: not-allowed; }

@keyframes chatPulse {
  0%   { box-shadow: 0 0 0 0 rgba(198,233,48,0.55); }
  60%  { box-shadow: 0 0 0 8px rgba(198,233,48,0); }
  100% { box-shadow: 0 0 0 0 rgba(198,233,48,0); }
}

.btn-open-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 11px 20px;
  background: var(--lime);
  color: var(--dark);
  border: none;
  border-radius: 12px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  letter-spacing: 0.01em;
  animation: chatPulse 2.8s ease-out infinite;
  transition: opacity 0.18s, transform 0.15s;
}
.btn-open-chat:hover {
  opacity: 0.92;
  transform: translateY(-1px);
  animation: none;
  box-shadow: 0 4px 16px rgba(198,233,48,0.45);
}

/* Payment upload form */
.pay-panel {
  background: var(--cream);
  border: 1.5px solid var(--line);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pay-panel-title {
  font-weight: 700;
  font-size: 13.5px;
  color: var(--dark);
  margin: 0;
}

.pay-qr-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  border: 1px solid var(--line);
}

.pay-qr-wrap canvas {
  border-radius: 6px;
}

.pay-instructions {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.55;
  margin: 0;
}

.pay-input-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.pay-input {
  width: 100%;
  padding: 9px 12px;
  border: 1.5px solid var(--line);
  border-radius: 9px;
  font-size: 13px;
  font-family: 'IBM Plex Mono', monospace;
  background: #fff;
  color: var(--ink);
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.18s;
}
.pay-input:focus { border-color: var(--light-green); }

.pay-file-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.pay-file-drop {
  border: 2px dashed var(--line);
  border-radius: 10px;
  padding: 14px;
  text-align: center;
  cursor: pointer;
  background: #fff;
  transition: border-color 0.18s;
  position: relative;
}
.pay-file-drop:hover { border-color: var(--light-green); }
.pay-file-drop input[type="file"] {
  position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
}

.pay-file-preview {
  max-width: 100%;
  max-height: 120px;
  border-radius: 8px;
  object-fit: contain;
  display: block;
  margin: 8px auto 0;
}

.pay-error {
  font-size: 12px;
  color: #991b1b;
  background: #fee2e2;
  padding: 8px 12px;
  border-radius: 8px;
  margin: 0;
}

/* Pending verification notice */
.pending-notice {
  background: var(--amber);
  border: 1.5px solid var(--amber-border);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pending-notice-title {
  font-weight: 700;
  font-size: 13px;
  color: #78350f;
  margin: 0;
}
.pending-notice-body {
  font-size: 12px;
  color: var(--amber-ink);
  margin: 0;
  line-height: 1.5;
}
.pending-utr {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  color: #78350f;
  background: rgba(245,158,11,0.15);
  padding: 4px 8px;
  border-radius: 6px;
  display: inline-block;
  word-break: break-all;
}
`;

// ── QR canvas component ───────────────────────────────────────────────────────
function UpiQrCode({ upiId, upiName, amount, bookingId }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !upiId) return;
    const tn  = `Booking-${bookingId.slice(0, 8)}`;
    const uri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName || '')}&am=${amount || ''}&tn=${encodeURIComponent(tn)}`;

    QRCode.toCanvas(canvasRef.current, uri, {
      width: 180,
      margin: 1,
      color: { dark: '#0f3d2e', light: '#ffffff' },
    }).catch(err => console.error('QR generation error:', err));
  }, [upiId, upiName, amount, bookingId]);

  if (!upiId) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, padding: 12 }}>
        UPI ID not configured — contact support.
      </div>
    );
  }

  return <canvas ref={canvasRef} style={{ borderRadius: 6 }} />;
}

// ── Payment upload panel ──────────────────────────────────────────────────────
function PaymentUploadPanel({ booking, onSuccess }) {
  const [utr, setUtr]             = useState('');
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');

  const UPI_ID   = import.meta.env.VITE_UPI_ID   || '';
  const UPI_NAME = import.meta.env.VITE_UPI_NAME || '';

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!file) { setError('Please attach your payment screenshot.'); return; }
    if (utr.trim().length < 6) { setError('UTR / transaction reference must be at least 6 characters.'); return; }

    setSubmitting(true);
    try {
      await submitUpiPayment(booking.id, file, utr.trim());
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pay-panel">
      <p className="pay-panel-title">💸 Pay via UPI</p>

      <div className="pay-qr-wrap">
        <UpiQrCode
          upiId={UPI_ID}
          upiName={UPI_NAME}
          amount={''}
          bookingId={booking.id}
        />
      </div>

      <p className="pay-instructions">
        Scan the QR code with any UPI app (GPay, PhonePe, Paytm, etc.).
        After paying, enter the UTR / transaction reference shown in your
        bank app and upload a screenshot of the success screen.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label className="pay-input-label">
          UTR / Transaction Reference
          <input
            id={`utr-${booking.id}`}
            className="pay-input"
            type="text"
            placeholder="e.g. 426123456789"
            value={utr}
            onChange={e => { setUtr(e.target.value); setError(''); }}
            disabled={submitting}
            autoComplete="off"
          />
        </label>

        <label className="pay-file-label">
          Payment Screenshot
          <div className="pay-file-drop">
            <input
              id={`screenshot-${booking.id}`}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              disabled={submitting}
            />
            {!preview ? (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                📎 Click to attach JPG/PNG (max 5 MB)
              </span>
            ) : (
              <img src={preview} alt="Preview" className="pay-file-preview" />
            )}
          </div>
        </label>

        {error && <p className="pay-error">{error}</p>}

        <button
          id={`submit-payment-${booking.id}`}
          type="submit"
          className="btn-primary"
          disabled={submitting}
          style={{ width: '100%', padding: '10px 0' }}
        >
          {submitting ? 'Submitting…' : '📤 Submit Payment'}
        </button>
      </form>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MyLearning() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [activeTab, setActiveTab]     = useState('active');
  const [actionLoading, setActionLoading] = useState({});
  // Track which booking's pay panel is open
  const [openPayPanel, setOpenPayPanel] = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMySkillBookings();
      const mySent = (data.bookings || []).filter(b => b.requester_id === currentUser?.id);
      setBookings(mySent);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { setLoading(false); return; }
    fetchBookings();
  }, [authLoading, currentUser, fetchBookings]);

  const handleCancel = async (bookingId) => {
    setActionLoading(prev => ({ ...prev, [bookingId]: true }));
    try {
      await updateSkillBookingStatus(bookingId, 'cancelled');
      await fetchBookings();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel booking.');
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const activeBookings = bookings.filter(
    b => b.status === 'pending' || b.status === 'accepted'
  );
  const pastBookings = bookings.filter(
    b => b.status === 'completed' || b.status === 'declined' || b.status === 'cancelled'
  );

  if (authLoading || loading) {
    return (
      <div style={{ background: '#f7f5ee', minHeight: '100vh', width: '100%', padding: 40, textAlign: 'center' }}>
        <style>{BARTER_CSS}</style>
        <p>Loading your learning sessions…</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh', width: '100%' }}>
      <div className="mylearning-container">
        <style>{BARTER_CSS}</style>

        <div className="hero">
          <button type="button" className="hero-back" onClick={() => navigate(-1)} aria-label="Go back">←</button>
        </div>

        <div className="title-card">
          <h1>My Learning</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>
            Sessions you have requested or booked to learn from others.
          </p>
        </div>

        <div className="segment">
          <button
            type="button"
            className={activeTab === 'active' ? 'on' : ''}
            onClick={() => setActiveTab('active')}
          >
            Active ({activeBookings.length})
          </button>
          <button
            type="button"
            className={activeTab === 'history' ? 'on' : ''}
            onClick={() => setActiveTab('history')}
          >
            History ({pastBookings.length})
          </button>
        </div>

        <div className="section-label">
          {activeTab === 'active' ? 'Active Sessions' : 'Past Sessions'}
        </div>

        <div className="cards-grid">
          {(activeTab === 'active' ? activeBookings : pastBookings).length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', background: '#fff', borderRadius: 20, border: '1px dashed var(--line)' }}>
              <p style={{ color: 'var(--muted)', margin: '0 0 16px' }}>No sessions found here.</p>
              {activeTab === 'active' && (
                <Link
                  to="/skilter/explore"
                  style={{ padding: '10px 20px', background: 'var(--dark)', color: 'var(--lime)', textDecoration: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14 }}
                >
                  Browse Skills
                </Link>
              )}
            </div>
          ) : (
            (activeTab === 'active' ? activeBookings : pastBookings).map(b => {
              const skillImg = Array.isArray(b.skill_image_urls) && b.skill_image_urls[0]
                ? b.skill_image_urls[0]
                : 'https://via.placeholder.com/56x56?text=Skill';

              const isUnpaid              = b.payment_status === 'unpaid';
              const isPendingVerification = b.payment_status === 'pending_verification';
              const isConfirmed           = b.payment_status === 'paid' && b.status === 'accepted';

              // Badge config
              let badgeClass = `badge-${b.status}`;
              let badgeLabel = b.status;
              if (isUnpaid && b.status === 'pending') {
                badgeClass = 'badge-pending';
                badgeLabel = 'Reserved (unpaid)';
              } else if (isPendingVerification) {
                badgeClass = 'badge-pending-verification';
                badgeLabel = '⏳ Pending Verification';
              } else if (isConfirmed) {
                badgeClass = 'badge-accepted';
                badgeLabel = 'Confirmed';
              }

              const payPanelOpen = openPayPanel === b.id;

              return (
                <div key={b.id} className="ticket-card">
                  <div className="ticket-header">
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--dark)' }}>
                      Session with @{b.teacher_username}
                    </span>
                    <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
                  </div>

                  <div className="ticket-body">
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <img
                        src={skillImg}
                        alt={b.skill_name}
                        style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--line)' }}
                        onError={e => { e.currentTarget.src = 'https://via.placeholder.com/56x56?text=Skill'; }}
                      />
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 6px', fontFamily: "'Fraunces', serif", fontSize: 18, color: 'var(--dark)' }}>
                          {b.skill_name}
                        </h3>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {b.skill_category && (
                            <span style={{ fontSize: 11, background: 'rgba(15,61,46,0.06)', padding: '2px 8px', borderRadius: 4, fontWeight: 600, color: 'var(--light-green)' }}>
                              {b.skill_category}
                            </span>
                          )}
                          {b.spots_left !== undefined && b.max_participants && (
                            <span style={{ fontSize: 11, background: 'var(--peach)', padding: '2px 8px', borderRadius: 4, fontWeight: 600, color: 'var(--peach-ink)' }}>
                              Spots Left: {b.spots_left > 0 ? `${b.spots_left} / ${b.max_participants}` : `0 / ${b.max_participants}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {b.scheduled_time && (
                        <span>📅 <strong>Scheduled:</strong> {new Date(b.scheduled_time).toLocaleString()}</span>
                      )}
                      <span>🕒 <strong>Requested:</strong> {new Date(b.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* ── Pending Verification notice ─────────────────────── */}
                    {isPendingVerification && (
                      <div className="pending-notice">
                        <p className="pending-notice-title">⏳ Awaiting Admin Review</p>
                        {b.payment_utr && (
                          <p className="pending-notice-body">
                            Submitted UTR: <span className="pending-utr">{b.payment_utr}</span>
                          </p>
                        )}
                        {b.payment_submitted_at && (
                          <p className="pending-notice-body">
                            Submitted: {new Date(b.payment_submitted_at).toLocaleString()}
                          </p>
                        )}
                        <p className="pending-notice-body">
                          Your screenshot is under review. We'll notify you once it's verified.
                        </p>
                      </div>
                    )}

                    {/* ── Rejection notice (re-submission allowed) ─────────── */}
                    {isUnpaid && b.payment_rejection_reason && (
                      <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '10px 14px' }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: '#991b1b' }}>
                          ⚠️ Previous submission was not verified
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7f1d1d' }}>
                          {b.payment_rejection_reason}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#991b1b' }}>
                          You can submit a new screenshot below.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ── Actions ──────────────────────────────────────────────── */}
                  {activeTab === 'active' && (
                    <div className="ticket-actions" style={{ flexDirection: 'column', gap: 8 }}>

                      {/* Confirmed: show chat */}
                      {isConfirmed && (
                        <>
                          <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--light-green)', fontWeight: 500, lineHeight: 1.5 }}>
                            Your session is confirmed — coordinate the details in chat.
                          </p>
                          <Link to={`/skilter/chat/${b.id}`} className="btn-open-chat">
                            💬 Open Chat
                          </Link>
                        </>
                      )}

                      {/* Unpaid: show pay button / upload panel + cancel + message */}
                      {isUnpaid && b.status === 'pending' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                          {/* Toggle pay panel */}
                          <button
                            id={`pay-toggle-${b.id}`}
                            className="btn-primary"
                            style={{ width: '100%', padding: '10px 0' }}
                            onClick={() => setOpenPayPanel(payPanelOpen ? null : b.id)}
                          >
                            {payPanelOpen ? '▲ Hide Payment' : '💳 Pay Now'}
                          </button>

                          {payPanelOpen && (
                            <PaymentUploadPanel
                              booking={b}
                              onSuccess={() => {
                                setOpenPayPanel(null);
                                fetchBookings();
                              }}
                            />
                          )}

                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn-secondary"
                              style={{ flex: 1 }}
                              onClick={() => handleCancel(b.id)}
                              disabled={actionLoading[b.id]}
                            >
                              {actionLoading[b.id] ? '…' : 'Cancel Request'}
                            </button>
                            <Link
                              to={`/skilter/chat/${b.id}`}
                              className="btn-secondary"
                              style={{ flex: 1, textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                            >
                              💬 Message
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* Pending verification: message only, no cancel, no pay */}
                      {isPendingVerification && (
                        <Link
                          to={`/skilter/chat/${b.id}`}
                          className="btn-secondary"
                          style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 0' }}
                        >
                          💬 Message
                        </Link>
                      )}

                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={{ height: 32 }} />
      </div>
      <Footer />
    </div>
  );
}
