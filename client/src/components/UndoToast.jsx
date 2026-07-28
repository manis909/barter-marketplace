import { useEffect } from 'react'
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
  // The progress bar shrink is handled entirely by CSS (see UndoToast.css
  // `.undo-toast__bar-fill`). No JS state is needed for the animation, which
  // avoids the rAF → setProgress → re-render loop that was fighting the
  // stable onExpire reference introduced by useCallback in the parent.
  useEffect(() => {
    // Fire onExpire after the full duration
    const timer = setTimeout(() => {
      onExpire?.()
    }, TOAST_DURATION)

    return () => clearTimeout(timer)
  }, [onExpire])

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
          onClick={() => onUndo?.()}
        >
          <Undo2 size={14} />
          Undo
        </button>
      </div>
      {/* Timer bar — animated by CSS keyframes, no JS state required */}
      <div className="undo-toast__bar">
        <div className="undo-toast__bar-fill" />
      </div>
    </div>
  )
}
