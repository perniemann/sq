import { describe, it, expect } from 'vitest'
import { COURT } from './court'
import { RECEIVER_Z, T_POSITION } from './courtPositions'

describe('RECEIVER_Z', () => {
  it('sits halfway between the short line and the back wall', () => {
    const expected = COURT.shortLineZ + (COURT.length / 2 - COURT.shortLineZ) / 2
    expect(RECEIVER_Z).toBeCloseTo(expected, 10)
    expect(RECEIVER_Z).toBeGreaterThan(COURT.shortLineZ)
    expect(RECEIVER_Z).toBeLessThan(COURT.length / 2)
  })
})

describe('T_POSITION', () => {
  it('is just behind the short line on centre', () => {
    expect(T_POSITION.x).toBe(0)
    expect(T_POSITION.z).toBeCloseTo(COURT.shortLineZ + 0.35, 10)
  })
})
