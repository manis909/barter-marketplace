// client/src/pages/MyRentals.jsx — rentals where I'm the renter AND items I own that are out.
// Split by ROLE (like MyTrades splits Active/History): "Renting" vs "My Items Out".
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PackageCheck,
} from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import api from '../services/api'
import { getMyRentalBookings } from '../services/rentalBookingService'
import PaymentUploadPanelRental from '../components/PaymentUploadPanelRental'

const STATUS_STYLES = {
  pending: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  accepted: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Payment Required' },
  active: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Active' },
  return_pending: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Return Pending' },
  completed: { bg: '#DCFCE7', color: '#15803D', label: 'Completed' },
  declined: { bg: '#FEE2E2', color: '#B91C1C', label: 'Declined' },
  cancelled: { bg: '#F3F4F6', color: '#6B7280', label: 'Cancelled' },
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function RentalCard({ rental, role, showPayPanelId, onTogglePayPanel, onConfirmPickup, onConfirmReturn, confirmingId, navigate, onPaymentSuccess }) {
  const style = STATUS_STYLES[rental.status] || { bg: '#F1F5F9', color: '#475569', label: rental.status }
  const overdue = rental.is_overdue

  // Which side still needs to confirm? Visible only to the side that hasn't.
  const iAmRenter = role === 'renting'
  
  // Pickup confirmation logic - only for 'paid' status
  const myPickupConfirmed = iAmRenter ? rental.borrower_confirmed_pickup : rental.owner_confirmed_pickup
  const theirPickupConfirmed = iAmRenter ? rental.owner_confirmed_pickup : rental.borrower_confirmed_pickup
  const canConfirmPickup = rental.status === 'accepted' && !myPickupConfirmed
  
  // Return confirmation logic  
  const myReturnConfirmed = iAmRenter ? rental.renter_confirmed_return : rental.owner_confirmed_return
  const theirReturnConfirmed = iAmRenter ? rental.owner_confirmed_return : rental.renter_confirmed_return
  const canConfirmReturn = ['active', 'return_pending'].includes(rental.status) && !myReturnConfirmed

  const payPanelOpen = showPayPanelId === rental.id;

  return (
    <div style={{
      display: 'flex',
      gap: 16,
      background: '#FFFFFF',
      border: overdue ? '1px solid #FCA5A5' : '1px solid #E4E2D9',
      borderRadius: 14,
      padding: 16,
      boxShadow: overdue ? '0 2px 10px rgba(220,38,38,0.08)' : 'none',
    }}>
      <img
        src={rental.item_image_urls?.[0] || 'https://via.placeholder.com/120'}
        alt={rental.item_name || 'Rental item'}
        style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h3 style={{ fontSize: 15.5, fontWeight: 700, color: '#1C1917', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {rental.item_name || 'Rental item'}
          </h3>
          <span style={{
            flexShrink: 0,
            fontSize: 11.5,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 999,
            background: overdue ? '#FEE2E2' : style.bg,
            color: overdue ? '#B91C1C' : style.color,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}>
            {overdue && <AlertTriangle size={12} />}
            {overdue ? 'Overdue' : style.label}
          </span>
        </div>

        <p style={{ fontSize: 13, color: '#57534E', margin: '6px 0 0' }}>
          {iAmRenter ? 'Rented from' : 'Rented to'}:{' '}
          <strong style={{ color: '#1C1917' }}>{rental.other_party_name || rental.other_party_username}</strong>
        </p>

        <p style={{ fontSize: 13, color: '#57534E', margin: '4px 0 0' }}>
          <strong>Start:</strong> {formatDate(rental.start_datetime)} · <strong>End:</strong> {formatDate(rental.end_datetime)}
        </p>

        {rental.meeting_location && (
          <p style={{ fontSize: 12.5, color: '#78716C', margin: '4px 0 0' }}>
            📍 {rental.meeting_location}
          </p>
        )}

        <p style={{ fontSize: 12.5, color: '#78716C', margin: '4px 0 0' }}>
          Fee ₹{Number(rental.agreed_total_amount)} · Deposit ₹{Number(rental.deposit_amount)}
        </p>

        {/* Payment button - shows when status is 'accepted' (renter needs to pay) */}
        {rental.status === 'accepted' && iAmRenter && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onTogglePayPanel(rental.id)}
                disabled={confirmingId === rental.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#0F766E', color: '#fff', border: 'none',
                  padding: '8px 16px', borderRadius: 8, fontSize: 13,
                  fontWeight: 600, cursor: confirmingId === rental.id ? 'wait' : 'pointer',
                }}
              >
                <CheckCircle2 size={15} />
                {payPanelOpen ? '▲ Hide Payment' : '💳 Pay Now'}
              </button>
              <span style={{ fontSize: 12, color: '#A8A29E' }}>
                Total: ₹{Number(rental.total_amount) + Number(rental.deposit_amount)}
              </span>
            </div>

            {/* Payment panel */}
            {payPanelOpen && (
              <PaymentUploadPanelRental
                request={rental}
                onSuccess={onPaymentSuccess}
              />
            )}
          </div>
        )}

        {/* Pickup confirmation - shows when status is 'paid' (awaiting pickup) */}
        {rental.status === 'accepted' && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {canConfirmPickup ? (
              <button
                type="button"
                onClick={() => onConfirmPickup(rental.id)}
                disabled={confirmingId === rental.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#0F766E', color: '#fff', border: 'none',
                  padding: '8px 16px', borderRadius: 8, fontSize: 13,
                  fontWeight: 600, cursor: confirmingId === rental.id ? 'wait' : 'pointer',
                }}
              >
                <PackageCheck size={15} />
                {confirmingId === rental.id ? 'Confirming…' : 'Confirm Pickup'}
              </button>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#15803D', fontWeight: 600 }}>
                <CheckCircle2 size={14} /> You confirmed pickup
              </span>
            )}
            {theirPickupConfirmed && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#15803D' }}>
                <CheckCircle2 size={14} /> {iAmRenter ? 'Owner' : 'Renter'} confirmed
              </span>
            )}
            {!theirPickupConfirmed && (
              <span style={{ fontSize: 12, color: '#A8A29E' }}>
                Coordinate exact pickup details in chat. Both sides must confirm pickup to start rental.
              </span>
            )}
          </div>
        )}

        {/* Return confirmation - shows when status is 'rented' (active rental) */}
        {['active', 'return_pending'].includes(rental.status) && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {canConfirmReturn ? (
              <button
                type="button"
                onClick={() => onConfirmReturn(rental.id)}
                disabled={confirmingId === rental.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#0F766E', color: '#fff', border: 'none',
                  padding: '8px 16px', borderRadius: 8, fontSize: 13,
                  fontWeight: 600, cursor: confirmingId === rental.id ? 'wait' : 'pointer',
                }}
              >
                <PackageCheck size={15} />
                {confirmingId === rental.id ? 'Confirming…' : 'Confirm Return'}
              </button>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#15803D', fontWeight: 600 }}>
                <CheckCircle2 size={14} /> You confirmed return
              </span>
            )}
            {theirReturnConfirmed && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#15803D' }}>
                <CheckCircle2 size={14} /> {iAmRenter ? 'Owner' : 'Renter'} confirmed
              </span>
            )}
            {!theirReturnConfirmed && (
              <span style={{ fontSize: 12, color: '#A8A29E' }}>
                Deposit releases once both sides confirm return.
              </span>
            )}
          </div>
        )}

        {rental.status === 'completed' && (
          <p style={{ marginTop: 10, marginBottom: 0, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#15803D', fontWeight: 600 }}>
            <CheckCircle2 size={14} /> Return confirmed by both parties — deposit released
          </p>
        )}

        {/* Chat button - shows when status is 'paid' or later */}
        {(['pending', 'accepted', 'active', 'return_pending', 'completed'].includes(rental.status)) && (
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              onClick={() => navigate(`/rental/chat/${rental.id}`)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'transparent', color: '#0F766E', border: '1px solid #0F766E',
                padding: '6px 12px', borderRadius: 6, fontSize: 12.5,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              💬 Open Chat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MyRentals() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('renting')
  const [data, setData] = useState({ renting: [], owned: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmingId, setConfirmingId] = useState(null)
  const [showPayPanelId, setShowPayPanelId] = useState(null)

  async function load() {
    try {
      const res = await getMyRentalBookings()
      const bookings = res.bookings || []
      setData({
        renting: bookings.filter((booking) => booking.borrower_id === currentUser?.id),
        owned: bookings.filter((booking) => booking.owner_id === currentUser?.id),
      })
    } catch {
      setError('Unable to load your rentals right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentUser?.id) load()
  }, [currentUser?.id])

  function handleTogglePayPanel(requestId) {
    setShowPayPanelId(showPayPanelId === requestId ? null : requestId)
  }

  function handlePaymentSuccess() {
    setShowPayPanelId(null)
    load() // Refresh the data to show updated status
  }

  async function handleConfirmPickup(requestId) {
    setConfirmingId(requestId)
    try {
      await api.post(`/rental-bookings/${requestId}/confirm-pickup`)
      await load()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to confirm pickup.')
    } finally {
      setConfirmingId(null)
    }
  }

  async function handleConfirmReturn(requestId) {
    setConfirmingId(requestId)
    try {
      await api.post(`/rental-bookings/${requestId}/confirm-return`)
      await load()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to confirm return.')
    } finally {
      setConfirmingId(null)
    }
  }

  const list = tab === 'renting' ? data.renting : data.owned
  const pendingIncoming = data.owned.filter(r => r.status === 'pending').length

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 20px 60px' }}>
      <Link to="/explore" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#57534E', textDecoration: 'none', marginBottom: 18 }}>
        <ArrowLeft size={16} /> Back to Explore
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1C1917', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
          <KeyRound size={24} color="#0F766E" /> My Rentals
        </h1>
        <Link
          to="/renter/requests"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#F9F8F6', border: '1px solid #E4E2D9', borderRadius: 8,
            padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#1C1917',
            textDecoration: 'none',
          }}
        >
          Incoming requests{pendingIncoming > 0 && ` (${pendingIncoming})`}
        </Link>
      </div>

      {/* Role tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, borderBottom: '1px solid #E4E2D9' }}>
        {[
          { key: 'renting', label: `Renting (${data.renting.length})` },
          { key: 'owned', label: `My Items Out (${data.owned.length})` },
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
        <p style={{ color: '#57534E', fontSize: 14 }}>Loading your rentals…</p>
      ) : error ? (
        <p style={{ color: '#DC2626', fontSize: 14 }}>{error}</p>
      ) : list.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 20px', background: '#F9F8F6',
          borderRadius: 14, border: '1px dashed #E4E2D9',
        }}>
          <KeyRound size={32} color="#A8A29E" />
          <p style={{ fontSize: 14.5, color: '#57534E', margin: '12px 0 0' }}>
            {tab === 'renting'
              ? "You're not renting anything yet. Browse Explore and look for items marked “Request to Rent”."
              : 'None of your items are currently rented out.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {list.map(r => (
            <RentalCard 
              key={r.id} 
              rental={r} 
              role={tab} 
              showPayPanelId={showPayPanelId}
              onTogglePayPanel={handleTogglePayPanel}
              onConfirmPickup={handleConfirmPickup}
              onConfirmReturn={handleConfirmReturn}
              confirmingId={confirmingId}
              navigate={navigate}
              onPaymentSuccess={handlePaymentSuccess}
            />
          ))}
        </div>
      )}
    </div>
  )
}