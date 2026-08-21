import { describe, it, expect } from 'vitest'
import { HEX } from './colors'

describe('HEX palette', () => {
  it('keeps cool/warm identity accents and a white court substrate', () => {
    expect(HEX.player).toBe('#1ad9e8')
    expect(HEX.opponent).toBe('#f06e14')
    expect(HEX.courtLine).toBe('#f2f4f5')
    expect(HEX.courtLine).not.toBe(HEX.player)
  })

  it('avoids pure-spectrum AI cyan/orange defaults', () => {
    expect(HEX.player.toLowerCase()).not.toBe('#00ffff')
    expect(HEX.opponent.toLowerCase()).not.toBe('#ff6600')
    expect(HEX.tinDanger).toBe(HEX.opponent)
  })

  it('tints the void away from pure black', () => {
    expect(HEX.void.toLowerCase()).not.toBe('#000000')
    expect(HEX.ink.toLowerCase()).not.toBe('#ffffff')
  })

  it('separates the ball from the opponent orange', () => {
    expect(HEX.ball).not.toBe(HEX.opponent)
  })
})
