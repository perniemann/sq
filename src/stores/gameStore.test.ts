import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'
import type { GameScore, PlayerSide } from '../systems/scoring'

const store = () => useGameStore.getState()

beforeEach(() => {
  store().resetMatch()
})

describe('resetMatch', () => {
  it('returns everything to the start of a match', () => {
    store().awardPointTo('opponent', 'tin')
    store().resetMatch()

    const state = store()
    expect(state.score).toEqual({ player: 0, opponent: 0 })
    expect(state.matchState.gamesWon).toEqual({ player: 0, opponent: 0 })
    expect(state.matchState.currentGame).toBe(1)
    expect(state.phase).toBe('idle')
    expect(state.servingPlayer).toBe('player')
    expect(state.serviceBox).toBe('right')
    expect(state.pointWinner).toBeNull()
    expect(state.letCalled).toBe(false)
  })
})

describe('setCurrentShotType', () => {
  it('does not notify subscribers when the type is unchanged', () => {
    let calls = 0
    const unsub = useGameStore.subscribe(() => {
      calls += 1
    })
    store().setCurrentShotType('drive')
    const afterFirst = calls
    store().setCurrentShotType('drive')
    expect(calls).toBe(afterFirst)
    store().setCurrentShotType('lob')
    expect(calls).toBe(afterFirst + 1)
    unsub()
  })
})

/**
 * Phase 6 gate: "a let replays the rally without scoring."
 *
 * WSF Rule 8.7 — a let ends the rally with no point, no change of server and no change of
 * service box. The store comment already noted "on a let, serve from same box"; this is
 * what holds it to that.
 */
describe('callLet', () => {
  function midGame() {
    useGameStore.setState({
      score: { player: 6, opponent: 4 },
      servingPlayer: 'opponent',
      serviceBox: 'left',
      phase: 'rally',
      rallyState: 'active',
      currentStriker: 'player',
      lastHitter: 'opponent',
    })
  }

  it('scores nothing', () => {
    midGame()
    store().callLet()
    expect(store().score).toEqual({ player: 6, opponent: 4 })
  })

  it('leaves the serve with the same player, in the same box', () => {
    midGame()
    store().callLet()
    expect(store().servingPlayer).toBe('opponent')
    expect(store().serviceBox).toBe('left')
  })

  it('ends the rally and flags the let, with no point winner or reason', () => {
    midGame()
    useGameStore.setState({ canHit: true })
    store().callLet()
    expect(store().canHit).toBe(false)

    const state = store()
    expect(state.phase).toBe('point')
    expect(state.rallyState).toBe('ended')
    expect(state.letCalled).toBe(true)
    expect(state.pointWinner).toBeNull()
    expect(state.pointReason).toBeNull()
  })

  it('does not advance the game or the match', () => {
    midGame()
    store().callLet()
    expect(store().matchState.gamesWon).toEqual({ player: 0, opponent: 0 })
    expect(store().matchState.currentGame).toBe(1)
  })

  it('clears the strike tracking so the replayed rally starts clean', () => {
    midGame()
    useGameStore.setState({
      firstWallHitSinceStrike: 'sideWall',
      frontWallHitSinceStrike: true,
      floorBouncesSinceStrike: 2,
    })
    store().callLet()

    const state = store()
    expect(state.firstWallHitSinceStrike).toBeNull()
    expect(state.frontWallHitSinceStrike).toBe(false)
    expect(state.floorBouncesSinceStrike).toBe(0)
  })

  /** The HUD reads `letCalled` to show LET, so it has to be dropped as the replay starts. */
  it('stops being flagged once the next rally is set up', () => {
    midGame()
    store().callLet()
    store().clearPointResult()
    expect(store().letCalled).toBe(false)
  })

  it('is cleared by the next real point rather than sticking around', () => {
    midGame()
    store().callLet()
    store().awardPointTo('player', 'tin')
    expect(store().letCalled).toBe(false)
  })
})

describe('awardPointTo', () => {
  it('scores the point and ends the rally', () => {
    store().awardPointTo('player', 'tin')

    const state = store()
    expect(state.score).toEqual({ player: 1, opponent: 0 })
    expect(state.phase).toBe('point')
    expect(state.rallyState).toBe('ended')
    expect(state.pointWinner).toBe('player')
    expect(state.pointReason).toBe('tin')
  })

  it('clears canHit when the rally ends (hygiene until serve reset)', () => {
    useGameStore.setState({ canHit: true })
    store().awardPointTo('player', 'tin')
    expect(store().canHit).toBe(false)
  })

  it('awards a stroke like any other point, to the player given', () => {
    // Who that is comes from `determinePointWinner`, which hands a stroke to the striker.
    useGameStore.setState({ servingPlayer: 'opponent', currentStriker: 'player' })
    store().awardPointTo('player', 'stroke')
    expect(store().score).toEqual({ player: 1, opponent: 0 })
    expect(store().pointReason).toBe('stroke')
  })

  // WSF: a server who wins the rally serves again from the other box.
  it('alternates the service box when the server holds serve', () => {
    useGameStore.setState({ servingPlayer: 'player', serviceBox: 'right' })
    store().awardPointTo('player', 'tin')
    expect(store().servingPlayer).toBe('player')
    expect(store().serviceBox).toBe('left')

    store().awardPointTo('player', 'tin')
    expect(store().serviceBox).toBe('right')
  })

  it('hands the serve over, from the right box, when the receiver wins', () => {
    useGameStore.setState({ servingPlayer: 'player', serviceBox: 'left' })
    store().awardPointTo('opponent', 'tin')
    expect(store().servingPlayer).toBe('opponent')
    expect(store().serviceBox).toBe('right')
  })

  it('flags game ball at 10', () => {
    useGameStore.setState({ score: { player: 9, opponent: 2 } })
    store().awardPointTo('player', 'tin')
    expect(store().gameBallHolder).toBe('player')
  })

  it('ends the game at 11 and clears the ball flags', () => {
    useGameStore.setState({ score: { player: 10, opponent: 2 } })
    store().awardPointTo('player', 'tin')

    const state = store()
    expect(state.phase).toBe('gameOver')
    expect(state.matchState.gamesWon).toEqual({ player: 1, opponent: 0 })
    expect(state.gameBallHolder).toBeNull()
    expect(state.matchBallHolder).toBeNull()
  })

  it('does not end the game at 11-10', () => {
    useGameStore.setState({ score: { player: 10, opponent: 10 } })
    store().awardPointTo('player', 'tin')
    expect(store().phase).toBe('point')
    expect(store().score).toEqual({ player: 11, opponent: 10 })
  })

  it('ends the match on the second game', () => {
    useGameStore.setState({
      score: { player: 10, opponent: 2 },
      matchState: { ...store().matchState, gamesWon: { player: 1, opponent: 0 } },
    })
    store().awardPointTo('player', 'tin')

    const state = store()
    expect(state.phase).toBe('matchOver')
    expect(state.matchState.gamesWon).toEqual({ player: 2, opponent: 0 })
  })
})

describe('startNextGame', () => {
  // WSF: the loser of a game serves first in the next one.
  it('gives the serve to the player who lost the last game', () => {
    useGameStore.setState({ score: { player: 11, opponent: 5 }, phase: 'gameOver' })
    store().startNextGame()

    const state = store()
    expect(state.servingPlayer).toBe('opponent')
    expect(state.currentStriker).toBe('opponent')
    expect(state.score).toEqual({ player: 0, opponent: 0 })
    expect(state.serviceBox).toBe('right')
    expect(state.phase).toBe('serving')
  })

  it('works the other way round too', () => {
    useGameStore.setState({ score: { player: 5, opponent: 11 }, phase: 'gameOver' })
    store().startNextGame()
    expect(store().servingPlayer).toBe('player')
  })
})

/**
 * Phase 3 gate: "demo mode completes a best-of-3 and restarts."
 *
 * This drives the store through the same calls the demo loop makes — award a point per
 * rally, start the next game at `gameOver` — so a match completing is asserted rather
 * than watched. F5 was "demo mode never completes a game"; this is the regression guard.
 */
describe('a match played through the store', () => {
  function playToTheEnd(nextWinner: () => PlayerSide, maxRallies = 1000) {
    const games: GameScore[] = []
    let rallies = 0

    store().resetGame()
    while (store().phase !== 'matchOver' && rallies < maxRallies) {
      rallies++
      store().awardPointTo(nextWinner(), 'tin')

      if (store().phase === 'gameOver') {
        games.push({ ...store().score })
        store().startNextGame()
      }
    }
    if (store().phase === 'matchOver') games.push({ ...store().score })

    return { games, rallies }
  }

  it('reaches matchOver in straight games', () => {
    const { games } = playToTheEnd(() => 'player')

    expect(store().phase).toBe('matchOver')
    expect(store().matchState.gamesWon).toEqual({ player: 2, opponent: 0 })
    expect(games).toEqual([
      { player: 11, opponent: 0 },
      { player: 11, opponent: 0 },
    ])
  })

  it('reaches matchOver from a game down', () => {
    let pointsPlayed = 0
    // Opponent takes the first game, player takes the next two.
    const { games } = playToTheEnd(() => (pointsPlayed++ < 11 ? 'opponent' : 'player'))

    expect(store().phase).toBe('matchOver')
    expect(store().matchState.gamesWon).toEqual({ player: 2, opponent: 1 })
    expect(games).toHaveLength(3)
  })

  it('reaches matchOver for any run of rally outcomes', () => {
    let seed = 5150
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }

    for (let match = 0; match < 200; match++) {
      store().resetMatch()
      const bias = 0.2 + random() * 0.6
      playToTheEnd(() => (random() < bias ? 'player' : 'opponent'))

      expect(store().phase).toBe('matchOver')
      const { gamesWon } = store().matchState
      expect(Math.max(gamesWon.player, gamesWon.opponent)).toBe(2)
    }
  })

  it('restarts cleanly after the match is over', () => {
    playToTheEnd(() => 'player')
    expect(store().phase).toBe('matchOver')

    store().resetMatch()
    expect(store().phase).toBe('idle')
    expect(store().score).toEqual({ player: 0, opponent: 0 })
    expect(store().matchState.gamesWon).toEqual({ player: 0, opponent: 0 })
  })
})

describe('strike tracking', () => {
  beforeEach(() => {
    store().resetStrikeWallTracking()
  })

  /**
   * WSF Rule 6.2.2: a return is good if it reaches the front wall without bouncing on the
   * floor first, whatever else it touches on the way. A side wall before the front wall is
   * a boast, which is legal — F4 was that this counted as an instant loss.
   */
  it('allows a boast off the side wall', () => {
    expect(store().recordFirstWallHit('sideWall')).toBe(false)
    expect(store().recordFirstWallHit('frontWall')).toBe(false)
    expect(store().frontWallHitSinceStrike).toBe(true)
    expect(store().firstWallHitSinceStrike).toBe('sideWall')
  })

  it('calls a floor bounce before the front wall down', () => {
    expect(store().recordFirstWallHit('floor')).toBe(true)
  })

  it('allows the floor once the front wall has been hit', () => {
    store().recordFirstWallHit('frontWall')
    expect(store().recordFirstWallHit('floor')).toBe(false)
  })

  it('counts floor bounces since the strike', () => {
    expect(store().recordFloorBounce()).toBe(1)
    expect(store().recordFloorBounce()).toBe(2)
    store().resetStrikeWallTracking()
    expect(store().recordFloorBounce()).toBe(1)
  })
})
