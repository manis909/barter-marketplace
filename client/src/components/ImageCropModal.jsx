import { useCallback, useEffect, useState } from 'react'
import Cropper from 'react-easy-crop'
import { Check, Crop, X } from 'lucide-react'
import './ImageCropModal.css'

/**
 * ImageCropModal — powered by react-easy-crop
 *
 * Key design decisions:
 *   • We load the image first to measure its natural width/height.
 *   • The crop frame aspect ratio is set to match the image exactly, so on
 *     open the crop frame covers 100% of the image — nothing is pre-cropped.
 *   • zoom starts at 1 (fit-to-frame), which is react-easy-crop's minimum,
 *     so the image fills its frame without any overflow on open.
 *   • The container height adapts to the image ratio via a CSS padding-bottom
 *     trick so tall/wide/square images all feel natural.
 *   • Apply Crop with zero user interaction produces a blob identical to the
 *     original (same pixels, recompressed to jpeg 0.95).
 *
 * Props:
 *   imageSrc  — blob URL or data URL of the image to crop
 *   onCrop    — callback(blob) called with the cropped Blob
 *   onCancel  — called when the user cancels without cropping
 */
export default function ImageCropModal({ imageSrc, onCrop, onCancel }) {
  // Natural image dimensions — needed to compute the aspect ratio
  const [naturalSize, setNaturalSize] = useState(null)

  // react-easy-crop controlled state
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const [applying, setApplying] = useState(false)

  // ── Measure the image before rendering the cropper ────────────
  useEffect(() => {
    if (!imageSrc) return
    const img = new Image()
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = imageSrc
  }, [imageSrc])

  // ── Escape to cancel ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  const onCropComplete = useCallback((_croppedArea, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleApply = async () => {
    if (!croppedAreaPixels) return
    setApplying(true)
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
      onCrop(blob)
    } catch (err) {
      console.error('Crop failed:', err)
      setApplying(false)
    }
  }

  // ── Derive the aspect ratio from the real image dimensions ─────
  // Falls back to 1 (square) only while the image hasn't loaded yet.
  const imageAspect = naturalSize
    ? naturalSize.width / naturalSize.height
    : 1

  // ── Container height as % of its width, matching the image ratio.
  // This makes the crop area exactly fit the image with no black bars.
  // e.g. 16:9 → 56.25%, 4:3 → 75%, 1:1 → 100%, portrait 3:4 → 133%
  // We cap tall images at 80vh via CSS so the modal doesn't overflow.
  const paddingBottom = naturalSize
    ? `${Math.min((naturalSize.height / naturalSize.width) * 100, 80)}%`
    : '100%'

  return (
    <div className="icm-backdrop" onClick={onCancel}>
      <div className="icm-panel" onClick={(e) => e.stopPropagation()}>

        {/* Close */}
        <button type="button" className="icm-close" onClick={onCancel} aria-label="Close">
          <X size={16} />
        </button>

        {/* Header */}
        <div className="icm-header">
          <div className="icm-icon"><Crop size={20} /></div>
          <h2 className="icm-title">Crop Image</h2>
          <p className="icm-subtitle">
            Full image shown by default · drag to pan · pinch or slide to zoom
          </p>
        </div>

        {/* Cropper — only render once we know the image aspect ratio */}
        {naturalSize && (
          <div
            className="icm-crop-area"
            style={{ paddingBottom }}
          >
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              // Match the crop frame to the actual image shape so it
              // covers 100% of the image when zoom=1 and crop={x:0,y:0}
              aspect={imageAspect}
              // zoom=1 is react-easy-crop's default minimum — the image
              // fills the frame exactly with no overflow visible
              minZoom={1}
              maxZoom={4}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid
              // No restrictPosition=false: we DO want the image to stay
              // within the crop frame (same as WhatsApp/Instagram behavior)
              style={{
                containerStyle: {
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '16px',
                  background: '#111',
                },
                cropAreaStyle: {
                  border: '2px solid rgba(255,255,255,0.85)',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                },
                mediaStyle: {
                  // Ensures the image fills the crop frame fully at zoom=1
                  objectFit: 'contain',
                },
              }}
            />
          </div>
        )}

        {/* Zoom slider */}
        <div className="icm-zoom-row">
          <span className="icm-zoom-label">Zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="icm-zoom-slider"
            aria-label="Zoom level"
          />
          <span className="icm-zoom-value">{zoom.toFixed(1)}×</span>
        </div>

        {/* Actions */}
        <div className="icm-actions">
          <button type="button" className="icm-btn icm-btn--cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="icm-btn icm-btn--crop"
            onClick={handleApply}
            disabled={applying || !croppedAreaPixels}
          >
            <Check size={15} />
            {applying ? 'Applying…' : 'Apply Crop'}
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Draw the selected pixel region onto a canvas and return a Blob ────────────
async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await loadImage(imageSrc)

  const canvas = document.createElement('canvas')
  canvas.width  = pixelCrop.width
  canvas.height = pixelCrop.height

  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    image,
    pixelCrop.x,     pixelCrop.y,
    pixelCrop.width,  pixelCrop.height,
    0,               0,
    pixelCrop.width,  pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
      'image/jpeg',
      0.95   // slightly higher quality than before since no pre-crop waste
    )
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = reject
    img.src     = src
  })
}
