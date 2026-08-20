/**
 * Athlete / racquet fill opacity as a shot-strength cue.
 * Authored alphas are sRGB-looking; callers run them through `displayAlpha` for bloom.
 */

/** Idle / 0 strength — current translucent fill. */
export const ATHLETE_FILL_OPACITY_MIN = 0.15

/** Full strength — denser fill (still see-through edges via accent mesh). */
export const ATHLETE_FILL_OPACITY_MAX = 0.72

/** Clamp strength to [0, 1]; idle must pass 0 (not shot-power floor). */
export function athleteFillStrength(isCharging: boolean, chargeLevel: number): number {
  if (!isCharging) return 0
  if (chargeLevel <= 0) return 0
  return Math.min(1, chargeLevel)
}

/** Authored fill opacity for a 0–1 strength (before `displayAlpha`). */
export function athleteFillAuthoredOpacity(strength01: number): number {
  const t = Math.max(0, Math.min(1, strength01))
  return ATHLETE_FILL_OPACITY_MIN
    + t * (ATHLETE_FILL_OPACITY_MAX - ATHLETE_FILL_OPACITY_MIN)
}
