import UserAvatar from './UserAvatar'
import VerifiedBadge from '../features/verification/VerifiedBadge'
import './ProfileAvatar.css'

/**
 * Identity block for a profile header: the photo (or the first-initial
 * fallback) with the verified shield riding its bottom-right corner.
 *
 * Shared by the Barter, Skilter and Rental profile pages so the header looks
 * identical in all three and the badge can never drift to a new size or
 * position on one screen only.
 */
export default function ProfileAvatar({
  src,
  name,
  size = 100,
  showBadge = false,
  onClick,
  alt,
}) {
  const avatar = (
    <UserAvatar
      src={src}
      name={name}
      size={size}
      className="profile-avatar"
      alt={alt}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    />
  )

  if (!showBadge) return avatar

  return (
    <span className="profile-avatar-slot">
      {avatar}
      <VerifiedBadge
        size="lg"
        withLabel={false}
        className="shield-badge--identity profile-avatar-badge"
        title="Verified by the Barter team"
      />
    </span>
  )
}
