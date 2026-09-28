// client/src/pages/RentalBookingDetail.jsx
// Pilot shadcn + Tailwind rebuild
// Aesthetic: Apple structure & restraint + Duolingo tactile delight & motion
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Banknote,
  MessageCircle,
  CreditCard,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Package,
  User,
  ChevronLeft,
  ChevronRight,
  Shield,
  KeyRound,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import api from '../services/api'
import { getDaysUntilDate } from '../utils/helpers'
import PaymentUploadPanelRental from '../components/PaymentUploadPanelRental'
import RentalTimeline from '../components/RentalTimeline'

// shadcn UI components
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../components/ui/card.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Button } from '../components/ui/button.jsx'
import { Separator } from '../components/ui/separator.jsx'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar.jsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog.jsx'

// ── Helpers ──────────────────────────────────────────────────────────────
function getRentalUrgency(booking) {
  if (!booking || !booking.end_datetime) return null
  if (!['active', 'return_pending', 'accepted'].includes(booking.status)) return null

  const now = new Date()
  const end = new Date(booking.end_datetime)
  if (isNaN(end.getTime())) return null

  const diffMs = end.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays)
    return {
      type: 'overdue',
      label: overdueDays === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueDays} days`,
      isOverdue: true,
    }
  }
  if (diffDays === 0) {
    return { type: 'due_today', label: 'Due today', isOverdue: false }
  }
  if (diffDays === 1) {
    return { type: 'due_soon', label: 'Due tomorrow', isOverdue: false }
  }
  if (diffDays <= 3) {
    return { type: 'due_soon', label: `${diffDays} days left`, isOverdue: false }
  }
  return { type: 'normal', label: `${diffDays} days left`, isOverdue: false }
}

function fmtDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(d) {
  if (!d) return null
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Status config ────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:        { bg: '#FEF3C7', color: '#92400E', label: 'Pending Approval',    icon: 'clock' },
  accepted:       { bg: '#DBEAFE', color: '#1D4ED8', label: 'Payment Required',    icon: 'credit' },
  active:         { bg: '#D1FAE5', color: '#065F46', label: 'Active Rental',       icon: 'pulse' },
  return_pending: { bg: '#FEF3C7', color: '#B45309', label: 'Return Pending',      icon: 'clock' },
  completed:      { bg: '#F1F5F9', color: '#0F3D2E', label: 'Rental Completed',    icon: 'check' },
  declined:       { bg: '#FEE2E2', color: '#B91C1C', label: 'Request Declined',    icon: 'alert' },
  cancelled:      { bg: '#F3F4F6', color: '#6B7280', label: 'Cancelled',           icon: null },
  disputed:       { bg: '#FEE2E2', color: '#B91C1C', label: 'Dispute In Progress', icon: 'alert' },
}

// ── Timeline Builder ─────────────────────────────────────────────────────
function buildTimeline(booking) {
  if (!booking) return []
  const st = booking.status
  const isDone = (s) => ['completed'].includes(s)
  const isLate = (s) => ['disputed'].includes(s)

  const steps = []

  // 1. Requested
  steps.push({
    id: 'requested',
    name: 'Request Sent',
    desc: 'Rental request submitted to owner',
    state: 'done',
    ts: fmtDateTime(booking.created_at),
  })

  // 2. Decision
  if (st === 'declined') {
    steps.push({ id: 'decision', name: 'Declined', desc: 'Owner declined this request', state: 'alert', ts: fmtDateTime(booking.updated_at) })
  } else if (st === 'cancelled') {
    steps.push({ id: 'decision', name: 'Cancelled', desc: 'This booking was cancelled', state: 'alert', ts: fmtDateTime(booking.updated_at) })
  } else {
    steps.push({
      id: 'accepted',
      name: 'Accepted',
      desc: 'Owner accepted booking',
      state: isDone(st) || ['accepted', 'active', 'return_pending', 'completed'].includes(st) ? 'done' : 'pending',
      ts: st !== 'pending' ? fmtDateTime(booking.updated_at) : null,
    })

    // 3. Payment
    const payDone = booking.payment_status === 'approved' || isDone(st)
    const paySubmitted = booking.payment_submitted_at || booking.payment_status === 'submitted'
    steps.push({
      id: 'payment',
      name: payDone ? 'Payment Confirmed' : paySubmitted ? 'Payment Under Review' : 'Awaiting Payment',
      desc: payDone ? 'Rental fee + security deposit escrowed' : paySubmitted ? 'Receipt uploaded, verification pending' : 'Transfer fee + deposit to activate',
      state: payDone ? 'done' : paySubmitted ? 'active' : st === 'accepted' ? 'active' : 'pending',
      ts: payDone ? fmtDateTime(booking.payment_submitted_at) : null,
    })

    // 4. Pickup
    const bothPickup = booking.borrower_confirmed_pickup && booking.owner_confirmed_pickup
    const anyPickup  = booking.borrower_confirmed_pickup || booking.owner_confirmed_pickup
    steps.push({
      id: 'pickup',
      name: bothPickup ? 'Picked Up' : anyPickup ? 'Waiting for Counterparty' : 'Item Pickup',
      desc: bothPickup
        ? 'Both confirmed handoff — rental is active'
        : anyPickup
        ? 'One confirmation received — awaiting the other party'
        : 'Coordinate handoff; both confirm on pickup',
      state: bothPickup ? 'done' : anyPickup ? 'active' : isDone(st) ? 'done' : 'pending',
      ts: null,
    })

    // 5. Active
    steps.push({
      id: 'active',
      name: 'In Use',
      desc: 'Item currently with renter',
      state: ['active', 'return_pending', 'completed', 'disputed'].includes(st) ? 'done' : 'pending',
      ts: null,
    })

    // 6. Return
    const bothReturn = booking.borrower_confirmed_return && booking.owner_confirmed_return
    const anyReturn  = booking.borrower_confirmed_return || booking.owner_confirmed_return
    if (st !== 'pending' && st !== 'accepted') {
      steps.push({
        id: 'return',
        name: bothReturn ? 'Returned' : anyReturn ? 'Return in Progress' : 'Return Handoff',
        desc: bothReturn
          ? 'Item returned safely — deposit refunded'
          : anyReturn
          ? 'One party confirmed return — awaiting other'
          : 'Meet at handoff location to return item',
        state: bothReturn ? 'done' : anyReturn ? 'active' : isLate(st) ? 'active' : 'pending',
        ts: null,
      })
    }

    // 7. Completed / Disputed
    if (st === 'disputed') {
      steps.push({
        id: 'disputed',
        name: 'Disputed',
        desc: 'Issue flagged — admin review in progress',
        state: 'alert',
        ts: fmtDateTime(booking.updated_at),
      })
    } else {
      steps.push({
        id: 'completed',
        name: 'Completed',
        desc: 'Rental closed and deposit released',
        state: isDone(st) ? 'done' : 'pending',
        ts: isDone(st) ? fmtDateTime(booking.updated_at) : null,
      })
    }
  }

  return steps
}

// ── Animated Timeline Step ───────────────────────────────────────────────
function AnimatedTimelineStep({ step, isLast }) {
  const isDone   = step.state === 'done'
  const isActive = step.state === 'active'
  const isAlert  = step.state === 'alert'

  return (
    <div className="relative flex items-start gap-4 pb-7 last:pb-2">
      {/* Connecting line */}
      {!isLast && (
        <div
          className={`absolute left-[15px] top-[30px] bottom-0 w-[2px] transition-colors duration-500 ${
            isDone ? 'bg-[#2F6B52]' : 'bg-stone-200'
          }`}
        />
      )}

      {/* Step Icon with Duolingo-style spring & draw */}
      <div className="relative z-10 flex-shrink-0 mt-0.5">
        {isDone ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="w-8 h-8 rounded-full bg-[#0F3D2E] text-white flex items-center justify-center shadow-sm"
          >
            <svg
              className="w-4 h-4 stroke-current"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </motion.div>
        ) : isActive ? (
          <div className="relative flex items-center justify-center">
            {/* Living pulse ring */}
            <motion.div
              animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute w-8 h-8 rounded-full bg-[#C6E930]/60"
            />
            <div className="w-8 h-8 rounded-full bg-[#0F3D2E] text-[#C6E930] flex items-center justify-center shadow-md">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C6E930]" />
            </div>
          </div>
        ) : isAlert ? (
          <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
            <AlertTriangle size={15} />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 text-stone-400 flex items-center justify-center text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-stone-300" />
          </div>
        )}
      </div>

      {/* Step details */}
      <div className="flex-1 pt-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <h4
            className={`text-sm font-semibold tracking-tight ${
              isDone
                ? 'text-[#0F3D2E]'
                : isActive
                ? 'text-[#0F3D2E] font-bold'
                : isAlert
                ? 'text-red-700'
                : 'text-stone-400'
            }`}
          >
            {step.name}
          </h4>
          {step.ts && (
            <span className="text-[11px] font-mono text-stone-400">
              {step.ts}
            </span>
          )}
        </div>
        <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
          {step.desc}
        </p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────
export default function RentalBookingDetailPage() {
  const { id }          = useParams()
  const navigate        = useNavigate()
  const { currentUser } = useAuth()

  const [booking, setBooking]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [imgIndex, setImgIndex]       = useState(0)
  const [confirmingId, setConfirmingId] = useState(null)
  const [showPayPanel, setShowPayPanel] = useState(false)

  // Dispute modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [disputeType, setDisputeType]           = useState('other')
  const [disputeDesc, setDisputeDesc]           = useState('')
  const [disputeSubmitting, setDisputeSubmitting] = useState(false)
  const [disputeError, setDisputeError]         = useState('')

  async function load() {
    try {
      const res = await api.get(`/rental-bookings/${id}`)
      setBooking(res.data.booking)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load this rental.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) load()
  }, [id])

  async function handleConfirmPickup() {
    setConfirmingId('pickup')
    try {
      await api.post(`/rental-bookings/${id}/confirm-pickup`)
      await load()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to confirm pickup.')
    } finally {
      setConfirmingId(null)
    }
  }

  async function handleConfirmReturn() {
    setConfirmingId('return')
    try {
      await api.post(`/rental-bookings/${id}/confirm-return`)
      await load()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to confirm return.')
    } finally {
      setConfirmingId(null)
    }
  }

  function handlePaymentSuccess() {
    setShowPayPanel(false)
    load()
  }

  async function handleDisputeSubmit(e) {
    e.preventDefault()
    if (!disputeDesc.trim()) {
      setDisputeError('Please describe the issue.')
      return
    }
    setDisputeSubmitting(true)
    setDisputeError('')
    try {
      await api.post(`/rental-bookings/${id}/dispute`, {
        dispute_type: disputeType,
        description: disputeDesc.trim(),
      })
      setShowDisputeModal(false)
      setDisputeDesc('')
      await load()
    } catch (err) {
      setDisputeError(err.response?.data?.error || 'Failed to submit dispute.')
    } finally {
      setDisputeSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F5F0] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-3 border-[#0F3D2E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-stone-500 font-sans">
            Loading booking details…
          </p>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#F6F5F0] flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-0 bg-white/95 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 text-center rounded-3xl">
          <Package className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h2 style={{ fontFamily: "'Fraunces', serif" }} className="text-2xl font-bold text-[#0F3D2E] mb-2">
            Rental Not Found
          </h2>
          <p className="text-sm text-stone-500 mb-6 leading-relaxed">
            {error || 'We could not locate this booking. It may have been archived or removed.'}
          </p>
          <Button
            asChild
            className="w-full bg-[#0F3D2E] text-white hover:bg-[#1B4D3E] rounded-xl h-11"
          >
            <Link to="/renter/my-rentals">Return to My Rentals</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const iAmRenter = booking.borrower_id === currentUser?.id
  const listing   = booking.listing || {}
  const images    = Array.isArray(listing.image_urls) ? listing.image_urls : []

  const myPickupConfirmed = iAmRenter ? booking.borrower_confirmed_pickup : booking.owner_confirmed_pickup
  const daysUntilStart = getDaysUntilDate(booking.start_datetime)
  const isPickupDateReached = daysUntilStart <= 0
  const canConfirmPickup = booking.status === 'accepted' && !myPickupConfirmed && isPickupDateReached
  const isAwaitingPickupDate = booking.status === 'accepted' && !myPickupConfirmed && !isPickupDateReached

  const myReturnConfirmed = iAmRenter
    ? (booking.borrower_confirmed_return ?? booking.renter_confirmed_return)
    : booking.owner_confirmed_return
  const daysUntilEnd = getDaysUntilDate(booking.end_datetime)
  const isReturnDateReached = daysUntilEnd <= 0
  const canConfirmReturn = ['active', 'return_pending'].includes(booking.status) && !myReturnConfirmed && isReturnDateReached
  const isAwaitingReturnDate = ['active', 'return_pending'].includes(booking.status) && !myReturnConfirmed && !isReturnDateReached

  const canChat    = ['pending', 'accepted', 'active', 'return_pending', 'completed', 'disputed'].includes(booking.status)
  const canDispute = !['cancelled', 'declined', 'disputed'].includes(booking.status)
  const urgency    = getRentalUrgency(booking)

  const statusCfg  = STATUS_CONFIG[booking.status] || { bg: '#F1F5F9', color: '#475569', label: booking.status, icon: null }
  const timeline   = buildTimeline(booking)
  const rateUnit   = listing.rate_type === 'hourly' ? 'hr' : 'day'
  const total      = Number(booking.agreed_total_amount) + Number(booking.deposit_amount)

  const ownerLabel    = booking.owner_name    || booking.owner_username    || 'Owner'
  const borrowerLabel = booking.borrower_name || booking.borrower_username || 'Renter'

  return (
    <div className="min-h-screen bg-[#F6F5F0] text-[#10241C] py-8 pb-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between">
          <Link
            to="/renter/my-rentals"
            className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-[#0F3D2E] transition-colors py-2 px-1"
          >
            <ArrowLeft size={16} /> Back to My Rentals
          </Link>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {urgency && (
              <Badge
                variant="outline"
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  urgency.isOverdue
                    ? 'border-red-300 bg-red-50 text-red-700 animate-pulse'
                    : urgency.type === 'due_today'
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-[#0F3D2E]/20 bg-[#0F3D2E]/5 text-[#0F3D2E]'
                }`}
              >
                {urgency.isOverdue ? '⚠️ ' : '⏱ '}{urgency.label}
              </Badge>
            )}

            <span
              style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs"
            >
              {statusCfg.icon === 'pulse' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
              {statusCfg.icon === 'alert' && <AlertTriangle size={13} />}
              {statusCfg.icon === 'check' && <CheckCircle2 size={13} />}
              {statusCfg.icon === 'clock' && <Clock size={13} />}
              {statusCfg.icon === 'credit' && <CreditCard size={13} />}
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* ── Completed Celebratory Touch (Duolingo reward moment) ── */}
        {booking.status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F3D2E] via-[#1B4D3E] to-[#0F3D2E] p-5 text-white shadow-[0_12px_28px_rgba(15,61,46,0.18)]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#C6E930] text-[#0F3D2E] flex items-center justify-center flex-shrink-0 shadow-inner">
                <Sparkles size={20} />
              </div>
              <div className="flex-1">
                <h4 style={{ fontFamily: "'Fraunces', serif" }} className="text-base font-bold text-white">
                  Rental Completed Smoothly!
                </h4>
                <p className="text-xs text-stone-200 mt-0.5 leading-relaxed">
                  Both parties confirmed return. Security deposit of ₹{Number(booking.deposit_amount).toLocaleString('en-IN')} has been refunded.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Dispute In Progress Alert ── */}
        {booking.status === 'disputed' && (
          <div className="rounded-2xl border-l-4 border-red-600 bg-red-50/80 p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-900">
                  Dispute In Progress
                </h4>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  An issue was reported for this rental. Our team is actively reviewing the transaction details. Both parties will be updated once resolved.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Hero Image & Item Details Card (Apple style: airy, clean) ── */}
        <Card className="border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
          {/* Hero Carousel */}
          {images.length > 0 && (
            <div className="relative w-full h-72 sm:h-96 bg-stone-100 overflow-hidden">
              <img
                src={images[imgIndex]}
                alt={listing.item_name || 'Rental item'}
                className="w-full h-full object-cover transition-all duration-300"
              />

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setImgIndex((imgIndex - 1 + images.length) % images.length)}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm text-stone-700 flex items-center justify-center hover:bg-white shadow-sm transition-transform active:scale-95"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImgIndex((imgIndex + 1) % images.length)}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm text-stone-700 flex items-center justify-center hover:bg-white shadow-sm transition-transform active:scale-95"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/35 backdrop-blur-md">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setImgIndex(i)}
                        className={`h-1.5 rounded-full transition-all ${
                          i === imgIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
                        }`}
                        aria-label={`View image ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <CardHeader className="p-6 sm:p-8 pb-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {listing.category && (
                <Badge
                  variant="secondary"
                  className="bg-[#0F3D2E]/8 text-[#0F3D2E] hover:bg-[#0F3D2E]/12 font-semibold text-xs tracking-wide uppercase px-2.5 py-0.5"
                >
                  {listing.category}
                </Badge>
              )}
              {listing.rate_amount && (
                <span className="text-xs font-mono font-medium text-stone-500">
                  ₹{Number(listing.rate_amount).toLocaleString('en-IN')} / {rateUnit}
                </span>
              )}
            </div>

            <CardTitle
              style={{ fontFamily: "'Fraunces', serif" }}
              className="text-2xl sm:text-3xl font-bold text-[#0F3D2E] tracking-tight leading-tight"
            >
              {listing.item_name || 'Rental Item'}
            </CardTitle>

            {listing.description && (
              <CardDescription className="text-sm text-stone-600 mt-2 leading-relaxed max-w-2xl font-normal">
                {listing.description}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="px-6 sm:px-8 pb-8 pt-0">
            <Separator className="bg-stone-100 my-5" />

            {/* Counterparty Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-stone-50/80 border border-stone-100">
                <Avatar className="w-10 h-10 border border-stone-200">
                  <AvatarImage src={booking.owner_profile_image} alt={ownerLabel} />
                  <AvatarFallback className="bg-stone-200 text-[#0F3D2E] text-xs font-bold">
                    {ownerLabel.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    Owner
                  </span>
                  <span className="text-sm font-bold text-[#0F3D2E]">
                    {ownerLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-stone-50/80 border border-stone-100">
                <Avatar className="w-10 h-10 border border-stone-200">
                  <AvatarImage src={booking.borrower_profile_image} alt={borrowerLabel} />
                  <AvatarFallback className="bg-stone-200 text-[#0F3D2E] text-xs font-bold">
                    {borrowerLabel.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    Renter
                  </span>
                  <span className="text-sm font-bold text-[#0F3D2E]">
                    {borrowerLabel}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Rental Timeline Card (Duolingo-inspired delightful progression) ── */}
        <Card className="border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 sm:p-8">
          <CardHeader className="p-0 pb-6">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-[#0F3D2E]" />
              <CardTitle style={{ fontFamily: "'Fraunces', serif" }} className="text-xl font-bold text-[#0F3D2E]">
                Rental Journey
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-stone-400 font-medium">
              Live lifecycle tracker with verification milestones
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 pt-2">
            <RentalTimeline rental={booking} compact={false} />
          </CardContent>
        </Card>

        {/* ── Rental Period & Meeting Location Card ── */}
        <Card className="border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 sm:p-8">
          <CardHeader className="p-0 pb-6">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-[#0F3D2E]" />
              <CardTitle style={{ fontFamily: "'Fraunces', serif" }} className="text-xl font-bold text-[#0F3D2E]">
                Schedule & Handover
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 flex items-start gap-3.5">
                <CalendarDays className="w-5 h-5 text-[#2F6B52] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">
                    Start Date & Time
                  </span>
                  <span className="text-sm font-semibold text-[#0F3D2E]">
                    {fmtDateTime(booking.start_datetime) || '—'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 flex items-start gap-3.5">
                <CalendarDays className="w-5 h-5 text-[#2F6B52] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">
                    Return Deadline
                  </span>
                  <span className="text-sm font-semibold text-[#0F3D2E]">
                    {fmtDateTime(booking.end_datetime) || '—'}
                  </span>
                  {urgency && (
                    <span className="inline-block mt-1 text-[11px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                      {urgency.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {booking.meeting_location && (
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 flex items-start gap-3.5">
                <MapPin className="w-5 h-5 text-[#2F6B52] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">
                    Meeting Location
                  </span>
                  <span className="text-sm font-semibold text-[#0F3D2E]">
                    {booking.meeting_location}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Financial Breakdown Card ── */}
        <Card className="border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 sm:p-8">
          <CardHeader className="p-0 pb-6">
            <div className="flex items-center gap-2">
              <Banknote size={16} className="text-[#0F3D2E]" />
              <CardTitle style={{ fontFamily: "'Fraunces', serif" }} className="text-xl font-bold text-[#0F3D2E]">
                Payment Summary
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-stone-400 font-medium">
              Transparent rate breakdown & refundable escrow deposit
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Rental Fee
                </span>
                <span className="text-xl font-mono font-bold text-[#0F3D2E]">
                  ₹{Number(booking.agreed_total_amount).toLocaleString('en-IN')}
                </span>
                {listing.rate_amount && (
                  <span className="block text-[11px] text-stone-500 mt-1 font-sans">
                    Rate: ₹{Number(listing.rate_amount).toLocaleString('en-IN')}/{rateUnit}
                  </span>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Security Deposit
                </span>
                <span className="text-xl font-mono font-bold text-[#0F3D2E]">
                  ₹{Number(booking.deposit_amount).toLocaleString('en-IN')}
                </span>
                <span className="block text-[11px] text-emerald-700 mt-1 font-medium font-sans">
                  ✓ 100% Refunded on return
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F3D2E]/5 border border-[#0F3D2E]/10">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#0F3D2E]/70 mb-1">
                  Total Escrowed
                </span>
                <span className="text-xl font-mono font-bold text-[#0F3D2E]">
                  ₹{total.toLocaleString('en-IN')}
                </span>
                <span className="block text-[11px] text-stone-600 mt-1 font-sans">
                  {booking.payment_status === 'approved'
                    ? '✓ Verified & Active'
                    : booking.payment_status === 'submitted'
                    ? '⏳ Under Admin Review'
                    : 'Awaiting Payment'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Actions Card (Tactile Duolingo-style spring feedback) ── */}
        {(canConfirmPickup || isAwaitingPickupDate || canConfirmReturn || isAwaitingReturnDate || canChat || canDispute || (booking.status === 'accepted' && iAmRenter)) && (
          <Card className="border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 sm:p-8">
            <CardHeader className="p-0 pb-5">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-[#0F3D2E]" />
                <CardTitle style={{ fontFamily: "'Fraunces', serif" }} className="text-xl font-bold text-[#0F3D2E]">
                  Next Actions
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="flex flex-wrap items-center gap-3">

                {/* Pay Now Button (Lime highlight) */}
                {booking.status === 'accepted' && iAmRenter && (
                  <motion.div whileTap={{ scale: 0.96 }} whileHover={{ y: -1 }}>
                    <Button
                      type="button"
                      onClick={() => setShowPayPanel(!showPayPanel)}
                      className="bg-[#C6E930] text-[#0F3D2E] hover:bg-[#B3D426] font-bold px-6 h-12 rounded-xl text-sm shadow-sm flex items-center gap-2"
                    >
                      <CreditCard size={16} />
                      {showPayPanel ? 'Hide Payment' : 'Pay Now'}
                    </Button>
                  </motion.div>
                )}

                {/* Confirm Pickup */}
                {canConfirmPickup && (
                  <motion.div whileTap={{ scale: 0.96 }} whileHover={{ y: -1 }}>
                    <Button
                      type="button"
                      onClick={handleConfirmPickup}
                      disabled={confirmingId === 'pickup'}
                      className="bg-[#0F3D2E] text-white hover:bg-[#1B4D3E] font-bold px-6 h-12 rounded-xl text-sm shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      <PackageCheck size={16} />
                      {confirmingId === 'pickup' ? 'Confirming…' : 'Confirm Pickup'}
                    </Button>
                  </motion.div>
                )}

                {/* Pickup Date Awaiting Message */}
                {isAwaitingPickupDate && (
                  <div className="flex items-center gap-2 px-4 h-12 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                    <Clock size={16} className="text-amber-600" />
                    <span>Starts in {daysUntilStart} {daysUntilStart === 1 ? 'day' : 'days'} (Pickup available on start date)</span>
                  </div>
                )}

                {/* Confirm Return */}
                {canConfirmReturn && (
                  <motion.div whileTap={{ scale: 0.96 }} whileHover={{ y: -1 }}>
                    <Button
                      type="button"
                      onClick={handleConfirmReturn}
                      disabled={confirmingId === 'return'}
                      className="bg-[#0F3D2E] text-white hover:bg-[#1B4D3E] font-bold px-6 h-12 rounded-xl text-sm shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      <PackageCheck size={16} />
                      {confirmingId === 'return' ? 'Confirming…' : 'Confirm Return'}
                    </Button>
                  </motion.div>
                )}

                {/* Return Date Awaiting Message */}
                {isAwaitingReturnDate && (
                  <div className="flex items-center gap-2 px-4 h-12 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                    <Clock size={16} className="text-amber-600" />
                    <span>{daysUntilEnd} {daysUntilEnd === 1 ? 'day' : 'days'} left until return</span>
                  </div>
                )}

                {/* Open Chat */}
                {canChat && (
                  <motion.div whileTap={{ scale: 0.96 }} whileHover={{ y: -1 }}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(`/rental/chat/${id}`)}
                      className="border-stone-200 text-stone-700 hover:bg-stone-50 hover:text-[#0F3D2E] font-semibold px-5 h-12 rounded-xl text-sm flex items-center gap-2"
                    >
                      <MessageCircle size={16} /> Open Chat
                    </Button>
                  </motion.div>
                )}

                {/* Report Dispute / Issue */}
                {canDispute && (
                  <motion.div whileTap={{ scale: 0.96 }} whileHover={{ y: -1 }}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowDisputeModal(true)}
                      className="text-red-700 hover:text-red-800 hover:bg-red-50 font-medium px-4 h-12 rounded-xl text-sm flex items-center gap-2"
                    >
                      <AlertTriangle size={15} /> Report Issue
                    </Button>
                  </motion.div>
                )}
              </div>

              {/* Payment Upload Panel Expansion */}
              {showPayPanel && (
                <div className="mt-6 pt-6 border-t border-stone-100">
                  <PaymentUploadPanelRental
                    request={booking}
                    onSuccess={handlePaymentSuccess}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Dispute / Report Issue Dialog (shadcn Dialog) ── */}
        <Dialog open={showDisputeModal} onOpenChange={setShowDisputeModal}>
          <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl rounded-3xl p-6 sm:p-7">
            <DialogHeader>
              <div className="flex items-center gap-2.5 text-red-700 mb-1">
                <AlertTriangle size={20} />
                <DialogTitle style={{ fontFamily: "'Fraunces', serif" }} className="text-xl font-bold">
                  Report an Issue
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-stone-500">
                Submit details regarding any damage, delay, or handoff discrepancy. Our team will review the claim promptly.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleDisputeSubmit} className="space-y-4 pt-2">
              {disputeError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium">
                  {disputeError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                  Category of Issue
                </label>
                <select
                  value={disputeType}
                  onChange={(e) => setDisputeType(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-200 bg-white text-sm font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]/20"
                >
                  <option value="damage">Item Damaged during Rental</option>
                  <option value="late_return">Item Returned Late / Overdue</option>
                  <option value="non_return">Item Not Received / Missing</option>
                  <option value="other">Other Query (Deposit or Item Discrepancy)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                  Description of What Happened
                </label>
                <textarea
                  rows={4}
                  value={disputeDesc}
                  onChange={(e) => setDisputeDesc(e.target.value)}
                  placeholder="Please provide specifics so our team can evaluate the case fairly..."
                  required
                  className="w-full p-3.5 rounded-xl border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#0F3D2E]/20 resize-none"
                />
              </div>

              <DialogFooter className="pt-2 gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDisputeModal(false)}
                  disabled={disputeSubmitting}
                  className="rounded-xl h-11 border-stone-200 font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={disputeSubmitting}
                  className="rounded-xl h-11 bg-red-700 hover:bg-red-800 text-white font-bold"
                >
                  {disputeSubmitting ? 'Submitting…' : 'Submit Claim'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
