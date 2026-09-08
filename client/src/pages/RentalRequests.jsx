// client/src/pages/RentalRequests.jsx — owner inbox for incoming rental requests
// (Accept/Decline) + my sent requests with Withdraw, mirroring the TradeRequests flow.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import api from '../services/api'
import { getMyRentalBookings } from '../services/rentalBookingService'

const STATUS_STYLES = {
  pending: { bg: '#FEF3C7', color: '#B45309', label: 'Pending' },
  accepted: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Accepted — Payment Required' },
  paid: { bg: '#DCFCE7', color: '#15803D', label: 'Paid — Awaiting Pickup' },
  declined: { bg: '#FEE2E2', color: '#B91C1C', label: 'Declined' },
  cancelled: { bg: '#F1F5F9', color: '#64748B', label: 'Withdrawn' },
  returned: { bg: '#DCFCE7', color: '#15803D', label: 'Completed' },
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysBetween(start, end) {
  if (!start || !end) return null
  return Math.round((new Date(end) - new Date(start)) / 86400000)
}

function listingImage(booking) {
  return Array.isArray(booking.item_image_urls) && booking.item_image_urls.length
    ? booking.item_image_urls[0]
    : 'https://via.placeholder.com/120'
}

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || { bg: '#F1F5F9', color: '#475569', label: status }
  return (
    <span style={{
      flexShrink: 0, fontSize: 11.5, fontWeight: 700,
      padding: '3px 10px', borderRadius: 999, background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

function IncomingRequestCard({ req, onRespond, busyId }) {
  const days = daysBetween(req.start_datetime, req.end_datetime)
  const fee = Number(req.agreed_total_amount)
  const deposit = Number(req.deposit_amount)

  return (
    <div style={{
      display: 'flex', gap: 16, background: '#FFFFFF',
      border: '1px solid #E4E2D9', borderRadius: 14, padding: 16,
    }}>
      <img
        src={listingImage(req)}
        alt={req.item_name}
        style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h3 style={{ fontSize: 15.5, fontWeight: 700, color: '#1C1917', margin: 0 }}>
            {req.item_name}
          </h3>
          <StatusPill status={req.status} />
        </div>

        <p style={{ fontSize: 13, color: '#57534E', margin: '6px 0 0' }}>
          Requested by <strong style={{ color: '#1C1917' }}>{req.borrower_name || req.borrower_username}</strong>
        </p>

        <div style={{
          background: '#F9F8F6', border: '1px solid #E4E2D9', borderRadius: 10,
          padding: '10px 12px', margin: '10px 0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#57534E', marginBottom: 4 }}>
            <span>Duration</span>
            <span style={{ fontWeight: 600, color: '#1C1917' }}>{days} day{days === 1 ? '' : 's'} ({formatDate(req.start_datetime)} → {formatDate(req.end_datetime)})</span>
          </div>
          {req.meeting_location && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#57534E', marginBottom: 4 }}>
              <span>Meeting location</span>
              <span style={{ fontWeight: 600, color: '#1C1917' }}>📍 {req.meeting_location}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#57534E', marginBottom: 4 }}>
            <span>Rental fee (₹{Number(req.rate_amount || 0)}/day × {days})</span>
            <span style={{ fontWeight: 600, color: '#1C1917' }}>₹{fee}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#57534E', marginBottom: 4 }}>
            <span>Refundable deposit (15%)</span>
            <span style={{ fontWeight: 600, color: '#1C1917' }}>₹{deposit}</span>
          </div>
          <div style={{ borderTop: '1px solid #E4E2D9', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
            <span style={{ fontWeight: 700, color: '#1C1917' }}>Total commitment</span>
            <span style={{ fontWeight: 700, color: '#0F766E' }}>₹{Math.round((fee + deposit) * 100) / 100}</span>
          </div>
        </div>

        {req.status === 'pending' ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => onRespond(req.id, 'accepted')}
              disabled={busyId === req.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#15803D', color: '#fff', border: 'none',
                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: busyId === req.id ? 'wait' : 'pointer',
              }}
            >
              <CheckCircle2 size={15} /> Accept
            </button>
            <button
              type="button"
              onClick={() => onRespond(req.id, 'declined')}
              disabled={busyId === req.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#fff', color: '#B91C1C', border: '1px solid #FCA5A5',
                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: busyId === req.id ? 'wait' : 'pointer',
              }}
            >
              <XCircle size={15} /> Decline
            </button>
          </div>
        ) : (
          <p style={{ fontSize: 12.5, color: '#A8A29E', margin: 0 }}>
            Responded — no further action needed.
          </p>
        )}
      </div>
    </div>
  )
}

function SentRequestCard({ req, onWithdraw, busyId }) {
  return (
    <div style={{
      display: 'flex', gap: 16, background: '#FFFFFF',
      border: '1px solid #E4E2D9', borderRadius: 14, padding: 16,
    }}>
    <img
      src={listingImage(req)}
      alt={req.item_name}
        style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1C1917', margin: 0 }}>{req.item_name}</h3>
          <StatusPill status={req.status} />
        </div>
        <p style={{ fontSize: 13, color: '#57534E', margin: '5px 0 0' }}>
      Owner: <strong style={{ color: '#1C1917' }}>{req.owner_name || req.owner_username}</strong>
      {' · '}{daysBetween(req.start_datetime, req.end_datetime)} day(s) · Fee ₹{Number(req.agreed_total_amount)}
        </p>
        {req.status === 'pending' && (
          <button
            type="button"
            onClick={() => onWithdraw(req.id)}
            disabled={busyId === req.id}
            style={{
              marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#fff', color: '#78716C', border: '1px solid #E4E2D9',
              padding: '7px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
              cursor: busyId === req.id ? 'wait' : 'pointer',
            }}
          >
            <Clock size={14} /> Withdraw Request
          </button>
        )}
      </div>
    </div>
  )
}

export default function RentalRequests() {
  const { currentUser } = useAuth()
  const [tab, setTab] = useState('incoming')
  const [incoming, setIncoming] = useState([])
  const [sent, setSent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    try {
      const response = await getMyRentalBookings()
      const bookings = response.bookings || []
      setIncoming(bookings.filter((booking) => booking.owner_id === currentUser?.id))
      setSent(bookings.filter((booking) => booking.borrower_id === currentUser?.id))
    } catch {
      setError('Unable to load rental requests right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentUser?.id) load()
  }, [currentUser?.id])

  async function handleRespond(requestId, status) {
    setBusyId(requestId)
    try {
      await api.patch(`/rental-bookings/${requestId}/status`, { status })
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
      await api.delete(`/rental-bookings/${requestId}/for-me`)
      await load()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to withdraw request.')
    } finally {
      setBusyId(null)
    }
  }

  const list = tab === 'incoming' ? incoming : sent
  const pendingCount = incoming.filter(r => r.status === 'pending').length

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 20px 60px' }}>
      <Link to="/explore" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#57534E', textDecoration: 'none', marginBottom: 18 }}>
        <ArrowLeft size={16} /> Back to Explore
      </Link>

      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1C1917', margin: '0 0 20px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
        <BriefcaseBusiness size={24} color="#0F766E" /> Rental Requests
        {pendingCount > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, background: '#FEF3C7', color: '#B45309', padding: '3px 10px', borderRadius: 999 }}>
            {pendingCount} awaiting your response
          </span>
        )}
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, borderBottom: '1px solid #E4E2D9' }}>
        {[
          { key: 'incoming', label: `Incoming (${incoming.length})` },
          { key: 'sent', label: `My Requests (${sent.length})` },
        ].map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 4px', marginRight: 18, fontSize: 14.5, fontWeight: 600,
              color: tab === t.key ? '#0F766E' : '#78716C',
              borderBottom: tab === t.key ? '2px solid #0F766E' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#57534E', fontSize: 14 }}>Loading requests…</p>
      ) : error ? (
        <p style={{ color: '#DC2626', fontSize: 14 }}>{error}</p>
      ) : list.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 20px', background: '#F9F8F6',
          borderRadius: 14, border: '1px dashed #E4E2D9',
        }}>
          <BriefcaseBusiness size={32} color="#A8A29E" />
          <p style={{ fontSize: 14.5, color: '#57534E', margin: '12px 0 0' }}>
            {tab === 'incoming'
              ? 'No rental requests on your items yet.'
              : "You haven't requested to rent anything yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {list.map(r =>
            tab === 'incoming'
              ? <IncomingRequestCard key={r.id} req={r} onRespond={handleRespond} busyId={busyId} />
              : <SentRequestCard key={r.id} req={r} onWithdraw={handleWithdraw} busyId={busyId} />
          )}
        </div>
      )}
    </div>
  )
}