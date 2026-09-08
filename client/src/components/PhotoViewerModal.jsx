import './PhotoViewerModal.css';

// Pair this with the usePhotoViewer hook. Renders nothing if isOpen is false.
export default function PhotoViewerModal({ src, isOpen, onClose, dragY, dragging, touchHandlers }) {
  if (!isOpen || !src) return null;

  return (
    <div
      className="photo-viewer-backdrop"
      onClick={onClose}
      style={{
        backgroundColor: `rgba(0, 0, 0, ${Math.max(0.9 - dragY / 300, 0.3)})`,
      }}
    >
      <button
        type="button"
        className="photo-viewer-close"
        onClick={onClose}
        aria-label="Close"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <img
        src={src}
        alt="Profile"
        className="photo-viewer-image"
        onClick={(e) => e.stopPropagation()}
        {...touchHandlers}
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
        }}
      />
    </div>
  );
}