// client/src/pages/MyRentals.jsx — rentals where I'm the renter AND items I own that are out.
// Split by ROLE (like MyTrades splits Active/History): "Renting" vs "My Items Out".
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PackageCheck,
} from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { getMyRentals, confirmRentalReturn } from '../services/rentalService'

const STATUS_STYLES = {
  accepted: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Active' },
  returned: { bg: '#DCFCE7', color: '#15803D', label: 'Completed' },
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function RentalCard({ rental, role, onConfirm, confirmingId }) {
  const style = STATUS_STYLES[rental.status] || { bg: '#F1F5F9', color: '#475569', label: rental.status }
  const overdue = rental.is_overdue

  // Which side still needs to confirm? Visible only to the side that hasn't.
  const iAmRenter = role === 'renting'
  const myConfirmed = iAmRenter ? rental.renter_confirmed_return : rental.owner_confirmed_return
  const theirConfirmed = iAmRenter ? rental.owner_confirmed_return : rental.renter_confirmed_return
  const canConfirm = rental.status === 'accepted' && !myConfirmed

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
        src={rental.image_url || 'https://via.placeholder.com/120'}
        alt={rental.title}
        style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h3 style={{ fontSize: 15.5, fontWeight: 700, color: '#1C1917', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {rental.title}
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

        <p style={{ fontSize: 13, color: '#57534E', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
          {overdue ? <AlertTriangle size={13} color="#DC2626" /> : <Clock size={13} />}
          {overdue
            ? <>Was due <strong>{formatDate(rental.end_date)}</strong> — return not yet confirmed</>
            : <>Due <strong>{formatDate(rental.end_date)}</strong>{rental.days_remaining >= 0 && ` (${rental.days_remaining} day${rental.days_remaining === 1 ? '' : 's'} left)`}</>}
        </p>

        <p style={{ fontSize: 12.5, color: '#78716C', margin: '4px 0 0' }}>
          Fee ₹{Number(rental.total_amount)} · Deposit ₹{Number(rental.deposit_amount)}
        </p>

        {/* Double-confirm return — same visual language as trade completion */}
        {rental.status === 'accepted' && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {canConfirm ? (
              <button
                type="button"
                onClick={() => onConfirm(rental.id)}
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
            {theirConfirmed && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#15803D' }}>
                <CheckCircle2 size={14} /> {iAmRenter ? 'Owner' : 'Renter'} confirmed
              </span>
            )}
            {!theirConfirmed && (
              <span style={{ fontSize: 12, color: '#A8A29E' }}>
                Deposit releases once both sides confirm.
              </span>
            )}
          </div>
        )}

        {rental.status === 'returned' && (
          <p style={{ marginTop: 10, marginBottom: 0, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#15803D', fontWeight: 600 }}>
            <CheckCircle2 size={14} /> Return confirmed by both parties — deposit released
          </p>
        )}
      </div>
    </div>
  )
}

export default function MyRentals() {
  const { currentUser } = useAuth()
  const [tab, setTab] = useState('renting')
  const [data, setData] = useState({ renting: [], owned: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmingId, setConfirmingId] = useState(null)

  async function load() {
    try {
      const res = await getMyRentals()
      setData({ renting: res.renting || [], owned: res.owned || [] })
    } catch {
      setError('Unable to load your rentals right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleConfirm(requestId) {
    setConfirmingId(requestId)
    try {
      await confirmRentalReturn(requestId)
      await load()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to confirm return.')
    } finally {
      setConfirmingId(null)
    }
  }

  const list = tab === 'renting' ? data.renting : data.owned
  const pendingIncoming = data.owned.filter(r => r.status === 'accepted').length

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
            <RentalCard key={r.id} rental={r} role={tab} onConfirm={handleConfirm} confirmingId={confirmingId} />
          ))}
        </div>
      )}
    </div>
  )
}