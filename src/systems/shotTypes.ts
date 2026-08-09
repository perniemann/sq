/** Facade over shotContext for simpler shot-type API. */
import * as THREE from 'three'
import {
  type ShotType,
  type ShotContext,
  analyzeShotContext,
  selectShotType,
  calculateShot,
  calculateVelocityFromShot,
  type ShotVelocity,
} from './shotContext'
import { calculateHitAccuracy, applyAccuracyToShot } from './hitAccuracy'

const SHOT_DISPLAY_NAMES: Record<ShotType, string> = {
  drive: 'DRIVE',
  crossCourt: 'CROSS-COURT',
  boast: 'BOAST',
  drop: 'DROP',
  lob: 'LOB',
  kill: 'KILL',
}

export type { ShotType, ShotVelocity }

export interface ShotConfig {
  displayName: string
}

/** Uses player/ball positions, default rotation 0, charge 0.5, and hit accuracy. */
export function detectShotType(params: {
  playerPosition: THREE.Vector3
  ballPosition: THREE.Vector3
  playerRotation?: number
  chargePower?: number
}): ShotType {
  const { playerPosition, ballPosition } = params
  const playerRotation = params.playerRotation ?? 0
  const chargePower = params.chargePower ?? 0.5

  const hitAccuracyResult = calculateHitAccuracy(
    playerPosition,
    playerRotation,
    ballPosition
  )
  const context: ShotContext = analyzeShotContext(
    playerPosition,
    ballPosition,
    playerRotation,
    chargePower,
    hitAccuracyResult.accuracy
  )
  return selectShotType(context)
}

/**
 * Get display config for a shot type.
 */
export function getShotConfig(shotType: ShotType): ShotConfig {
  return { displayName: SHOT_DISPLAY_NAMES[shotType] }
}

/** Speed a cleanly struck rally shot leaves the racquet at, before shot-type scaling. */
const BASE_SHOT_SPEED = 22

export interface ExecutedShot extends ShotVelocity {
  /** The shot type that produced this velocity, derived from the same context. */
  type: ShotType
}

/**
 * The velocity a rally strike gives the ball, including hit-accuracy penalties.
 *
 * Returns the shot type it actually used rather than taking one, so the name the HUD
 * shows cannot drift from the physics that was applied.
 */
export function calculateShotVelocity(
  power: number,
  playerPosition: THREE.Vector3,
  ballPosition: THREE.Vector3,
  playerRotation = 0
): ExecutedShot {
  const hitAccuracyResult = calculateHitAccuracy(
    playerPosition,
    playerRotation,
    ballPosition
  )

  const context: ShotContext = analyzeShotContext(
    playerPosition,
    ballPosition,
    playerRotation,
    power,
    hitAccuracyResult.accuracy
  )
  const shot = calculateShot(context)
  const { direction, speed } = calculateVelocityFromShot(shot, BASE_SHOT_SPEED)

  // Accuracy both scales the shot down and deviates its heading. Applied to the unit
  // direction, the result's length is the accuracy power factor.
  const { modifiedVector } = applyAccuracyToShot(direction, hitAccuracyResult.accuracy)
  const accuracyPowerFactor = modifiedVector.length()

  return {
    type: shot.type,
    direction: modifiedVector.normalize(),
    speed: speed * accuracyPowerFactor,
  }
}
