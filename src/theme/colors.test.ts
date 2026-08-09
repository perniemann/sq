import { describe, it, expect } from 'vitest'
import { HEX } from './colors'

describe('HEX palette', () => {
  it('keeps the Tron neon brand anchors', () => {
    expect(HEX.player).toBe('#00ffff')
    expect(HEX.opponent).toBe('#ff6600')
    expect(HEX.courtLine).toBe(HEX.player)
  })

  it('tints the void away from pure black', () => {
    expect(HEX.void.toLowerCase()).not.toBe('#000000')
    expect(HEX.ink.toLowerCase()).not.toBe('#ffffff')
  })

  it('separates the ball from the opponent orange', () => {
    expect(HEX.ball).not.toBe(HEX.opponent)
  })
})
