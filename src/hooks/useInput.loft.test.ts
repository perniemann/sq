import { describe, expect, it } from 'vitest'
import {
  AIM_DRAG_PX,
  AIM_NEUTRAL,
  LOFT_DRAG_DEADZONE,
  LOFT_NEUTRAL,
  applyAimDrag,
  applyLoftDrag,
} from './useInput'

describe('applyAimDrag', () => {
  it('centres at neutral with no drag', () => {
    expect(applyAimDrag(0)).toBe(AIM_NEUTRAL)
  })

  it('aims right when dragging right', () => {
    expect(applyAimDrag(AIM_DRAG_PX)).toBeCloseTo(1, 5)
    expect(applyAimDrag(AIM_DRAG_PX * 0.5)).toBeGreaterThan(AIM_NEUTRAL)
  })

  it('aims left when dragging left', () => {
    expect(applyAimDrag(-AIM_DRAG_PX)).toBeCloseTo(0, 5)
    expect(applyAimDrag(-AIM_DRAG_PX * 0.5)).toBeLessThan(AIM_NEUTRAL)
  })

  it('clamps to 0–1', () => {
    expect(applyAimDrag(AIM_DRAG_PX * 4)).toBe(1)
    expect(applyAimDrag(-AIM_DRAG_PX * 4)).toBe(0)
  })
})

describe('applyLoftDrag', () => {
  it('stays at neutral inside the deadzone', () => {
    const deadzonePx = LOFT_DRAG_DEADZONE * AIM_DRAG_PX
    expect(applyLoftDrag(0)).toBe(LOFT_NEUTRAL)
    expect(applyLoftDrag(deadzonePx)).toBe(LOFT_NEUTRAL)
    expect(applyLoftDrag(-deadzonePx)).toBe(LOFT_NEUTRAL)
  })

  it('lowers loft when dragging toward the front wall (screen-up = from above)', () => {
    expect(applyLoftDrag(AIM_DRAG_PX)).toBeCloseTo(0, 5)
    expect(applyLoftDrag(AIM_DRAG_PX * 0.7)).toBeLessThan(LOFT_NEUTRAL)
  })

  it('raises loft when dragging toward the camera (screen-down = from below)', () => {
    expect(applyLoftDrag(-AIM_DRAG_PX)).toBeCloseTo(1, 5)
    expect(applyLoftDrag(-AIM_DRAG_PX * 0.7)).toBeGreaterThan(LOFT_NEUTRAL)
  })

  it('clamps to 0–1', () => {
    expect(applyLoftDrag(AIM_DRAG_PX * 4)).toBe(0)
    expect(applyLoftDrag(-AIM_DRAG_PX * 4)).toBe(1)
  })
})
