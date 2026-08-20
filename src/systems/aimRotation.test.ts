import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  AIM_ARC_RANGE,
  AIM_DIRECTION,
  AIM_NEUTRAL,
  AIM_PREVIEW_LOFT_SCALE,
  AIM_START_ANGLE,
  MIN_FORWARD_Z_CENTRE,
  aimPreviewDirection,
  aimToDriveDirection,
  aimToFloorNeedleTheta,
  aimToPlayerRotation,
  chargeRingHintActivation,
  chargeRingHintPoses,
  firstVerticalWallAlongRay,
  floorNeedlePose,
  foldAimForRally,
  foldAimIntoFrontHemisphere,
} from './aimRotation'
import {
  serveBallWorldPosition,
  serveHorizontalFromAim,
  serveLoftFromStick,
} from './serveRules'
import { LOFT_VERTICAL_SCALE } from './shotContext'

describe('aimToPlayerRotation', () => {
  it('centres the 180° cone on the front wall', () => {
    expect(AIM_ARC_RANGE).toBeCloseTo(Math.PI, 8)
    expect(aimToPlayerRotation(AIM_NEUTRAL)).toBeCloseTo(0, 8)
    expect(aimToPlayerRotation(0)).toBeCloseTo(AIM_START_ANGLE, 8)
    expect(aimToPlayerRotation(1)).toBeCloseTo(
      AIM_START_ANGLE + AIM_ARC_RANGE * AIM_DIRECTION,
      8,
    )
  })

  it('steers the ball toward court right as aim increases (drag right → +X)', () => {
    const left = aimToDriveDirection(0)
    const centre = aimToDriveDirection(AIM_NEUTRAL)
    const right = aimToDriveDirection(1)

    expect(left.x).toBeLessThan(centre.x)
    expect(right.x).toBeGreaterThan(centre.x)
    expect(left.x).toBeLessThan(0)
    expect(right.x).toBeGreaterThan(0)
    expect(centre.z).toBeLessThan(0)
  })

  it('keeps centre aims strongly front-wall-first', () => {
    expect(aimToDriveDirection(AIM_NEUTRAL).z).toBeLessThan(-0.9)
  })

  it('allows extreme aims into the side-wall-first corridor', () => {
    const left = aimToDriveDirection(0)
    const right = aimToDriveDirection(1)
    expect(left.z).toBeLessThan(0)
    expect(right.z).toBeLessThan(0)
    // Shallower forward than a centre drive; lateral dominates (boast corridor).
    expect(Math.abs(left.z)).toBeLessThan(MIN_FORWARD_Z_CENTRE)
    expect(Math.abs(right.z)).toBeLessThan(MIN_FORWARD_Z_CENTRE)
    expect(Math.abs(left.x)).toBeGreaterThan(Math.abs(left.z))
    expect(Math.abs(right.x)).toBeGreaterThan(Math.abs(right.z))
  })
})

describe('foldAimForRally', () => {
  it('sends a behind-the-player aim to the opposing front corner', () => {
    const folded = foldAimForRally(new THREE.Vector3(-0.8, 0.1, 0.6), 'rally')
    expect(folded.z).toBeLessThan(0)
    expect(folded.x).toBeGreaterThan(0)
    expect(folded.length()).toBeCloseTo(1, 5)
  })

  it('keeps pure sideways lateral sign while allowing a shallow forward', () => {
    const left = foldAimForRally(new THREE.Vector3(-1, 0, 0), 'rally')
    expect(left.x).toBeLessThan(0)
    expect(left.z).toBeLessThan(0)
    expect(Math.abs(left.z)).toBeLessThan(MIN_FORWARD_Z_CENTRE)
    expect(left.length()).toBeCloseTo(1, 5)
  })

  it('frontOnly mode still pulls sideways aims harder forward than rally', () => {
    const rally = foldAimForRally(new THREE.Vector3(-1, 0, 0), 'rally')
    const front = foldAimIntoFrontHemisphere(new THREE.Vector3(-1, 0, 0))
    expect(Math.abs(front.z)).toBeGreaterThan(Math.abs(rally.z))
    expect(front.z).toBeLessThan(-0.25)
  })
})

describe('firstVerticalWallAlongRay / vacuum acceptance', () => {
  it('centre drive from mid-court hits the front wall first', () => {
    const dir = aimToDriveDirection(AIM_NEUTRAL)
    const hit = firstVerticalWallAlongRay(0, 1.5, dir.x, dir.z)
    expect(hit).toBe('front')
  })

  it('extreme left aim from mid-court hits the left side wall first', () => {
    const dir = aimToDriveDirection(0)
    const hit = firstVerticalWallAlongRay(0, 1.5, dir.x, dir.z)
    expect(hit).toBe('left')
  })

  it('extreme right aim from mid-court hits the right side wall first', () => {
    const dir = aimToDriveDirection(1)
    const hit = firstVerticalWallAlongRay(0, 1.5, dir.x, dir.z)
    expect(hit).toBe('right')
  })
})

describe('serve vacuum — front-wall-first (not rally fold)', () => {
  it('extreme aim from either service box still hits the front wall first', () => {
    for (const box of ['left', 'right'] as const) {
      const pose = serveBallWorldPosition(box)
      for (const aim of [0, 0.5, 1] as const) {
        const dir = new THREE.Vector3(
          serveHorizontalFromAim(box, aim),
          serveLoftFromStick(0.5),
          -1,
        ).normalize()
        const hit = firstVerticalWallAlongRay(pose.x, pose.z, dir.x, dir.z)
        expect(hit, `${box} aim=${aim}`).toBe('front')
      }
    }
  })
})

describe('chargeRingHintPoses', () => {
  it('places soft LOB / STRAIGHT / SMASH / BOAST without snap zones', () => {
    const poses = chargeRingHintPoses({
      aimLabelR: 2,
      loftRailX: -1.5,
      loftHalf: 1,
    })
    const ids = poses.map((p) => p.id)
    expect(ids).toContain('LOB')
    expect(ids).toContain('STRAIGHT')
    expect(ids).toContain('SMASH')
    expect(ids.filter((id) => id === 'BOAST')).toHaveLength(2)

    const straight = poses.find((p) => p.id === 'STRAIGHT')!
    expect(straight.x).toBeCloseTo(0, 5)
    expect(straight.y).toBeGreaterThan(0)

    const lob = poses.find((p) => p.id === 'LOB')!
    const smash = poses.find((p) => p.id === 'SMASH')!
    expect(lob.y).toBeGreaterThan(smash.y)
    expect(lob.x).toBeCloseTo(-1.5, 5)
  })
})

describe('chargeRingHintActivation', () => {
  it('lights STRAIGHT at centre aim and neither loft extreme at neutral', () => {
    const a = chargeRingHintActivation(AIM_NEUTRAL, AIM_NEUTRAL)
    expect(a.straight).toBe(true)
    expect(a.boastLeft).toBe(false)
    expect(a.boastRight).toBe(false)
    expect(a.lob).toBe(false)
    expect(a.smash).toBe(false)
  })

  it('lights the matching BOAST side at extreme aim without snapping', () => {
    expect(chargeRingHintActivation(0, AIM_NEUTRAL).boastLeft).toBe(true)
    expect(chargeRingHintActivation(0, AIM_NEUTRAL).straight).toBe(false)
    expect(chargeRingHintActivation(1, AIM_NEUTRAL).boastRight).toBe(true)
    expect(chargeRingHintActivation(1, AIM_NEUTRAL).straight).toBe(false)
  })

  it('lights LOB / SMASH from loft stick while aim stays independent', () => {
    const lob = chargeRingHintActivation(AIM_NEUTRAL, 1)
    expect(lob.lob).toBe(true)
    expect(lob.smash).toBe(false)
    expect(lob.straight).toBe(true)

    const smash = chargeRingHintActivation(AIM_NEUTRAL, 0)
    expect(smash.smash).toBe(true)
    expect(smash.lob).toBe(false)
    expect(smash.straight).toBe(true)
  })
})

describe('aimPreviewDirection', () => {
  it('stays in the forward hemisphere for every aim / loft sample', () => {
    for (const aim of [0, 0.25, 0.5, 0.75, 1]) {
      for (const loft of [0, 0.5, 1]) {
        const dir = aimPreviewDirection(aim, loft)
        expect(dir.z, `aim=${aim} loft=${loft}`).toBeLessThanOrEqual(0)
        expect(dir.length()).toBeCloseTo(1, 5)
      }
    }
  })

  it('raises the preview when loft increases (from-below stick)', () => {
    const low = aimPreviewDirection(AIM_NEUTRAL, 0)
    const high = aimPreviewDirection(AIM_NEUTRAL, 1)
    expect(high.y).toBeGreaterThan(low.y)
  })

  it('keeps preview loft scale aligned with shot ballistics', () => {
    expect(AIM_PREVIEW_LOFT_SCALE).toBeCloseTo(LOFT_VERTICAL_SCALE, 8)
  })
})

describe('aimToFloorNeedleTheta', () => {
  it('maps left / front / right onto the front semicircle', () => {
    expect(aimToFloorNeedleTheta(0)).toBeCloseTo(Math.PI, 8)
    expect(aimToFloorNeedleTheta(AIM_NEUTRAL)).toBeCloseTo(Math.PI / 2, 8)
    expect(aimToFloorNeedleTheta(1)).toBeCloseTo(0, 8)
  })
})

describe('floorNeedlePose', () => {
  it('offsets the needle into the forward ray only', () => {
    const length = 2
    const front = floorNeedlePose(AIM_NEUTRAL, length)
    expect(front.theta).toBeCloseTo(Math.PI / 2, 8)
    expect(front.x).toBeCloseTo(0, 8)
    expect(front.y).toBeCloseTo(length * 0.5, 8)

    const left = floorNeedlePose(0, length)
    expect(left.x).toBeLessThan(0)
    expect(Math.hypot(left.x, left.y)).toBeCloseTo(length * 0.5, 8)
  })
})
