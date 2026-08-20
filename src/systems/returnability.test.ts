import { describe, expect, it } from 'vitest'
import { RETURNABLE_WALL, wallRestoresCanHit } from './returnability'

describe('wallRestoresCanHit', () => {
  it('restores only on the front wall (softlock contract)', () => {
    expect(RETURNABLE_WALL).toBe('frontWall')
    expect(wallRestoresCanHit('frontWall')).toBe(true)
  })

  it('does not restore on side or back walls (boast mid-flight)', () => {
    expect(wallRestoresCanHit('leftWall')).toBe(false)
    expect(wallRestoresCanHit('rightWall')).toBe(false)
    expect(wallRestoresCanHit('backWall')).toBe(false)
  })

  it('does not restore on the floor', () => {
    expect(wallRestoresCanHit('floor')).toBe(false)
  })
})
