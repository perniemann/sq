import { describe, it, expect } from 'vitest'
import { COURT } from './court'
import { playerChaseTarget } from './playerChase'

describe('playerChaseTarget', () => {
  it('follows the ball into the front court (negative Z)', () => {
    const [, , z] = playerChaseTarget(0.5, -3.2)
    expect(z).toBeCloseTo(-3.2)
    expect(z).toBeLessThan(COURT.shortLineZ)
  })

  it('follows the ball into the back court', () => {
    const [, , z] = playerChaseTarget(-1.2, 3.5)
    expect(z).toBeCloseTo(3.5)
  })

  it('clamps to the walkable floor, not a short-line gate', () => {
    const [x, y, z] = playerChaseTarget(99, -99)
    expect(y).toBe(0.01)
    expect(Math.abs(x)).toBeLessThan(COURT.width / 2)
    expect(z).toBeGreaterThan(-COURT.length / 2)
    expect(z).toBeLessThan(0)
  })
})
