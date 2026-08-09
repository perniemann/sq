import { describe, it, expect } from 'vitest'
import { ACCURACY_EFFECTS, HIT_ZONE_CONFIG } from './hitAccuracy'

/**
 * Locks the arcade return-forgiveness floor: edge contacts stay playable while
 * charge power and aim still matter at the top end.
 */
describe('arcade return forgiveness (accuracy)', () => {
  it('keeps edge mishits above half power', () => {
    expect(ACCURACY_EFFECTS.minPowerMultiplier).toBeGreaterThanOrEqual(0.55)
    expect(ACCURACY_EFFECTS.maxPowerMultiplier).toBe(1)
  })

  it('caps aim noise so walls stay readable', () => {
    expect(ACCURACY_EFFECTS.maxDirectionDeviation).toBeLessThanOrEqual(Math.PI / 10 + 1e-9)
  })

  it('widens the sweet spot for arcade contacts', () => {
    expect(HIT_ZONE_CONFIG.sweetSpotRadius).toBeGreaterThanOrEqual(0.55)
    expect(HIT_ZONE_CONFIG.sweetSpotRadius).toBeLessThan(HIT_ZONE_CONFIG.radius)
  })
})
