import { describe, expect, it } from 'vitest'
import {
  BALL_BASE_COLOR,
  BALL_FLASH_OPPONENT,
  BALL_FLASH_PLAYER,
  BALL_HIT_FLASH_BASE_MS,
  BALL_HIT_FLASH_POWER_MS,
  ballHitFlashAccent,
  ballHitFlashColor,
  ballHitFlashDurationMs,
  ballHitFlashMix,
} from './ballHitFlash'

describe('ballHitFlashDurationMs', () => {
  it('scales from base to base+power with intensity', () => {
    expect(ballHitFlashDurationMs(0)).toBe(BALL_HIT_FLASH_BASE_MS)
    expect(ballHitFlashDurationMs(1)).toBe(BALL_HIT_FLASH_BASE_MS + BALL_HIT_FLASH_POWER_MS)
    expect(ballHitFlashDurationMs(0.5)).toBe(
      BALL_HIT_FLASH_BASE_MS + 0.5 * BALL_HIT_FLASH_POWER_MS,
    )
  })

  it('clamps intensity outside 0–1', () => {
    expect(ballHitFlashDurationMs(-1)).toBe(BALL_HIT_FLASH_BASE_MS)
    expect(ballHitFlashDurationMs(2)).toBe(BALL_HIT_FLASH_BASE_MS + BALL_HIT_FLASH_POWER_MS)
  })
})

describe('ballHitFlashMix', () => {
  it('is zero with no hit', () => {
    expect(ballHitFlashMix(null, 1, 1000)).toBe(0)
  })

  it('peaks at intensity just after the hit and decays', () => {
    const hitAt = 1000
    expect(ballHitFlashMix(hitAt, 0.8, hitAt)).toBeCloseTo(0.8, 5)
    const mid = hitAt + ballHitFlashDurationMs(0.8) * 0.5
    expect(ballHitFlashMix(hitAt, 0.8, mid)).toBeLessThan(0.8)
    expect(ballHitFlashMix(hitAt, 0.8, mid)).toBeGreaterThan(0)
  })

  it('is zero at and after the window end', () => {
    const hitAt = 1000
    const end = hitAt + ballHitFlashDurationMs(1)
    expect(ballHitFlashMix(hitAt, 1, end)).toBe(0)
    expect(ballHitFlashMix(hitAt, 1, end + 50)).toBe(0)
  })
})

describe('ballHitFlashColor', () => {
  it('returns base colour at rest', () => {
    expect(ballHitFlashColor(null, 1, 'player', 0)).toBe(BALL_BASE_COLOR)
    expect(ballHitFlashColor(1000, 1, null, 1000)).toBe(BALL_BASE_COLOR)
  })

  it('moves toward player cyan at peak player flash', () => {
    const c = ballHitFlashColor(1000, 1, 'player', 1000)
    expect(c).not.toBe(BALL_BASE_COLOR)
    expect(ballHitFlashAccent('player')).toBe(BALL_FLASH_PLAYER)
    // Full intensity at t=0 → full lerp to accent
    expect(c).toBe(BALL_FLASH_PLAYER)
  })

  it('moves toward opponent hot accent at peak opponent flash', () => {
    expect(ballHitFlashColor(1000, 1, 'opponent', 1000)).toBe(BALL_FLASH_OPPONENT)
  })

  it('soft hits stay closer to the base colour than hard hits', () => {
    const soft = ballHitFlashColor(1000, 0.2, 'player', 1000)
    const hard = ballHitFlashColor(1000, 1, 'player', 1000)
    expect(soft).not.toBe(hard)
    expect(hard).toBe(BALL_FLASH_PLAYER)
  })
})
