import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { calculateShot, selectShotType, type ShotContext } from './shotContext'

function baseContext(overrides: Partial<ShotContext> = {}): ShotContext {
  return {
    ballHeight: 'medium',
    courtPosition: 'mid',
    nearWall: 'none',
    hitAccuracy: 1,
    playerRotation: 0,
    chargePower: 0.5,
    ballY: 0.8,
    playerX: 0,
    playerZ: 1,
    ...overrides,
  }
}

describe('calculateShot aim vs power', () => {
  it('steers the ball with playerRotation at constant power', () => {
    // Stay inside the drive band (|yaw| < π/8) so shot type does not change.
    const neg = calculateShot(baseContext({ playerRotation: -0.3, chargePower: 0.5 }))
    const pos = calculateShot(baseContext({ playerRotation: 0.3, chargePower: 0.5 }))

    // +Y yaw of a front-wall drive moves the heading toward −X (right-hand rule).
    expect(pos.direction.x).toBeLessThan(neg.direction.x)
    expect(neg.powerMultiplier).toBeCloseTo(pos.powerMultiplier, 10)
  })

  it('keeps aim direction when power changes', () => {
    const soft = calculateShot(baseContext({ playerRotation: 0.3, chargePower: 0.2 }))
    const hard = calculateShot(baseContext({ playerRotation: 0.3, chargePower: 0.95 }))

    expect(soft.direction.x).toBeCloseTo(hard.direction.x, 5)
    expect(soft.direction.y).toBeCloseTo(hard.direction.y, 5)
    expect(soft.direction.z).toBeCloseTo(hard.direction.z, 5)
    expect(hard.powerMultiplier).toBeGreaterThan(soft.powerMultiplier)
  })

  it('does not aim the shot toward the back wall', () => {
    const shot = calculateShot(baseContext({ playerRotation: Math.PI }))
    expect(shot.direction.z).toBeLessThanOrEqual(0)
    expect(shot.direction.length()).toBeCloseTo(1, 5)
  })

  it('yaws a front-wall drive about Y', () => {
    const straight = calculateShot(baseContext({ playerRotation: 0 }))
    const yaw = Math.PI / 12
    const yawed = calculateShot(baseContext({ playerRotation: yaw }))
    const expected = straight.direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)

    expect(yawed.direction.x).toBeCloseTo(expected.x, 5)
    expect(yawed.direction.y).toBeCloseTo(expected.y, 5)
    expect(yawed.direction.z).toBeCloseTo(expected.z, 5)
  })
})

describe('selectShotType', () => {
  it('labels a soft front-court touch as drop (min power is 0.3)', () => {
    expect(selectShotType(baseContext({
      courtPosition: 'front',
      chargePower: 0.3,
      playerZ: -2.5,
    }))).toBe('drop')
  })

  it('labels a centred mid-court charge as drive', () => {
    expect(selectShotType(baseContext({
      courtPosition: 'mid',
      chargePower: 0.6,
      playerRotation: 0,
    }))).toBe('drive')
  })

  it('labels a clear aim offset as cross-court', () => {
    expect(selectShotType(baseContext({
      courtPosition: 'mid',
      chargePower: 0.6,
      playerRotation: Math.PI / 6,
    }))).toBe('crossCourt')
  })
})
