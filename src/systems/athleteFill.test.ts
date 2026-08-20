import { describe, expect, it } from 'vitest'
import {
  ATHLETE_FILL_OPACITY_MAX,
  ATHLETE_FILL_OPACITY_MIN,
  athleteFillAuthoredOpacity,
  athleteFillStrength,
} from './athleteFill'

describe('athleteFillStrength', () => {
  it('is 0 when not charging even if chargeLevel carries shot-power floor', () => {
    expect(athleteFillStrength(false, 0.3)).toBe(0)
    expect(athleteFillStrength(false, 1)).toBe(0)
  })

  it('passes through clamped charge while charging', () => {
    expect(athleteFillStrength(true, 0)).toBe(0)
    expect(athleteFillStrength(true, 0.3)).toBe(0.3)
    expect(athleteFillStrength(true, 1)).toBe(1)
    expect(athleteFillStrength(true, 1.5)).toBe(1)
  })
})

describe('athleteFillAuthoredOpacity', () => {
  it('maps 0 strength to the idle translucent fill', () => {
    expect(athleteFillAuthoredOpacity(0)).toBe(ATHLETE_FILL_OPACITY_MIN)
  })

  it('maps full strength to the dense fill', () => {
    expect(athleteFillAuthoredOpacity(1)).toBe(ATHLETE_FILL_OPACITY_MAX)
  })

  it('lerps mid strength', () => {
    expect(athleteFillAuthoredOpacity(0.5)).toBeCloseTo(
      ATHLETE_FILL_OPACITY_MIN + 0.5 * (ATHLETE_FILL_OPACITY_MAX - ATHLETE_FILL_OPACITY_MIN),
      5,
    )
  })
})
