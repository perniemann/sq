import { describe, it, expect } from 'vitest'
import { opponentMatchDifficulty } from './matchDifficulty'

describe('opponentMatchDifficulty', () => {
  it('keeps demo at medium for spectacle', () => {
    expect(opponentMatchDifficulty({
      demoMode: true,
      gamesWonPlayer: 0,
      gamesWonOpponent: 0,
    })).toBe('medium')
  })

  it('opens the first human game on easy', () => {
    expect(opponentMatchDifficulty({
      demoMode: false,
      gamesWonPlayer: 0,
      gamesWonOpponent: 0,
    })).toBe('easy')
  })

  it('ramps to medium after either side wins a game', () => {
    expect(opponentMatchDifficulty({
      demoMode: false,
      gamesWonPlayer: 1,
      gamesWonOpponent: 0,
    })).toBe('medium')
    expect(opponentMatchDifficulty({
      demoMode: false,
      gamesWonPlayer: 0,
      gamesWonOpponent: 1,
    })).toBe('medium')
  })
})
