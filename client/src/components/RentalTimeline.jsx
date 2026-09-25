import React from 'react'
import {
  Send,
  Handshake,
  CreditCard,
  PackageCheck,
  Clock,
  ShieldCheck,
  AlertTriangle,
  XCircle,
} from 'lucide-react'

const TIMELINE_CSS = `
/* ── Unified Rental Timeline (Apple × Duolingo) ── */
.rtl-wrap {
  width: 100%;
  padding: 12px 0;
  user-select: none;
}

.rtl-track {
  display: flex;
  align-items: flex-start;
  position: relative;
  width: 100%;
}

.rtl-step-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
  min-width: 0;
}

/* ── Connecting Lines ── */
.rtl-connector {
  position: absolute;
  top: 18px;
  left: 50%;
  width: 100%;
  height: 3px;
  background: rgba(15, 61, 46, 0.10);
  z-index: 1;
  overflow: hidden;
}

.rtl-connector-fill {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #c6e930 0%, #a3e635 100%);
  transform-origin: left center;
  transform: scaleX(0);
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.rtl-connector-fill.filled {
  transform: scaleX(1);
  animation: rtlFillLine 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes rtlFillLine {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

/* ── Node Circles ── */
.rtl-node {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  background: #ffffff;
  border: 2px solid rgba(15, 61, 46, 0.15);
  color: #7a8c84;
}

/* Completed Step: Lime Reward Fill & Glow */
.rtl-node.completed {
  background: #c6e930;
  border-color: #a6db1a;
  color: #0f3d2e;
  box-shadow: 0 4px 14px rgba(198, 233, 48, 0.45), 0 0 0 2px rgba(198, 233, 48, 0.2);
  transform: scale(1.02);
}

/* Active Step: Alive Pulse & Gentle Scale */
.rtl-node.active {
  background: #0f3d2e;
  border-color: #c6e930;
  border-width: 2.5px;
  color: #c6e930;
  animation: rtlActivePulse 2.2s infinite ease-in-out;
}

@keyframes rtlActivePulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(198, 233, 48, 0.65), 0 4px 12px rgba(15, 61, 46, 0.3);
  }
  50% {
    transform: scale(1.09);
    box-shadow: 0 0 0 9px rgba(198, 233, 48, 0), 0 6px 18px rgba(15, 61, 46, 0.4);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(198, 233, 48, 0), 0 4px 12px rgba(15, 61, 46, 0.3);
  }
}

/* Disputed Step: Distinct Shake & Warning Aura */
.rtl-node.disputed {
  background: #fef2f2;
  border-color: #ef4444;
  border-width: 2.5px;
  color: #dc2626;
  animation: rtlDisputeShake 0.6s ease-in-out, rtlDisputeGlow 2s infinite ease-in-out;
}

@keyframes rtlDisputeShake {
  0%, 100% { transform: translateX(0); }
  15%, 55% { transform: translateX(-4px) rotate(-3deg); }
  35%, 75% { transform: translateX(4px) rotate(3deg); }
  90% { transform: translateX(-1px); }
}

@keyframes rtlDisputeGlow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5), 0 0 14px rgba(239, 68, 68, 0.3);
  }
  50% {
    box-shadow: 0 0 0 7px rgba(239, 68, 68, 0), 0 0 20px rgba(239, 68, 68, 0.5);
  }
}

/* Cancelled Step */
.rtl-node.cancelled {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #64748b;
}

/* ── Labels ── */
.rtl-label {
  margin-top: 8px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  color: #7a8c84;
  line-height: 1.25;
  padding: 0 2px;
  transition: color 0.2s ease;
  word-break: break-word;
}

.rtl-step-col.completed .rtl-label {
  color: #0f3d2e;
  font-weight: 700;
}

.rtl-step-col.active .rtl-label {
  color: #0f3d2e;
  font-weight: 800;
}

.rtl-step-col.disputed .rtl-label {
  color: #dc2626;
  font-weight: 800;
}

/* Compact mode (for list cards) */
.rtl-wrap.compact .rtl-node {
  width: 30px;
  height: 30px;
}
.rtl-wrap.compact .rtl-connector {
  top: 15px;
  height: 2.5px;
}
.rtl-wrap.compact .rtl-label {
  font-size: 10px;
  margin-top: 6px;
}

@media (max-width: 600px) {
  .rtl-label {
    font-size: 9.5px;
    letter-spacing: -0.01em;
  }
  .rtl-node {
    width: 28px;
    height: 28px;
  }
  .rtl-connector {
    top: 14px;
  }
}
`

export const UNIFIED_STEPS = [
  { key: 'request_sent', label: 'Request Sent', icon: Send },
  { key: 'accepted',     label: 'Accepted',     icon: Handshake },
  { key: 'paid',         label: 'Payment',      icon: CreditCard },
  { key: 'pickup',       label: 'Picked Up',    icon: PackageCheck },
  { key: 'in_use',       label: 'In Use',       icon: Clock },
  { key: 'returned',     label: 'Returned',     icon: ShieldCheck },
]

export function computeRentalStepState(stepKey, rental) {
  if (!rental) return 'upcoming'

  const status = rental.status // pending, accepted, active, return_pending, completed, disputed, cancelled, declined
  const isPaid = ['paid', 'verified'].includes(rental.payment_status) ||
                 ['active', 'return_pending', 'completed'].includes(status)
  const pickupDone = Boolean(rental.borrower_confirmed_pickup && rental.owner_confirmed_pickup) ||
                     ['active', 'return_pending', 'completed'].includes(status)
  const isReturnPending = status === 'return_pending' ||
                          (rental.borrower_confirmed_return && !rental.owner_confirmed_return)
  const isCompleted = status === 'completed'
  const isDisputed = status === 'disputed'
  const isCancelled = ['cancelled', 'declined'].includes(status)

  if (isCancelled) {
    if (stepKey === 'request_sent') return 'completed'
    if (stepKey === 'accepted') return 'cancelled'
    return 'upcoming'
  }

  switch (stepKey) {
    case 'request_sent':
      return 'completed'

    case 'accepted':
      if (status === 'pending') return 'active'
      if (['accepted', 'active', 'return_pending', 'completed', 'disputed'].includes(status) || isPaid) {
        return 'completed'
      }
      return 'upcoming'

    case 'paid':
      if (isPaid) return 'completed'
      if (status === 'accepted' && !isPaid) {
        if (isDisputed) return 'disputed'
        return 'active'
      }
      return 'upcoming'

    case 'pickup':
      if (pickupDone) return 'completed'
      if (isPaid && !pickupDone && status === 'accepted') {
        if (isDisputed) return 'disputed'
        return 'active'
      }
      return 'upcoming'

    case 'in_use':
      if (isCompleted || isReturnPending) return 'completed'
      if (status === 'active' && pickupDone) {
        if (isDisputed) return 'disputed'
        return 'active'
      }
      return 'upcoming'

    case 'returned':
      if (isCompleted) return 'completed'
      if (isReturnPending) {
        if (isDisputed) return 'disputed'
        return 'active'
      }
      if (isDisputed) return 'disputed'
      return 'upcoming'

    default:
      return 'upcoming'
  }
}

export default function RentalTimeline({ rental, compact = false }) {
  if (!rental) return null

  return (
    <>
      <style>{TIMELINE_CSS}</style>
      <div className={`rtl-wrap ${compact ? 'compact' : ''}`}>
        <div className="rtl-track">
          {UNIFIED_STEPS.map((step, idx) => {
            const state = computeRentalStepState(step.key, rental)
            const isLast = idx === UNIFIED_STEPS.length - 1
            const Icon = state === 'disputed'
              ? AlertTriangle
              : state === 'cancelled'
              ? XCircle
              : step.icon

            const nextState = !isLast ? computeRentalStepState(UNIFIED_STEPS[idx + 1].key, rental) : null
            const lineFilled = state === 'completed' && ['completed', 'active', 'disputed'].includes(nextState)

            const iconSize = compact ? 14 : 16

            return (
              <div key={step.key} className={`rtl-step-col ${state}`}>
                {/* Connecting Line to next step */}
                {!isLast && (
                  <div className="rtl-connector">
                    <div
                      className={`rtl-connector-fill ${lineFilled ? 'filled' : ''}`}
                      style={{ animationDelay: `${idx * 0.12}s` }}
                    />
                  </div>
                )}

                {/* Node with contextual icon */}
                <div
                  className={`rtl-node ${state}`}
                  title={`${step.label}: ${state}`}
                >
                  <Icon size={iconSize} strokeWidth={state === 'active' || state === 'completed' ? 2.3 : 1.8} />
                </div>

                {/* Step label */}
                <span className="rtl-label">
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
