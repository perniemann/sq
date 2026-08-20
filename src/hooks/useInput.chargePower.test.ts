import { describe, expect, it } from 'vitest'
import {
  CHARGE_MOVE_SPEED_SCALE,
  LENGTH_BAND_LABELS,
  MOVEMENT_TIMING,
  MIN_SHOT_POWER,
  POWER_BAND_LEVELS,
  chargeDurationToPower,
} from './useInput'

/** Hold seconds that yield a target power on the charge curve (inverse of chargeDurationToPower). */
function holdSecondsForPower(target: number): number {
  if (target <= MIN_SHOT_POWER) return 0
  const quickShotThreshold = MOVEMENT_TIMING.QUICK_SHOT_THRESHOLD / 1000
  const maxChargeSeconds = MOVEMENT_TIMING.MAX_CHARGE_TIME / 1000
  const chargeRange = maxChargeSeconds - quickShotThreshold
  return (
    quickShotThreshold +
    ((target - MIN_SHOT_POWER) / (1 - MIN_SHOT_POWER)) * chargeRange
  )
}

describe('chargeDurationToPower', () => {
  it('maps taps under the quick threshold to the tap-band floor', () => {
    expect(chargeDurationToPower(0)).toBe(MIN_SHOT_POWER)
    expect(chargeDurationToPower((MOVEMENT_TIMING.QUICK_SHOT_THRESHOLD - 1) / 1000)).toBe(
      MIN_SHOT_POWER
    )
  })

  it('reaches full smash power at max charge time', () => {
    expect(chargeDurationToPower(MOVEMENT_TIMING.MAX_CHARGE_TIME / 1000)).toBe(1)
    expect(chargeDurationToPower(2)).toBe(1)
  })

  it('lands near the drive band at mid charge', () => {
    const midSeconds =
      (MOVEMENT_TIMING.QUICK_SHOT_THRESHOLD +
        (MOVEMENT_TIMING.MAX_CHARGE_TIME - MOVEMENT_TIMING.QUICK_SHOT_THRESHOLD) / 2) /
      1000
    const power = chargeDurationToPower(midSeconds)
    expect(power).toBeGreaterThan(0.5)
    expect(power).toBeLessThan(0.75)
    expect(POWER_BAND_LEVELS[1]).toBe(0.55)
  })

  it('aligns fill fraction with POWER_BAND_LEVELS at known holds', () => {
    for (const level of POWER_BAND_LEVELS) {
      const hold = holdSecondsForPower(level)
      expect(chargeDurationToPower(hold)).toBeCloseTo(level, 5)
    }
    // Ring ticks sit at the same fractions the fill uses — no linear hold/max mismatch.
    expect(POWER_BAND_LEVELS[0]).toBe(MIN_SHOT_POWER)
    expect(chargeDurationToPower(MOVEMENT_TIMING.QUICK_SHOT_THRESHOLD / 1000)).toBe(
      MIN_SHOT_POWER
    )
  })
})

describe('charge feel constants', () => {
  it('keeps move tax between half and full speed', () => {
    expect(CHARGE_MOVE_SPEED_SCALE).toBeGreaterThanOrEqual(0.55)
    expect(CHARGE_MOVE_SPEED_SCALE).toBeLessThanOrEqual(0.7)
  })

  it('exposes three length-band tick levels with player-facing labels', () => {
    expect(POWER_BAND_LEVELS).toEqual([0.3, 0.55, 1.0])
    expect(LENGTH_BAND_LABELS).toEqual(['tap', 'drive', 'length'])
    expect(LENGTH_BAND_LABELS.length).toBe(POWER_BAND_LEVELS.length)
  })
})
