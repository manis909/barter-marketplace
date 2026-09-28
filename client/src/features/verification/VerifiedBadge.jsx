import './VerifiedBadge.css'

/**
 * Single source of truth for the "verified" identity mark.
 *
 * The design is a shield containing a handshake. The same artwork is reused at
 * every size across the app — only the rendered pixel size changes, so no
 * screen can grow its own variant. There is deliberately no checkmark and no
 * emoji anywhere in this component.
 *
 * Sized buckets:
 *   sm  -> 16px  compact inline (next to a username, in list rows)
 *   md  -> 24px  larger identity areas (drawer header, owner cards)
 *   lg  -> 48px  main profile header
 *   xl  -> 96px  celebration
 */
const SIZE_TOKENS = {
  sm: 16,
  md: 24,
  lg: 48,
  xl: 96,
}

const DEFAULT_SIZE = 16

function resolveSize(size) {
  if (typeof size === 'number' && Number.isFinite(size)) return size
  if (typeof size === 'string' && size in SIZE_TOKENS) return SIZE_TOKENS[size]
  return DEFAULT_SIZE
}

export default function VerifiedBadge({
  size = 'sm',
  withLabel = true,
  label = 'Verified',
  title = 'Verified by the Barter team',
  className = '',
}) {
  const px = resolveSize(size)

  return (
    <span
      className={`shield-badge${withLabel ? ' shield-badge--labelled' : ''}${
        className ? ` ${className}` : ''
      }`}
      style={{ '--shield-badge-size': `${px}px` }}
      title={title}
    >
      <svg
        className="shield-badge__icon"
        width={px}
        height={px}
        viewBox="0 0 32 32"
        role="img"
        aria-label="Verified"
        focusable="false"
      >
        <path
          className="shield-badge__shield"
          d="M16 2.6 5 6.3v8.2c0 6.1 4.3 11.8 11 13.8 6.7-2 11-7.7 11-13.8V6.3L16 2.6Z"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <g
          className="shield-badge__handshake"
          transform="translate(7.42 6.04) scale(0.78)"
          fill="none"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m11 17 2 2a1 1 0 1 0 3-3" />
          <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
          <path d="m21 3 1 11h-2" />
          <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
          <path d="M3 4h8" />
        </g>
      </svg>
      {withLabel && <span className="shield-badge__label">{label}</span>}
    </span>
  )
}
