import { useEffect, useState } from 'react'
import { CheckCircle2, Undo2 } from 'lucide-react'
import './UndoToast.css'

const TOAST_DURATION = 7000 // ms — how long before the deletion is finalised

/**
 * Props:
 *   message      — primary text, e.g. "Listing deleted"
 *   onUndo       — called immediately when Undo is clicked
 *   onExpire     — called when the timer runs out (finalise the delete)
 */
export default function UndoToast({ message, onUndo, onExpire }) {
  // Progress bar goes from 100 → 0 over TOAST_DURATION
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const start = performance.now()

    // Animate the progress bar with rAF
    let rafId
    function tick(now) {
      const elapsed = now - start
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100)
      setProgress(remaining)
      if (remaining > 0) {
        rafId = requestAnimationFrame(tick)
      }
    }
    rafId = requestAnimationFrame(tick)

    // Fire onExpire after the full duration
    const timer = setTimeout(() => {
      onExpire?.()
    }, TOAST_DURATION)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timer)
    }
  }, [onExpire])

  const handleUndo = () => {
    onUndo?.()
  }

  return (
    <div className="undo-toast" role="status" aria-live="polite">
      <div className="undo-toast__body">
        <div className="undo-toast__icon">
          <CheckCircle2 size={17} />
        </div>
        <span className="undo-toast__message">{message}</span>
        <button
          type="button"
          className="undo-toast__undo-btn"
          onClick={handleUndo}
        >
          <Undo2 size={14} />
          Undo
        </button>
      </div>
      {/* Timer bar */}
      <div className="undo-toast__bar">
        <div
          className="undo-toast__bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
