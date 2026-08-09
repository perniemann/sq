import { describe, expect, it } from 'vitest'
import { measureQDescenderPx } from './measureDescender'

describe('measureQDescenderPx', () => {
  it('returns a finite non-negative px depth', () => {
    const px = measureQDescenderPx('800 48px sans-serif')
    expect(Number.isFinite(px)).toBe(true)
    expect(px).toBeGreaterThanOrEqual(0)
  })
})
