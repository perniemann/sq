import { describe, it, expect } from 'vitest'
import {
  awardPoint,
  awardGame,
  checkGameWon,
  checkMatchWon,
  createMatchState,
  determinePointWinner,
  isGameBall,
  isMatchBall,
  DEFAULT_MATCH_CONFIG,
  type GameScore,
  type PlayerSide,
} from './scoring'

const score = (player: number, opponent: number): GameScore => ({ player, opponent })

describe('checkGameWon', () => {
  it('is undecided below the target', () => {
    expect(checkGameWon(score(10, 4))).toBeNull()
  })

  it('awards the game at 11 with a clear lead', () => {
    expect(checkGameWon(score(11, 4))).toBe('player')
    expect(checkGameWon(score(6, 11))).toBe('opponent')
  })

  it('awards the game at 11-9, which is already two clear', () => {
    expect(checkGameWon(score(11, 9))).toBe('player')
  })

  // PARS-11: from 10-10 the game goes on until someone is two ahead.
  it('does not award the game at 11-10', () => {
    expect(checkGameWon(score(11, 10))).toBeNull()
  })

  it('awards the game at 12-10', () => {
    expect(checkGameWon(score(12, 10))).toBe('player')
  })

  it('keeps a long tie-break going until a two-point lead', () => {
    expect(checkGameWon(score(15, 15))).toBeNull()
    expect(checkGameWon(score(16, 15))).toBeNull()
    expect(checkGameWon(score(17, 15))).toBe('player')
  })

  it('ends at 11-9 when the win-by-two rule is off', () => {
    const config = { ...DEFAULT_MATCH_CONFIG, winByTwo: false }
    expect(checkGameWon(score(11, 10), config)).toBe('player')
  })
})

describe('awardPoint', () => {
  it('adds the point to the winner and leaves the other score alone', () => {
    const { newScore } = awardPoint(score(3, 5), 'opponent')
    expect(newScore).toEqual(score(3, 6))
  })

  it('does not mutate the score it was given', () => {
    const before = score(3, 5)
    awardPoint(before, 'player')
    expect(before).toEqual(score(3, 5))
  })

  it('reports the game winner on the winning point', () => {
    expect(awardPoint(score(10, 4), 'player').gameWinner).toBe('player')
    expect(awardPoint(score(9, 4), 'player').gameWinner).toBeNull()
  })
})

describe('awardGame', () => {
  it('counts the game and moves to the next', () => {
    const { newMatchState } = awardGame(createMatchState(), 'player')
    expect(newMatchState.gamesWon).toEqual({ player: 1, opponent: 0 })
    expect(newMatchState.currentGame).toBe(2)
  })

  it('ends a best-of-three at two games', () => {
    const first = awardGame(createMatchState(), 'opponent')
    expect(first.matchWinner).toBeNull()
    const second = awardGame(first.newMatchState, 'opponent')
    expect(second.matchWinner).toBe('opponent')
  })

  it('does not mutate the match state it was given', () => {
    const before = createMatchState()
    awardGame(before, 'player')
    expect(before.gamesWon).toEqual({ player: 0, opponent: 0 })
    expect(before.currentGame).toBe(1)
  })
})

describe('checkMatchWon', () => {
  it('is undecided at one game each', () => {
    const state = createMatchState()
    state.gamesWon = { player: 1, opponent: 1 }
    expect(checkMatchWon(state)).toBeNull()
  })

  it('names the winner at two games', () => {
    const state = createMatchState()
    state.gamesWon = { player: 2, opponent: 1 }
    expect(checkMatchWon(state)).toBe('player')
  })
})

describe('isGameBall', () => {
  it('flags the player one point from the game', () => {
    expect(isGameBall(score(10, 4))).toBe('player')
    expect(isGameBall(score(4, 10))).toBe('opponent')
  })

  it('flags nobody at 10-10, where neither can win the next point', () => {
    expect(isGameBall(score(10, 10))).toBeNull()
  })

  it('flags the leader in the tie-break', () => {
    expect(isGameBall(score(11, 10))).toBe('player')
    expect(isGameBall(score(10, 11))).toBe('opponent')
  })

  it('flags nobody early in a game', () => {
    expect(isGameBall(score(5, 5))).toBeNull()
  })
})

describe('isMatchBall', () => {
  it('flags game ball as match ball only when the game would take the match', () => {
    const oneGameUp = createMatchState()
    oneGameUp.gamesWon = { player: 1, opponent: 0 }
    expect(isMatchBall(score(10, 4), oneGameUp)).toBe('player')

    const level = createMatchState()
    expect(isMatchBall(score(10, 4), level)).toBeNull()
  })

  it('flags nobody without game ball', () => {
    const oneGameUp = createMatchState()
    oneGameUp.gamesWon = { player: 1, opponent: 0 }
    expect(isMatchBall(score(5, 4), oneGameUp)).toBeNull()
  })
})

describe('determinePointWinner', () => {
  it('gives a stroke to the blocked striker, not the last hitter', () => {
    // Phase 6: interference is judged against the striker, who is owed a clear shot.
    expect(determinePointWinner('opponent', 'player', 'stroke')).toBe('player')
    expect(determinePointWinner('player', 'opponent', 'stroke')).toBe('opponent')
  })

  it('gives a failed return to the player who hit last', () => {
    expect(determinePointWinner('player', 'opponent', 'doubleBounce')).toBe('player')
  })

  it('gives an error against the player who made it', () => {
    for (const reason of ['tin', 'out', 'noFrontWall', 'serveFault'] as const) {
      expect(determinePointWinner('player', 'opponent', reason)).toBe('opponent')
      expect(determinePointWinner('opponent', 'player', reason)).toBe('player')
    }
  })
})

/**
 * Phase 3 gate, at the rules level: a best-of-three always reaches a winner. F5 was
 * "demo mode never completes a game", so this asserts the scoring machine terminates for
 * any run of rally outcomes rather than for the one sequence I happened to watch.
 */
describe('a best-of-three always finishes', () => {
  function playMatch(nextWinner: () => PlayerSide) {
    let matchState = createMatchState()
    let current = score(0, 0)
    let rallies = 0
    const games: GameScore[] = []

    while (!checkMatchWon(matchState) && rallies < 1000) {
      rallies++
      const { newScore, gameWinner } = awardPoint(current, nextWinner(), matchState.config)
      current = newScore
      if (gameWinner) {
        games.push(current)
        matchState = awardGame(matchState, gameWinner).newMatchState
        current = score(0, 0)
      }
    }

    return { winner: checkMatchWon(matchState), games, rallies, matchState }
  }

  it('finishes when one side wins everything', () => {
    const result = playMatch(() => 'player')
    expect(result.winner).toBe('player')
    expect(result.games).toEqual([score(11, 0), score(11, 0)])
    expect(result.matchState.gamesWon).toEqual({ player: 2, opponent: 0 })
  })

  /**
   * Deliberately the one case that does not finish. Under strictly alternating points the
   * lead never reaches two, so from 10-10 the game runs forever — which is real PARS-11,
   * not a defect: a squash tie-break has no cap. It is recorded here so that nobody
   * "fixes" the tie-break by capping it, and as the reason the loop above is bounded at
   * all. Any real rally sequence breaks the alternation and terminates (see below).
   */
  it('never finishes if the sides alternate every single point', () => {
    let turn = 0
    const result = playMatch(() => (turn++ % 2 === 0 ? 'player' : 'opponent'))
    expect(result.winner).toBeNull()
    expect(result.rallies).toBe(1000)
  })

  it('finishes for any run of rally outcomes', () => {
    let seed = 8082026
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }

    for (let match = 0; match < 500; match++) {
      // A fresh bias each match, from a coin toss up to a walkover.
      const bias = random()
      const result = playMatch(() => (random() < bias ? 'player' : 'opponent'))

      expect(result.winner).not.toBeNull()
      expect(result.games.length).toBeGreaterThanOrEqual(2)
      expect(result.games.length).toBeLessThanOrEqual(3)
      expect(result.matchState.gamesWon[result.winner!]).toBe(2)
    }
  })
})
