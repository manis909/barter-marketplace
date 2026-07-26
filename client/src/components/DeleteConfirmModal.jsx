import { useEffect, useRef } from 'react'
import { Trash2, X } from 'lucide-react'
import './DeleteConfirmModal.css'

/**
 * Props:
 *   itemTitle  — name of the item being deleted, shown in the message
 *   onConfirm  — called when the user clicks the red Delete button
 *   onCancel   — called when the user clicks Cancel or the backdrop/Escape
 */
export default function DeleteConfirmModal({ itemTitle, onConfirm, onCancel }) {
  const cancelBtnRef = useRef(null)

  // Focus the Cancel button on mount so Escape / Tab works naturally
  useEffect(() => {
    cancelBtnRef.current?.focus()

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    /* Backdrop */
    <div
      className="dcm-backdrop"
      onClick={onCancel}
      role="presentation"
    >
      {/* Panel — stop click from bubbling to backdrop */}
      <div
        className="dcm-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dcm-title"
        aria-describedby="dcm-desc"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close icon */}
        <button
          type="button"
          className="dcm-close"
          onClick={onCancel}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="dcm-icon">
          <Trash2 size={22} />
        </div>

        {/* Copy */}
        <h2 id="dcm-title" className="dcm-title">Delete Listing?</h2>
        <p id="dcm-desc" className="dcm-message">
          Are you sure you want to delete{' '}
          <strong>"{itemTitle}"</strong>?{' '}
          This action can be undone for a short time.
        </p>

        {/* Actions */}
        <div className="dcm-actions">
          <button
            ref={cancelBtnRef}
            type="button"
            className="dcm-btn dcm-btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dcm-btn dcm-btn--delete"
            onClick={onConfirm}
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
