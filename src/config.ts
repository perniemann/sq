/** Enable debug logging when true (e.g. during development). */
export const DEBUG = import.meta.env.DEV

/**
 * Restitution profiles. Rapier averages the ball's value with the surface's, so the
 * effective floor bounce is the mean of the two.
 */
export const BOUNCE_PROFILES = {
  /** Effective ~0.40 floor / ~0.50 walls — a warm double-yellow-dot ball. */
  realistic: { ball: 0.45, floor: 0.35, wall: 0.55 },
  /** Effective ~0.65 floor / ~0.70 walls — the previous lively feel. */
  arcade: { ball: 0.85, floor: 0.45, wall: 0.55 },
} as const

export type BounceProfileName = keyof typeof BOUNCE_PROFILES

/** Default bounce feel. Override at runtime with `?bounce=arcade` or `?bounce=realistic`. */
export const BOUNCE_PROFILE: BounceProfileName = 'realistic'

export function resolveBounceProfile(): BounceProfileName {
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search).get('bounce')
    if (q === 'arcade' || q === 'realistic') return q
  }
  return BOUNCE_PROFILE
}

export function bounceCoefficients(): (typeof BOUNCE_PROFILES)[BounceProfileName] {
  return BOUNCE_PROFILES[resolveBounceProfile()]
}

/**
 * Convert an opacity authored against sRGB-looking blending into the linear-space alpha
 * the postprocessing composer uses (see Phase 2 F19/F23).
 */
export function displayAlpha(a: number): number {
  return ((a + 0.055) / 1.055) ** 2.4
}
