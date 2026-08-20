import { describe, it, expect } from 'vitest'
import {
  isInStrikeRange,
  isInSwingHitWindow,
  swingTimingQuality,
  combineHitAccuracy,
  STRIKE_RANGE_M,
} from './hitTiming'
import type { SwingState } from './swingAnimation'

function swing(phase: SwingState['phase'], progress: number): SwingState {
  return {
    phase,
    progress,
    isSwinging: true,
    isCharging: false,
    chargeLevel: 0,
    phaseStartTime: 0,
    stanceSide: 'forehand',
  }
}

describe('isInStrikeRange', () => {
  const player = { x: 0, y: 0.01, z: 1 }

  it('allows a high ball that 3D distance would reject', () => {
    const ball = { x: 0.4, y: 1.5, z: 1.1 }
    const d3 = Math.hypot(ball.x - player.x, ball.y - player.y, ball.z - player.z)
    expect(d3).toBeGreaterThan(1.5)
    expect(isInStrikeRange(player, ball)).toBe(true)
  })

  it('rejects a ball outside horizontal reach', () => {
    expect(isInStrikeRange(player, { x: STRIKE_RANGE_M + 0.2, y: 0.8, z: 1 })).toBe(false)
  })

  it('rejects a ball above the reachable band', () => {
    expect(isInStrikeRange(player, { x: 0, y: 3.2, z: 1 })).toBe(false)
  })
})

describe('isInSwingHitWindow', () => {
  it('is open through most of the forward and follow-through', () => {
    expect(isInSwingHitWindow(swing('forward', 0.02))).toBe(false)
    expect(isInSwingHitWindow(swing('forward', 0.05))).toBe(true)
    expect(isInSwingHitWindow(swing('forward', 0.2))).toBe(true)
    expect(isInSwingHitWindow(swing('contact', 0.5))).toBe(true)
    expect(isInSwingHitWindow(swing('followThrough', 0.5))).toBe(true)
    expect(isInSwingHitWindow(swing('followThrough', 0.8))).toBe(true)
    expect(isInSwingHitWindow(swing('followThrough', 0.9))).toBe(false)
    expect(isInSwingHitWindow(swing('recovery', 0.1))).toBe(false)
  })
})

describe('swingTimingQuality / combineHitAccuracy', () => {
  it('peaks at contact and is continuous through the swing', () => {
    expect(swingTimingQuality(swing('contact', 0.5))).toBe(1)
    expect(swingTimingQuality(swing('forward', 1))).toBeGreaterThan(
      swingTimingQuality(swing('forward', 0.1)),
    )
    expect(swingTimingQuality(swing('followThrough', 0.1))).toBeGreaterThan(
      swingTimingQuality(swing('followThrough', 0.9)),
    )
    expect(swingTimingQuality(null)).toBeGreaterThan(0)
    expect(swingTimingQuality(null)).toBeLessThan(1)
  })

  it('pulls spatial accuracy down when timing is poor', () => {
    expect(combineHitAccuracy(1, 1)).toBeCloseTo(1, 5)
    expect(combineHitAccuracy(1, 0)).toBeCloseTo(0.4, 5)
    expect(combineHitAccuracy(0.5, 0.5)).toBeLessThan(combineHitAccuracy(0.5, 1))
  })
})
