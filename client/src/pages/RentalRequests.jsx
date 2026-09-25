// client/src/pages/RentalRequests.jsx — Apple×Duolingo redesign
// Matches the design system of MyRentals.jsx exactly.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays,
  MapPin,
  Banknote,
  PackageCheck,
  AlertTriangle,
  Package,
} from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import api from '../services/api'
import { getMyRentalBookings } from '../services/rentalBookingService'
import { calculateRentalDays } from '../utils/helpers'

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS — mirrors MyRentals PAGE_CSS
// ─────────────────────────────────────────────────────────────
const PAGE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

:root {
  --rr-dark:      #0f3d2e;
  --rr-green:     #1b4d3e;
  --rr-mid:       #2f6b52;
  --rr-lime:      #c6e930;
  --rr-cream:     #f8f7f2;
  --rr-paper:     #ffffff;
  --rr-ink:       #10241c;
  --rr-muted:     #7a8c84;
  --rr-line:      rgba(15,61,46,0.09);
  --rr-radius:    20px;
  --rr-shadow-sm: 0 2px 8px rgba(15,61,46,0.06);
  --rr-shadow-md: 0 8px 24px rgba(15,61,46,0.10);
}

.rr-page {
  max-width: 880px;
  width: 100%;
  margin: 0 auto;
  background: var(--rr-cream);
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  color: var(--rr-ink);
  -webkit-font-smoothing: antialiased;
}

/* ── Top bar ── */
.rr-top-bar { padding: 24px 20px 0; }
@media (min-width: 768px) { .rr-top-bar { padding: 32px 36px 0; } }

.rr-back {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 18px; border-radius: 999px;
  border: 1px solid rgba(15,61,46,0.15); background: #fff;
  color: var(--rr-dark); cursor: pointer; transition: all 0.15s;
  text-decoration: none; font-size: 13px; font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.rr-back:hover { background: #f0f4f1; border-color: rgba(15,61,46,0.25); }

/* ── Title card ── */
.rr-title-card {
  background: var(--rr-paper); margin: 16px 20px 0;
  border-radius: 24px; padding: 28px 24px 24px;
  border: 1px solid rgba(15,61,46,0.08);
  box-shadow: 0 4px 20px rgba(15,61,46,0.05);
  display: flex; align-items: flex-start;
  justify-content: space-between; flex-wrap: wrap; gap: 16px;
}
@media (min-width: 768px) { .rr-title-card { margin: 18px 36px 0; padding: 32px 36px 28px; } }

.rr-title-card h1 {
  font-family: 'Fraunces', serif; font-size: 28px; font-weight: 700;
  margin: 0; color: var(--rr-dark); letter-spacing: -0.02em; line-height: 1.15;
}
@media (min-width: 768px) { .rr-title-card h1 { font-size: 34px; } }

.rr-pending-pill {
  display: inline-flex; align-items: center; gap: 6px;
  background: #fef3c7; color: #b45309; border-radius: 999px;
  padding: 5px 13px; font-size: 12px; font-weight: 700; letter-spacing: 0.01em;
}

/* ── Tabs ── */
.rr-tabs-wrap { margin: 0 20px; }
@media (min-width: 768px) { .rr-tabs-wrap { margin: 0 36px; } }

.rr-tabs {
  display: flex; gap: 4px;
  border-bottom: 1px solid var(--rr-line); margin-top: 8px; padding: 0;
}
.rr-tab {
  background: none; border: none; cursor: pointer; padding: 14px 8px 12px;
  margin-right: 20px; font-size: 14px; font-weight: 600; transition: color 0.15s;
  color: var(--rr-muted); border-bottom: 2px solid transparent; margin-bottom: -1px;
  font-family: 'Inter', sans-serif;
}
.rr-tab.active { color: var(--rr-dark); border-bottom-color: var(--rr-dark); }
.rr-tab-count {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 999px;
  background: var(--rr-dark); color: #fff; font-size: 10px; font-weight: 700; margin-left: 6px;
}

/* ── Content area ── */
.rr-body { padding: 16px 20px 60px; }
@media (min-width: 768px) { .rr-body { padding: 20px 36px 60px; } }

.rr-stack { display: flex; flex-direction: column; gap: 14px; }

/* ── Status badge ── */
.rr-status-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 700;
  flex-shrink: 0;
}

/* ── Card ── */
.rr-card {
  background: var(--rr-paper); border-radius: var(--rr-radius);
  border: 1px solid var(--rr-line); box-shadow: var(--rr-shadow-sm);
  overflow: hidden; transition: box-shadow 0.2s, transform 0.15s;
}
.rr-card:hover { box-shadow: var(--rr-shadow-md); transform: translateY(-1px); }

.rr-card-inner { display: flex; gap: 16px; padding: 18px; }
@media (max-width: 479px) { .rr-card-inner { flex-direction: column; } }

.rr-thumb {
  width: 88px; height: 88px; object-fit: cover;
  border-radius: 14px; flex-shrink: 0;
}
@media (max-width: 479px) { .rr-thumb { width: 100%; height: 160px; border-radius: 10px; } }

.rr-card-body { flex: 1; min-width: 0; }

.rr-card-head {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;
}
.rr-item-name {
  font-family: 'Fraunces', serif; font-size: 16px; font-weight: 600;
  color: var(--rr-ink); margin: 0; line-height: 1.25;
}

.rr-sub { font-size: 13px; color: var(--rr-muted); margin: 0 0 10px; }
.rr-sub strong { color: var(--rr-ink); font-weight: 600; }

/* ── Breakdown box ── */
.rr-breakdown {
  background: var(--rr-cream); border: 1px solid var(--rr-line);
  border-radius: 12px; padding: 12px 14px; margin-bottom: 12px;
}
.rr-breakdown-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 13px; color: var(--rr-muted); margin-bottom: 5px;
}
.rr-breakdown-row:last-child { margin-bottom: 0; }
.rr-breakdown-row .val { font-weight: 600; color: var(--rr-ink); }
.rr-breakdown-total {
  border-top: 1px solid var(--rr-line); padding-top: 8px; margin-top: 6px;
  display: flex; justify-content: space-between; align-items: center;
}
.rr-breakdown-total .label { font-size: 13.5px; font-weight: 700; color: var(--rr-ink); }
.rr-breakdown-total .amount {
  font-family: 'IBM Plex Mono', monospace; font-size: 15px; font-weight: 600; color: var(--rr-mid);
}

/* ── Action row ── */
.rr-actions { display: flex; gap: 10px; flex-wrap: wrap; }

.rr-btn-accept {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--rr-dark); color: #fff; border: none;
  padding: 9px 20px; border-radius: 10px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif;
}
.rr-btn-accept:hover:not(:disabled) { background: var(--rr-mid); transform: translateY(-1px); }
.rr-btn-accept:active { transform: scale(0.97); }
.rr-btn-accept:disabled { opacity: 0.6; cursor: wait; }

.rr-btn-decline {
  display: inline-flex; align-items: center; gap: 6px;
  background: #fff; color: #b91c1c; border: 1.5px solid #fca5a5;
  padding: 9px 20px; border-radius: 10px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif;
}
.rr-btn-decline:hover:not(:disabled) { background: #fef2f2; }
.rr-btn-decline:disabled { opacity: 0.6; cursor: wait; }

.rr-btn-withdraw {
  display: inline-flex; align-items: center; gap: 6px;
  background: #fff; color: var(--rr-muted); border: 1px solid var(--rr-line);
  padding: 8px 16px; border-radius: 10px; font-size: 12.5px; font-weight: 600;
  cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif;
}
.rr-btn-withdraw:hover:not(:disabled) { border-color: rgba(15,61,46,0.25); color: var(--rr-dark); }
.rr-btn-withdraw:disabled { opacity: 0.6; cursor: wait; }

/* ── Empty state ── */
.rr-empty {
  text-align: center; padding: 56px 24px;
  background: var(--rr-paper); border-radius: var(--rr-radius);
  border: 1.5px dashed var(--rr-line);
}
.rr-empty-icon { opacity: 0.25; margin-bottom: 14px; }
.rr-empty p { font-size: 14.5px; color: var(--rr-muted); margin: 0; }

/* ── Loading / error ── */
.rr-loading { padding: 40px 0; text-align: center; color: var(--rr-muted); font-size: 14px; }
.rr-error { padding: 16px; background: #fef2f2; border-radius: 10px; color: #991b1b; font-size: 13.5px; }

/* ── Meta chip row ── */
.rr-meta-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.rr-chip {
  display: inline-flex; align-items: center; gap: 5px;
  background: rgba(15,61,46,0.05); border-radius: 8px;
  padding: 4px 10px; font-size: 12px; color: var(--rr-mid); font-weight: 500;
}

/* ── Responded note ── */
.rr-responded-note { font-size: 12px; color: var(--rr-muted); margin: 0; font-style: italic; }
`

const STATUS_CFG = {
  pending:   { bg: '#fef3c7', color: '#b45309', label: 'Pending' },
  accepted:  { bg: '#dbeafe', color: '#1d4ed8', label: 'Accepted — Pay Now' },
  pending_verification: { bg: '#fef3c7', color: '#92400e', label: 'Payment Pending' },
  paid:      { bg: '#d1fae5', color: '#065f46', label: 'Awaiting Pickup' },
  declined:  { bg: '#fee2e2', color: '#b91c1c', label: 'Declined' },
  cancelled: { bg: '#f3f4f6', color: '#6b7280', label: 'Withdrawn' },
  active:    { bg: '#d1fae5', color: '#065f46', label: 'Active' },
  completed: { bg: '#f0fdf4', color: '#15803d', label: 'Completed' },
  disputed:  { bg: '#fee2e2', color: '#b91c1c', label: 'Disputed' },
  return_pending: { bg: '#fef3c7', color: '#b45309', label: 'Return Pending' },
}

function resolveDisplayStatus(booking) {
  if (booking.status === 'accepted') {
    if (booking.payment_status === 'paid' || booking.payment_status === 'verified') return 'paid'
    if (booking.payment_status === 'pending_verification') return 'pending_verification'
  }
  return booking.status
}

function StatusBadge({ booking }) {
  const key = resolveDisplayStatus(booking)
  const cfg = STATUS_CFG[key] || { bg: '#f1f5f9', color: '#475569', label: key }
  return (
    <span className="rr-status-badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function listingImage(booking) {
  return Array.isArray(booking.item_image_urls) && booking.item_image_urls.length
    ? booking.item_image_urls[0]
    : 'https://placehold.co/88x88/f8f7f2/7a8c84?text=📦'
}

// ── Incoming card (owner view) ─────────────────────────────────────────────
function IncomingCard({ req, onRespond, busyId }) {
  const days = calculateRentalDays(req.start_datetime, req.end_datetime)
  const fee = Number(req.agreed_total_amount || 0)
  const deposit = Number(req.deposit_amount || 0)
  const total = Math.round((fee + deposit) * 100) / 100
  const isPending = req.status === 'pending'

  return (
    <div className="rr-card">
      <div className="rr-card-inner">
        <img src={listingImage(req)} alt={req.item_name} className="rr-thumb" />
        <div className="rr-card-body">
          <div className="rr-card-head">
            <h3 className="rr-item-name">{req.item_name}</h3>
            <StatusBadge booking={req} />
          </div>

          <p className="rr-sub">
            Requested by <strong>{req.borrower_name || req.borrower_username}</strong>
          </p>

          <div className="rr-meta-chips">
            <span className="rr-chip"><CalendarDays size={12} /> {formatDate(req.start_datetime)} → {formatDate(req.end_datetime)}</span>
            <span className="rr-chip"><Clock size={12} /> {days} day{days === 1 ? '' : 's'}</span>
            {req.meeting_location && (
              <span className="rr-chip"><MapPin size={12} /> {req.meeting_location}</span>
            )}
          </div>

          <div className="rr-breakdown">
            <div className="rr-breakdown-row">
              <span><Banknote size={12} style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />₹{Number(req.rate_amount || 0)}/day × {days}</span>
              <span className="val">₹{fee}</span>
            </div>
            <div className="rr-breakdown-row">
              <span>Refundable deposit (15%)</span>
              <span className="val">₹{deposit}</span>
            </div>
            <div className="rr-breakdown-total">
              <span className="label">Total</span>
              <span className="amount">₹{total}</span>
            </div>
          </div>

          {isPending ? (
            <div className="rr-actions">
              <button
                type="button"
                className="rr-btn-accept"
                onClick={() => onRespond(req, 'open_accept_modal')}
                disabled={busyId === req.id}
              >
                <CheckCircle2 size={15} />
                Accept
              </button>
              <button
                type="button"
                className="rr-btn-decline"
                onClick={() => onRespond(req, 'declined')}
                disabled={busyId === req.id}
              >
                <XCircle size={15} />
                Decline
              </button>
            </div>
          ) : (
            <p className="rr-responded-note">Responded — no further action needed.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sent request card (renter view) ────────────────────────────────────────
function SentCard({ req, onWithdraw, busyId }) {
  const days = calculateRentalDays(req.start_datetime, req.end_datetime)
  const fee = Number(req.agreed_total_amount || 0)
  const deposit = Number(req.deposit_amount || 0)
  const total = Math.round((fee + deposit) * 100) / 100

  return (
    <div className="rr-card">
      <div className="rr-card-inner">
        <img src={listingImage(req)} alt={req.item_name} className="rr-thumb" />
        <div className="rr-card-body">
          <div className="rr-card-head">
            <h3 className="rr-item-name">{req.item_name}</h3>
            <StatusBadge booking={req} />
          </div>

          <p className="rr-sub">
            Owner: <strong>{req.owner_name || req.owner_username}</strong>
          </p>

          <div className="rr-meta-chips">
            <span className="rr-chip"><CalendarDays size={12} /> {formatDate(req.start_datetime)} → {formatDate(req.end_datetime)}</span>
            <span className="rr-chip"><Clock size={12} /> {days} day{days === 1 ? '' : 's'}</span>
            {req.meeting_location && (
              <span className="rr-chip"><MapPin size={12} /> {req.meeting_location}</span>
            )}
          </div>

          <div className="rr-breakdown">
            <div className="rr-breakdown-row">
              <span><Banknote size={12} style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />₹{Number(req.rate_amount || 0)}/day × {days}</span>
              <span className="val">₹{fee}</span>
            </div>
            <div className="rr-breakdown-row">
              <span>Deposit (15%)</span>
              <span className="val">₹{deposit}</span>
            </div>
            <div className="rr-breakdown-total">
              <span className="label">Total</span>
              <span className="amount">₹{total}</span>
            </div>
          </div>

          {req.status === 'pending' && (
            <div className="rr-actions">
              <button
                type="button"
                className="rr-btn-withdraw"
                onClick={() => onWithdraw(req.id)}
                disabled={busyId === req.id}
              >
                <Clock size={14} />
                {busyId === req.id ? 'Withdrawing…' : 'Withdraw Request'}
              </button>
            </div>
          )}

          {req.status === 'accepted' && resolveDisplayStatus(req) === 'paid' && (
            <div className="rr-chip" style={{ display: 'inline-flex', background: '#d1fae5', color: '#065f46' }}>
              <PackageCheck size={13} /> Payment confirmed — coordinate pickup in chat
            </div>
          )}

          {resolveDisplayStatus(req) === 'pending_verification' && (
            <div className="rr-chip" style={{ display: 'inline-flex', background: '#fef3c7', color: '#92400e' }}>
              <AlertTriangle size={13} /> Payment submitted — awaiting admin verification
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function RentalRequests() {
  const { currentUser } = useAuth()
  const [tab, setTab] = useState('incoming')
  const [incoming, setIncoming] = useState([])
  const [sent, setSent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [acceptingBooking, setAcceptingBooking] = useState(null)

  async function load() {
    try {
      const response = await getMyRentalBookings()
      const bookings = response.bookings || []
      setIncoming(bookings.filter((b) => b.owner_id === currentUser?.id))
      setSent(bookings.filter((b) => b.borrower_id === currentUser?.id))
    } catch {
      setError('Unable to load rental requests right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentUser?.id) load()
  }, [currentUser?.id])

  async function handleRespond(reqOrId, action, payload = {}) {
    if (action === 'open_accept_modal') {
      setAcceptingBooking(reqOrId)
      return
    }

    const requestId = typeof reqOrId === 'object' ? reqOrId.id : reqOrId
    setBusyId(requestId)
    try {
      if (action === 'accepted') {
        await api.patch(`/rental-bookings/${requestId}/status`, {
          status: 'accepted',
          upi_id: payload.upi_id,
          account_holder_name: payload.account_holder_name,
        })
        setAcceptingBooking(null)
      } else {
        await api.patch(`/rental-bookings/${requestId}/status`, { status: action })
      }
      await load()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to respond to request.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleWithdraw(requestId) {
    setBusyId(requestId)
    try {
      await api.patch(`/rental-bookings/${requestId}/status`, { status: 'cancelled' })
      await load()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to withdraw request.')
    } finally {
      setBusyId(null)
    }
  }

  const list = tab === 'incoming' ? incoming : sent
  const pendingCount = incoming.filter((r) => r.status === 'pending').length

  return (
    <div className="rr-page">
      <style>{PAGE_CSS}</style>

      <div className="rr-top-bar">
        <Link to="/explore" className="rr-back">
          <ArrowLeft size={15} /> Back to Explore
        </Link>
      </div>

      <div className="rr-title-card">
        <div>
          <h1>Rental Requests</h1>
          {pendingCount > 0 && (
            <div className="rr-pending-pill" style={{ marginTop: 8 }}>
              <AlertTriangle size={12} /> {pendingCount} awaiting your response
            </div>
          )}
        </div>
      </div>

      <div className="rr-tabs-wrap">
        <div className="rr-tabs">
          {[
            { key: 'incoming', label: 'Incoming', count: incoming.length },
            { key: 'sent',     label: 'My Requests', count: sent.length },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              className={`rr-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.count > 0 && <span className="rr-tab-count">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="rr-body">
        {loading ? (
          <div className="rr-loading">Loading requests…</div>
        ) : error ? (
          <div className="rr-error">{error}</div>
        ) : list.length === 0 ? (
          <div className="rr-empty">
            <div className="rr-empty-icon">
              <Package size={48} />
            </div>
            <p>
              {tab === 'incoming'
                ? 'No rental requests on your items yet.'
                : "You haven't requested to rent anything yet."}
            </p>
          </div>
        ) : (
          <div className="rr-stack">
            {list.map((r) =>
              tab === 'incoming' ? (
                <IncomingCard key={r.id} req={r} onRespond={handleRespond} busyId={busyId} />
              ) : (
                <SentCard key={r.id} req={r} onWithdraw={handleWithdraw} busyId={busyId} />
              )
            )}
          </div>
        )}
      </div>

      {acceptingBooking && (
        <AcceptRentalModal
          booking={acceptingBooking}
          onClose={() => setAcceptingBooking(null)}
          onConfirm={(id, data) => handleRespond(id, 'accepted', data)}
          busy={busyId === acceptingBooking.id}
        />
      )}
    </div>
  )
}

function AcceptRentalModal({ booking, onClose, onConfirm, busy }) {
  const [upiId, setUpiId] = useState('')
  const [accountName, setAccountName] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!upiId.trim() || !upiId.includes('@') || upiId.trim().length < 3) {
      setError('Please enter a valid UPI ID (e.g., username@bank).')
      return
    }
    setError('')
    onConfirm(booking.id, {
      upi_id: upiId.trim(),
      account_holder_name: accountName.trim(),
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,61,46,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1400, padding: 20,
    }}>
      <div style={{
        background: '#ffffff', borderRadius: 20, padding: 28,
        maxWidth: 480, width: '100%',
        boxShadow: '0 20px 50px rgba(15,61,46,0.2)',
      }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: '#0f3d2e' }}>
          Accept Rental Request
        </h2>
        <p style={{ fontSize: 13.5, color: '#5d7067', margin: '0 0 16px', lineHeight: 1.5 }}>
          Provide your payment contact. Platform admin will use this UPI ID to disburse your rental payout once the renter completes payment into escrow.
        </p>

        {error && (
          <div style={{
            background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b',
            padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f3d2e', marginBottom: 6 }}>
              Payout UPI ID <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. yourname@oksbi or 9876543210@paytm"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: '1px solid rgba(15,61,46,0.18)', fontSize: 13.5, background: '#f8f7f2',
              }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f3d2e', marginBottom: 6 }}>
              Account Holder Name (Optional)
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. John Doe"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: '1px solid rgba(15,61,46,0.18)', fontSize: 13.5, background: '#f8f7f2',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="rr-btn-withdraw"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rr-btn-accept"
              disabled={busy}
            >
              {busy ? 'Accepting…' : '✓ Confirm & Accept'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}