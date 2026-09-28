import { useEffect, useMemo } from 'react'
import VerifiedBadge from './VerifiedBadge'
import './VerificationCelebration.css'

const PARTICLE_COUNT = 22

// Hold time before the panel starts to fade, then the fade itself. The two
// are added together to decide when to unmount, so the exit animation is
// always allowed to finish.
const HOLD_MS = 4200
const FADE_MS = 800
const REDUCED_HOLD_MS = 2400
const REDUCED_FADE_MS = 320

/**
 * True when the user has asked the OS to reduce motion. Kept in a hook so the
 * component can shorten its own lifetime as well as dropping the animations.
 */
function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'

  return useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
    // Read once on mount — the animation is short-lived and the overlay is
    // remounted for each celebration anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/**
 * One-time verification celebration.
 *
 * Glassmorphism panel in the Barter palette, the shared shield + handshake at
 * celebration size, an animated glow, a shine sweep across the shield and
 * drifting / twinkling particles. No Continue button and no dismissal control
 * on purpose: it fades away on its own.
 */
export default function VerificationCelebration({ onDone }) {
  const reducedMotion = usePrefersReducedMotion()

  // Deterministic per-mount layout so the particle field never reshuffles on
  // a re-render.
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        // Golden-ratio stride keeps the angles well spread without RNG.
        const angle = (i * 137.508) % 360
        const radius = 26 + ((i * 17) % 46)
        return {
          id: i,
          x: 50 + radius * 1.15 * Math.cos((angle * Math.PI) / 180),
          y: 50 + radius * Math.sin((angle * Math.PI) / 180) * 0.86,
          size: 3 + ((i * 5) % 7),
          drift: 14 + ((i * 11) % 26),
          rise: -(18 + ((i * 9) % 34)),
          duration: 3200 + ((i * 430) % 2600),
          delay: (i * 190) % 1600,
          twinkle: 1500 + ((i * 370) % 1400),
          tone: i % 3,
        }
      }),
    []
  )

  // Hold time before the panel starts to fade, then the fade itself. The two
  // are added together to decide when to unmount, so the exit animation is
  // always allowed to finish.
  const hold = reducedMotion ? REDUCED_HOLD_MS : HOLD_MS
  const fade = reducedMotion ? REDUCED_FADE_MS : FADE_MS

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof onDone === 'function') onDone()
    }, hold + fade)
    return () => clearTimeout(timer)
  }, [onDone, hold, fade])

  return (
    <div
      className="vc-overlay"
      role="status"
      aria-live="polite"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      // Single source of truth for the sequence timing — the stylesheet reads
      // these for the exit animation and the auto-unmount matches them.
      style={{ '--vc-fade-delay': `${hold}ms`, '--vc-exit-duration': `${fade}ms` }}
    >
      <div className="vc-panel">
        <span className="vc-aura" aria-hidden="true" />

        <div className="vc-particles" aria-hidden="true">
          {particles.map((p) => (
            <span
              key={p.id}
              className={`vc-particle vc-particle--tone-${p.tone}`}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                '--vc-drift': `${p.drift}px`,
                '--vc-rise': `${p.rise}px`,
                '--vc-float-duration': `${p.duration}ms`,
                '--vc-delay': `${p.delay}ms`,
                '--vc-twinkle-duration': `${p.twinkle}ms`,
              }}
            />
          ))}
        </div>

        <div className="vc-shield-stage">
          <span className="vc-shield-glow" aria-hidden="true" />
          <span className="vc-shield-shine" aria-hidden="true" />
          <VerifiedBadge size="xl" withLabel={false} className="vc-shield" />
        </div>

        <h2 className="vc-title">YOU&rsquo;RE VERIFIED!</h2>
        <p className="vc-subtitle">Your account has been verified by our team.</p>
      </div>
    </div>
  )
}
