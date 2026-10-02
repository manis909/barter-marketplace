import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../services/api'

/**
 * Drives the one-time "you're verified" celebration.
 *
 * The "seen" flag lives on the user's account, next to the verification
 * itself — not in local storage and not derived from a date window. That
 * gives us the two properties the celebration needs:
 *
 *   1. It fires exactly once per verification. The server clears the flag
 *      again if the account is verified a second time, so a genuine
 *      re-verification still gets its own celebration.
 *   2. It is not time-boxed. Someone approved months ago who has never
 *      opened the celebration still sees it the first time they open
 *      their profile after the feature shipped.
 */
export default function useVerificationCelebration(enabled) {
  const [showCelebration, setShowCelebration] = useState(false)
  // Guards against React 18/19 StrictMode double-invoking the effect, and
  // against re-checking on every re-render.
  const checked = useRef(false)

  useEffect(() => {
    if (!enabled || checked.current) return
    checked.current = true

    api
      .get('/verification/status')
      .then((res) => {
        const data = res.data || {}
        if (data.is_verified && !data.celebration_seen) {
          setShowCelebration(true)
          // Claim it straight away so navigating to another profile in the
          // same session can never replay the animation. A failure here is
          // not fatal: worst case the celebration is shown again later.
          api.post('/verification/celebration/seen').catch(() => {})
        }
      })
      .catch(() => {})
  }, [enabled])

  const dismissCelebration = useCallback(() => setShowCelebration(false), [])

  return { showCelebration, dismissCelebration }
}
