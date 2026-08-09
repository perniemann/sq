import { describe, expect, it } from 'vitest'
import {
  PIXEL_SHARD_BASE_SIZE,
  PIXEL_SHARD_DISSOLVE_STEPS,
  PIXEL_SHARD_LIFETIME_MS,
  pixelShardAge01,
  pixelShardAlive,
  pixelShardScale,
  ribbonTrailAttenuation,
  ribbonTrailVisibleFraction,
} from './pixelTrail'

describe('ribbonTrailVisibleFraction', () => {
  it('grows with speed and stays in 0–1', () => {
    expect(ribbonTrailVisibleFraction(0)).toBe(0)
    expect(ribbonTrailVisibleFraction(5)).toBeGreaterThan(0)
    expect(ribbonTrailVisibleFraction(5)).toBeLessThan(ribbonTrailVisibleFraction(25))
    expect(ribbonTrailVisibleFraction(100)).toBe(1)
  })
})

describe('ribbonTrailAttenuation', () => {
  it('hides the oldest part outside the visible fraction', () => {
    expect(ribbonTrailAttenuation(0, 0.5)).toBe(0)
    expect(ribbonTrailAttenuation(0.4, 0.5)).toBe(0)
    expect(ribbonTrailAttenuation(1, 0.5)).toBeGreaterThan(0.5)
  })
})

describe('pixelShardScale', () => {
  it('starts full and dies in hard steps', () => {
    expect(pixelShardScale(0)).toBe(PIXEL_SHARD_BASE_SIZE)
    expect(pixelShardScale(1)).toBe(0)
    // Same life band → identical scale (no smooth ramp)
    expect(pixelShardScale(0.1)).toBe(pixelShardScale(0.15))
    expect(PIXEL_SHARD_DISSOLVE_STEPS).toBeGreaterThan(1)
  })

  it('grows with hit mix', () => {
    expect(pixelShardScale(0.1, 1)).toBeGreaterThan(pixelShardScale(0.1, 0))
  })
})

describe('pixelShardAlive', () => {
  it('culls with age for a crumbly dissolve', () => {
    expect(pixelShardAlive(0, 1)).toBe(true)
    expect(pixelShardAlive(0.4, 1)).toBe(false)
    expect(pixelShardAlive(0.4, 0)).toBe(true)
    expect(pixelShardAlive(1, 0)).toBe(false)
  })
})

describe('pixelShardAge01', () => {
  it('maps elapsed time onto 0–1', () => {
    expect(pixelShardAge01(1000, 1000)).toBe(0)
    expect(pixelShardAge01(1000, 1000 + PIXEL_SHARD_LIFETIME_MS)).toBe(1)
    expect(pixelShardAge01(1000, 1000 + PIXEL_SHARD_LIFETIME_MS * 0.5)).toBeCloseTo(0.5, 5)
  })
})
