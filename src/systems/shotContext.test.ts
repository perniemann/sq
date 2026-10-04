import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  calculateShot,
  calculateShotAngles,
  selectShotType,
  LOFT_VERTICAL_SCALE,
  type ShotContext,
} from './shotContext'
import { aimToPlayerRotation } from './aimRotation'

function baseContext(overrides: Partial<ShotContext> = {}): ShotContext {
  return {
    ballHeight: 'medium',
    courtPosition: 'mid',
    nearWall: 'none',
    hitAccuracy: 1,
    playerRotation: 0,
    chargePower: 0.5,
    loft: 0.5,
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

  it('folds a behind-the-player yaw into the opposing front corner', () => {
    const shot = calculateShot(baseContext({ playerRotation: Math.PI }))
    expect(shot.direction.z).toBeLessThan(0)
    // π yaw of a −Z drive points +Z; fold flips lateral to the opposing side.
    expect(shot.direction.x).not.toBeCloseTo(0, 1)
  })

  it('writes the same unit direction into directionOut on repeat', () => {
    const context = baseContext({ playerRotation: 0.2, chargePower: 0.4, loft: 0.7 })
    const fresh = calculateShot(context, 'drive')
    const out = new THREE.Vector3(9, 9, 9)
    const written = calculateShot(context, 'drive', out)

    expect(written.direction).toBe(out)
    expect(out.x).toBeCloseTo(fresh.direction.x, 8)
    expect(out.y).toBeCloseTo(fresh.direction.y, 8)
    expect(out.z).toBeCloseTo(fresh.direction.z, 8)
    expect(out.length()).toBeCloseTo(1, 5)

    const keptX = fresh.direction.x
    out.set(3, 3, 3)
    calculateShot(context, 'drive', out)
    expect(out.x).toBeCloseTo(keptX, 8)
    expect(fresh.direction.x).toBeCloseTo(keptX, 8)
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

  it('picks boast when aimed into the near side wall', () => {
    expect(selectShotType(baseContext({
      nearWall: 'left',
      playerRotation: aimToPlayerRotation(0),
      chargePower: 0.6,
    }))).toBe('boast')
    expect(selectShotType(baseContext({
      nearWall: 'right',
      playerRotation: aimToPlayerRotation(1),
      chargePower: 0.6,
    }))).toBe('boast')
  })

  it('biases lob from high loft stick in mid/back court', () => {
    expect(selectShotType(baseContext({
      courtPosition: 'mid',
      chargePower: 0.6,
      loft: 0.8,
      playerRotation: 0,
    }))).toBe('lob')
  })

  it('biases kill from low loft stick on a high ball', () => {
    expect(selectShotType(baseContext({
      ballHeight: 'high',
      courtPosition: 'mid',
      chargePower: 0.6,
      loft: 0.2,
      playerRotation: 0,
    }))).toBe('kill')
  })

  it('keeps sidewall boast when loft is high but aim faces the wall', () => {
    expect(selectShotType(baseContext({
      nearWall: 'left',
      playerRotation: aimToPlayerRotation(0),
      chargePower: 0.6,
      loft: 0.9,
    }))).toBe('boast')
  })
})

describe('loft stick vertical bias', () => {
  it('leaves drive vertical unchanged at neutral loft', () => {
    const neutral = calculateShotAngles('drive', baseContext({ loft: 0.5 }))
    expect(neutral.vertical).toBeCloseTo(0.09, 5)
  })

  it('raises vertical when loft stick is high', () => {
    const high = calculateShotAngles('drive', baseContext({ loft: 1 }))
    const neutral = calculateShotAngles('drive', baseContext({ loft: 0.5 }))
    expect(high.vertical).toBeGreaterThan(neutral.vertical)
    expect(high.vertical - neutral.vertical).toBeCloseTo(LOFT_VERTICAL_SCALE * 0.5, 5)
  })

  it('lowers vertical when loft stick is low', () => {
    const low = calculateShotAngles('drive', baseContext({ loft: 0 }))
    const neutral = calculateShotAngles('drive', baseContext({ loft: 0.5 }))
    expect(low.vertical).toBeLessThan(neutral.vertical)
  })
})
