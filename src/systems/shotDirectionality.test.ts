import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { ACCURACY_EFFECTS, applyAccuracyToShot } from './hitAccuracy'
import { calculateShotVelocity } from './shotTypes'
import { firstVerticalWallAlongRay } from './aimRotation'
import { calculateAIShot } from './ai'

describe('applyAccuracyToShot', () => {
  it('deviates more on poor accuracy than clean (seeded)', () => {
    const base = new THREE.Vector3(0, 0.1, -1).normalize()
    let i = 0
    const seq = [0.1, 0.9, 0.2, 0.8, 0.3, 0.7, 0.4, 0.6]
    const rng = (): number => seq[i++ % seq.length]

    const poor = applyAccuracyToShot(base, 0, rng)
    i = 0
    const clean = applyAccuracyToShot(base, 1, rng)

    expect(Math.abs(poor.modifiers.horizontalDeviation)).toBeGreaterThan(
      Math.abs(clean.modifiers.horizontalDeviation),
    )
    expect(ACCURACY_EFFECTS.maxDirectionDeviation).toBeCloseTo(Math.PI / 8, 8)
  })
})

describe('calculateShotVelocity timing blend', () => {
  it('keeps a clean mid-court drive front-wall-first', () => {
    const player = new THREE.Vector3(0, 0.01, 1.5)
    const ball = new THREE.Vector3(0, 0.6, 1.2)
    const shot = calculateShotVelocity(0.7, player, ball, 0, 0.5, {
      timingQuality: 1,
      rng: () => 0.5,
    })
    const hit = firstVerticalWallAlongRay(
      ball.x,
      ball.z,
      shot.direction.x,
      shot.direction.z,
    )
    expect(hit).toBe('front')
  })
})

describe('AI front-wall bias', () => {
  it('aims rally shots at the front wall from mid-court', () => {
    const ballPosition = new THREE.Vector3(0.4, 0.7, 1.2)
    const shot = calculateAIShot({
      ballPosition,
      power: 0.6,
      lateralAim: 0.4,
      heightAim: 0.5,
      accuracy: 1,
      lateralMiss: 0,
      heightMiss: 0,
      drop: false,
    })
    const hit = firstVerticalWallAlongRay(
      ballPosition.x,
      ballPosition.z,
      shot.direction.x,
      shot.direction.z,
    )
    expect(hit).toBe('front')
  })
})
