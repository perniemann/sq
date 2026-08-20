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
import { combineHitAccuracy } from './hitTiming'

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

/** Uses player/ball positions, default rotation 0, power 0.5, loft 0.5, and hit accuracy. */
export function detectShotType(params: {
  playerPosition: THREE.Vector3
  ballPosition: THREE.Vector3
  playerRotation?: number
  chargePower?: number
  loft?: number
}): ShotType {
  const { playerPosition, ballPosition } = params
  const playerRotation = params.playerRotation ?? 0
  const chargePower = params.chargePower ?? 0.5
  const loft = params.loft ?? 0.5

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
    hitAccuracyResult.accuracy,
    loft,
  )
  return selectShotType(context)
}

/**
 * Get display config for a shot type.
 */
export function getShotConfig(shotType: ShotType): ShotConfig {
  return { displayName: SHOT_DISPLAY_NAMES[shotType] }
}

/**
 * Speed a cleanly struck rally shot leaves the racquet at, before shot-type scaling.
 * Play/demo visual tune: ~1.14× prior 22 m/s. Values near 30–40 sent the ball to the
 * front out-line every exchange; soft taps must not look like smashes.
 */
export const BASE_SHOT_SPEED = 25

/** Prior baseline — AI and docs use the ratio for lockstep pace scaling. */
export const BASE_SHOT_SPEED_LEGACY = 22

export const SHOT_PACE_SCALE = BASE_SHOT_SPEED / BASE_SHOT_SPEED_LEGACY

export interface ExecutedShot extends ShotVelocity {
  /** The shot type that produced this velocity, derived from the same context. */
  type: ShotType
}

export type CalculateShotVelocityOptions = {
  /** Continuous swing timing 0–1; default middling proximity quality. */
  timingQuality?: number
  /** Unit random for aim jitter — inject in tests. */
  rng?: () => number
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
  playerRotation = 0,
  loft = 0.5,
  options: CalculateShotVelocityOptions = {},
): ExecutedShot {
  const timingQuality = options.timingQuality ?? 0.55
  const hitAccuracyResult = calculateHitAccuracy(
    playerPosition,
    playerRotation,
    ballPosition
  )
  const accuracy = combineHitAccuracy(hitAccuracyResult.accuracy, timingQuality)

  const context: ShotContext = analyzeShotContext(
    playerPosition,
    ballPosition,
    playerRotation,
    power,
    accuracy,
    loft,
  )
  const shot = calculateShot(context)
  const { direction, speed } = calculateVelocityFromShot(shot, BASE_SHOT_SPEED)

  // Accuracy both scales the shot down and deviates its heading. Applied to the unit
  // direction, the result's length is the accuracy power factor.
  const { modifiedVector } = applyAccuracyToShot(direction, accuracy, options.rng)
  const accuracyPowerFactor = modifiedVector.length()

  return {
    type: shot.type,
    direction: modifiedVector.normalize(),
    speed: speed * accuracyPowerFactor,
  }
}
