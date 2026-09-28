import { useEffect, useState } from 'react'
import './UserAvatar.css'

/**
 * First character of a display name, uppercased.
 * Falls back to "?" only when there is genuinely no name to work with.
 */
function getInitial(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return '?'
  // Take the first character of the *first* word so accented and
  // non-Latin names still yield a real letter rather than whitespace.
  return Array.from(trimmed)[0].toUpperCase()
}

/**
 * Circular user avatar with a first-initial fallback.
 *
 * Used in the navbar, the profile drawers and all three profile pages so the
 * "photo or initial" rule is identical everywhere. If the image URL 404s we
 * fall back to the initial rather than showing a broken-image glyph.
 */
export default function UserAvatar({
  src,
  name,
  size = 40,
  className = '',
  alt,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  title,
}) {
  const [failed, setFailed] = useState(false)

  // A new URL deserves a fresh attempt at loading.
  useEffect(() => {
    setFailed(false)
  }, [src])

  const showImage = Boolean(src) && !failed
  const px = typeof size === 'number' && Number.isFinite(size) ? size : 40

  const style = {
    width: px,
    height: px,
    fontSize: Math.max(11, Math.round(px * 0.42)),
  }

  const interactiveProps = {}
  if (onClick) {
    interactiveProps.onClick = onClick
    interactiveProps.role = role || 'button'
    interactiveProps.tabIndex = tabIndex ?? 0
  }
  if (onKeyDown) interactiveProps.onKeyDown = onKeyDown
  if (title) interactiveProps.title = title

  return (
    <span
      className={`user-avatar${className ? ` ${className}` : ''}`}
      style={style}
      {...interactiveProps}
    >
      {showImage ? (
        <img
          className="user-avatar__image"
          src={src}
          alt={alt ?? name ?? ''}
          onError={() => setFailed(true)}
          style={{ width: px, height: px }}
        />
      ) : (
        <span className="user-avatar__initial" aria-hidden="true">
          {getInitial(name)}
        </span>
      )}
    </span>
  )
}
