import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../stores/gameStore'
import { restoreServeReadyFromStore } from './useServeReset'

const store = () => useGameStore.getState()

beforeEach(() => {
  store().resetMatch()
})

describe('restoreServeReadyFromStore', () => {
  it('unblocks serve after a point when the ball body teleport never ran', () => {
    // Softlock repro: awardPointTo clears canHit; resetBallForServe early-returns on
    // null ballRef and never restores it. Store restore must still open the next serve.
    store().awardPointTo('player', 'tin')
    expect(store().phase).toBe('point')
    expect(store().canHit).toBe(false)
    expect(store().pointWinner).toBe('player')

    // Skip resetBallForServe entirely — same outcome as ballRef.current === null.
    restoreServeReadyFromStore()

    const state = store()
    expect(state.phase).toBe('serving')
    expect(state.rallyState).toBe('serving')
    expect(state.canHit).toBe(true)
    expect(state.currentStriker).toBe(state.servingPlayer)
    expect(state.lastHitter).toBeNull()
    expect(state.pointWinner).toBeNull()
    expect(state.pointReason).toBeNull()
  })

  it('hands the striker to the live server after a change of serve', () => {
    useGameStore.setState({
      servingPlayer: 'player',
      serviceBox: 'right',
      currentStriker: 'opponent',
      lastHitter: 'opponent',
    })
    store().awardPointTo('opponent', 'doubleBounce')
    expect(store().servingPlayer).toBe('opponent')
    expect(store().canHit).toBe(false)

    restoreServeReadyFromStore()

    expect(store().servingPlayer).toBe('opponent')
    expect(store().currentStriker).toBe('opponent')
    expect(store().canHit).toBe(true)
    expect(store().phase).toBe('serving')
  })
})
