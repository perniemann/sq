import { useEffect, useRef, useState } from 'react'

const PREFERS_REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Fires a single entrance pass the first time the element scrolls into view. Reduced
 * motion (or no window, e.g. SSR) short-circuits straight to the revealed state so the
 * static frame is what renders — never a stuck pre-animation frame.
 */
export function useRevealOnView<T extends Element>(): {
  ref: React.RefObject<T | null>
  revealed: boolean
} {
  const ref = useRef<T | null>(null)
  const [revealed, setRevealed] = useState(PREFERS_REDUCED_MOTION)

  useEffect(() => {
    if (PREFERS_REDUCED_MOTION) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, revealed }
}
