import type { SwingState } from './swingAnimation'

/** Horizontal reach for proximity strikes (player / AI) — arcade forgiveness. */
export const STRIKE_RANGE_M = 2.15

/** Ball height band that still counts as reachable (m). */
export const STRIKE_Y_MIN = 0.05
export const STRIKE_Y_MAX = 2.5

/**
 * Planar (XZ) strike range. Full 3D distance made high balls feel unreachable —
 * a ball at y=1.4 with the athlete at y≈0 already burns most of a 1.5 m budget.
 */
export function isInStrikeRange(
  player: { x: number, y: number, z: number },
  ball: { x: number, y: number, z: number },
  rangeM: number = STRIKE_RANGE_M,
): boolean {
  if (ball.y < STRIKE_Y_MIN || ball.y > STRIKE_Y_MAX) return false
  const dx = ball.x - player.x
  const dz = ball.z - player.z
  return Math.hypot(dx, dz) <= rangeM
}

/**
 * Forgiving swing contact window for racquet-sensor hits.
 * Covers late forward through mid follow-through (~most of the visible swing).
 */
export function isInSwingHitWindow(swingState: SwingState | null | undefined): boolean {
  if (!swingState?.isSwinging) return false
  const { phase, progress } = swingState
  // Early forward through late follow-through — late Space releases still connect.
  if (phase === 'forward' && progress >= 0.05) return true
  if (phase === 'contact') return true
  if (phase === 'followThrough' && progress <= 0.8) return true
  return false
}

/**
 * Continuous 0–1 quality of swing timing at contact.
 * Ideal at `contact` / late `forward`; decays through follow-through and early prep.
 * Proximity hits without an active swing get a middling default (not a free perfect).
 */
export function swingTimingQuality(swingState: SwingState | null | undefined): number {
  if (!swingState?.isSwinging) return 0.55
  const { phase, progress } = swingState
  const p = Math.max(0, Math.min(1, progress))
  if (phase === 'contact') return 1
  if (phase === 'forward') {
    // Ramp toward contact at the end of the forward swing.
    return 0.35 + 0.65 * p
  }
  if (phase === 'followThrough') {
    // Early follow-through is still clean; late is rushed.
    return Math.max(0.15, 1 - p * 0.85)
  }
  if (phase === 'backswing') return 0.4
  return 0.35
}

/**
 * Blend spatial sweet-spot accuracy with swing timing.
 * Timing 0 keeps 40% of spatial; timing 1 keeps full spatial.
 */
export function combineHitAccuracy(spatial: number, timing: number): number {
  const s = Math.max(0, Math.min(1, spatial))
  const t = Math.max(0, Math.min(1, timing))
  return Math.max(0, Math.min(1, s * (0.4 + 0.6 * t)))
}
