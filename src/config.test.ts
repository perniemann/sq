import { describe, it, expect } from 'vitest'
import {
  BOUNCE_PROFILES,
  BOUNCE_PROFILE,
  displayAlpha,
  bounceCoefficients,
} from './config'

describe('BOUNCE_PROFILES', () => {
  it('defaults to realistic', () => {
    expect(BOUNCE_PROFILE).toBe('realistic')
    expect(bounceCoefficients()).toEqual(BOUNCE_PROFILES.realistic)
  })

  it('keeps arcade livelier than realistic on the ball', () => {
    expect(BOUNCE_PROFILES.arcade.ball).toBeGreaterThan(BOUNCE_PROFILES.realistic.ball)
  })
})

describe('displayAlpha', () => {
  it('maps sRGB-looking alphas into darker linear alphas', () => {
    expect(displayAlpha(0.15)).toBeLessThan(0.15)
    expect(displayAlpha(1)).toBeCloseTo(1, 5)
    expect(displayAlpha(0)).toBeGreaterThan(0)
  })
})
