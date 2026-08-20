import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  ASSIST_DEAD_ZONE,
  ASSIST_MAX_STEP,
  ASSIST_SPEED,
  computePlayerAssist,
  playerAssistNudge,
  type PlayerAssistContext,
} from './playerAssist'
import { RECEIVER_POSITIONS } from './courtPositions'
import { PLAYER_CHASE_SPEED } from './playerChase'

function base(overrides: Partial<PlayerAssistContext> = {}): PlayerAssistContext {
  return {
    playerX: 0,
    playerZ: 1.2,
    ball: new THREE.Vector3(0, 1, -2),
    ballVelocity: new THREE.Vector3(0, 0, 4),
    isStriker: true,
    phase: 'rally',
    servingPlayer: 'opponent',
    serviceBox: 'right',
    isChasing: false,
    isRecovering: false,
    isSwinging: false,
    holdPosition: false,
    ...overrides,
  }
}

describe('assist vs chase constraint', () => {
  it('keeps soft assist strictly slower than Shift chase', () => {
    expect(ASSIST_SPEED).toBeLessThan(PLAYER_CHASE_SPEED)
  })
})

describe('playerAssistNudge', () => {
  it('stays silent inside the dead zone', () => {
    expect(playerAssistNudge(0, 0, 0.2, 0.2)).toBeNull()
  })

  it('caps the step so a far ideal is only a short pull', () => {
    const nudge = playerAssistNudge(0, 0, 0, 8)
    expect(nudge).not.toBeNull()
    const dist = Math.hypot(nudge![0], nudge![2])
    expect(dist).toBeLessThanOrEqual(ASSIST_MAX_STEP + 1e-6)
    expect(dist).toBeGreaterThan(ASSIST_DEAD_ZONE)
  })
})

describe('computePlayerAssist', () => {
  it('does nothing while Shift-chasing or recovering', () => {
    expect(computePlayerAssist(base({ isChasing: true }))).toBeNull()
    expect(computePlayerAssist(base({ isRecovering: true }))).toBeNull()
  })

  it('nudges a receiver toward the opposite quarter on serve', () => {
    const assist = computePlayerAssist(base({
      phase: 'serving',
      servingPlayer: 'opponent',
      serviceBox: 'right',
      playerX: 0,
      playerZ: 0.8,
    }))
    expect(assist).not.toBeNull()
    expect(assist!.speed).toBe(ASSIST_SPEED)
    // Right-box serve → receive on the left
    expect(assist!.target[0]).toBeLessThan(0)
    expect(RECEIVER_POSITIONS.right.x).toBeLessThan(0)
  })

  it('assists the striker during a rally when offline the pocket', () => {
    const assist = computePlayerAssist(base({
      playerX: 2.5,
      playerZ: 3.5,
      ball: new THREE.Vector3(-1, 0.9, -1),
      ballVelocity: new THREE.Vector3(0, 0, 3),
    }))
    expect(assist).not.toBeNull()
  })
})
