import * as THREE from 'three'
import { COURT } from './court'
import { foldAimForRally } from './aimRotation'

/**
 * DYNAMIC SHOT CONTEXT SYSTEM
 * 
 * Automatically determines shot type and calculates appropriate angles based on:
 * - Ball height relative to player (low = lob, high = kill)
 * - Player position on court (near walls = boast opportunities)
 * - Hit accuracy (center = clean, edge = mishit)
 * - Player rotation (general aiming direction)
 * 
 * Shot types based on real squash:
 * - Drive: Straight to front wall
 * - Cross-court: Angled across to front wall
 * - Boast: Sidewall first, then front wall
 * - Drop: Soft shot to front corner
 * - Lob: High arc to back court
 * - Kill: Hard downward shot
 */

// ============================================================================
// TYPES
// ============================================================================

export type BallHeight = 'low' | 'medium' | 'high'
export type CourtPosition = 'front' | 'mid' | 'back'
export type NearWall = 'left' | 'right' | 'none'
export type ShotType = 'drive' | 'crossCourt' | 'boast' | 'drop' | 'lob' | 'kill'

export interface ShotContext {
  /** Ball height relative to comfortable hitting zone */
  ballHeight: BallHeight
  /** Player position on court (front/mid/back) */
  courtPosition: CourtPosition
  /** Whether player is near a sidewall */
  nearWall: NearWall
  /** Hit accuracy from hit zone system (0-1) */
  hitAccuracy: number
  /** Player rotation in radians */
  playerRotation: number
  /** Charge power level (0-1) */
  chargePower: number
  /**
   * Player loft stick (0–1). Neutral 0.5 leaves `BASE_SHOT_ANGLES` unchanged;
   * lower → kill/rail bias, higher → lob bias.
   */
  loft: number
  /** Raw ball Y position for precise calculations */
  ballY: number
  /** Raw player X position for sidewall detection */
  playerX: number
  /** Raw player Z position for court zone detection */
  playerZ: number
}

export interface ShotAngles {
  /** Horizontal angle component (left/right deviation) */
  horizontal: number
  /** Vertical angle component (up/down) */
  vertical: number
}

export interface ShotResult {
  /** Detected shot type */
  type: ShotType
  /** Normalized direction vector */
  direction: THREE.Vector3
  /** Power multiplier (0.5-1.5) */
  powerMultiplier: number
  /** Display name for UI/logging */
  displayName: string
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Height thresholds for ball position classification */
const HEIGHT_THRESHOLDS = {
  low: 0.4,      // Below knee - must lift
  high: 1.2,     // Above shoulder - can hit down
} as const

/** Court zone thresholds (Z position) */
const COURT_ZONES = {
  front: -2.0,   // Z < -2.0 = front court
  back: 2.0,     // Z > 2.0 = back court
} as const

/** Distance from sidewall to enable boast shots */
const SIDEWALL_THRESHOLD = 1.2  // meters

/** Base angles for each shot type — verticals kept modest so pace retunes do not roof. */
const BASE_SHOT_ANGLES: Record<ShotType, ShotAngles> = {
  drive: { horizontal: 0, vertical: 0.09 },
  crossCourt: { horizontal: 0.35, vertical: 0.1 },
  boast: { horizontal: 0.9, vertical: 0.12 },
  drop: { horizontal: 0.08, vertical: 0.22 },
  lob: { horizontal: 0.05, vertical: 0.45 },
  kill: { horizontal: 0, vertical: -0.08 },
}

/** Full loft-stick travel (±0.5 from neutral) adds this much pre-normalise Y. */
export const LOFT_VERTICAL_SCALE = 0.55

/** Neutral loft stick — prior auto angles unchanged. */
export const LOFT_NEUTRAL = 0.5

/** Power multipliers for each shot type */
const SHOT_POWER_MULTIPLIERS: Record<ShotType, { base: number; chargeScale: number }> = {
  drive: { base: 0.8, chargeScale: 0.4 },      // 0.8-1.2 based on charge
  crossCourt: { base: 0.75, chargeScale: 0.35 },
  boast: { base: 0.7, chargeScale: 0.3 },
  drop: { base: 0.3, chargeScale: 0.15 },      // Soft shot
  lob: { base: 0.6, chargeScale: 0.25 },
  kill: { base: 0.9, chargeScale: 0.5 },       // Power shot
}

/** Shot type display names */
const SHOT_DISPLAY_NAMES: Record<ShotType, string> = {
  drive: 'DRIVE',
  crossCourt: 'CROSS-COURT',
  boast: 'BOAST',
  drop: 'DROP',
  lob: 'LOB',
  kill: 'KILL',
}

// ============================================================================
// CONTEXT ANALYSIS
// ============================================================================

/**
 * Analyze the current shot context based on player and ball positions
 */
export function analyzeShotContext(
  playerPos: THREE.Vector3,
  ballPos: THREE.Vector3,
  playerRotation: number,
  chargePower: number,
  hitAccuracy: number,
  loft: number = LOFT_NEUTRAL,
): ShotContext {
  // Classify ball height
  let ballHeight: BallHeight = 'medium'
  if (ballPos.y < HEIGHT_THRESHOLDS.low) {
    ballHeight = 'low'
  } else if (ballPos.y > HEIGHT_THRESHOLDS.high) {
    ballHeight = 'high'
  }

  // Classify court position (based on player Z)
  let courtPosition: CourtPosition = 'mid'
  if (playerPos.z < COURT_ZONES.front) {
    courtPosition = 'front'
  } else if (playerPos.z > COURT_ZONES.back) {
    courtPosition = 'back'
  }

  // Check if near sidewall
  const halfWidth = COURT.width / 2
  let nearWall: NearWall = 'none'
  if (playerPos.x > halfWidth - SIDEWALL_THRESHOLD) {
    nearWall = 'right'
  } else if (playerPos.x < -halfWidth + SIDEWALL_THRESHOLD) {
    nearWall = 'left'
  }

  return {
    ballHeight,
    courtPosition,
    nearWall,
    hitAccuracy,
    playerRotation,
    chargePower,
    loft: Math.max(0, Math.min(1, loft)),
    ballY: ballPos.y,
    playerX: playerPos.x,
    playerZ: playerPos.z,
  }
}

// ============================================================================
// SHOT SELECTION
// ============================================================================

/**
 * Determine shot type based on context
 * 
 * Priority:
 * 1. Ball height forces certain shots (low = lob, high = kill opportunity)
 * 2. Court position + rotation enables special shots (boast, drop)
 * 3. Default to drive or cross-court based on rotation
 */
export function selectShotType(context: ShotContext): ShotType {
  const { ballHeight, courtPosition, nearWall, playerRotation, chargePower, loft } = context

  // Normalize rotation to 0-2π range
  const normalizedRotation = ((playerRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

  // Yaw of a −Z forward: +π/2 faces −X (left wall), 3π/2 faces +X (right wall).
  // (Older comments had these swapped — they matched the inverted aim stick, not world ±X.)
  const facingLeft = normalizedRotation > Math.PI / 4 && normalizedRotation < 3 * Math.PI / 4
  const facingRight = normalizedRotation > 5 * Math.PI / 4 && normalizedRotation < 7 * Math.PI / 4

  // LOW BALL: Must lift - lob or drive with upward angle
  if (ballHeight === 'low') {
    // Low ball in back court = defensive lob
    if (courtPosition === 'back') {
      return 'lob'
    }
    // Low ball near sidewall = boast is natural
    if (nearWall !== 'none') {
      return 'boast'
    }
    // Otherwise drive with forced upward angle (handled in angle calculation)
    return 'drive'
  }

  // HIGH BALL: Kill opportunity if in front court
  if (ballHeight === 'high' && courtPosition === 'front') {
    return 'kill'
  }

  // NEAR SIDEWALL + ROTATED TOWARD IT: Boast (before loft bias — wall aim wins over height).
  if (nearWall === 'right' && facingRight) {
    return 'boast'
  }
  if (nearWall === 'left' && facingLeft) {
    return 'boast'
  }

  // Loft stick intent — preview and strike share the same type bias (height ≠ length).
  if (loft >= 0.75 && courtPosition !== 'front') {
    return 'lob'
  }
  if (loft <= 0.25 && ballHeight === 'high') {
    return 'kill'
  }

  // FRONT COURT + soft touch: drop. Floor is `chargeDurationToPower`'s MIN_SHOT_POWER (0.3),
  // so `< 0.3` never fired and every front-court tap read as DRIVE.
  if (courtPosition === 'front' && chargePower <= 0.4) {
    return 'drop'
  }

  // ROTATION-BASED: Cross-court vs drive
  // Angular distance from facing the front wall, so a rotation just under 2π counts as
  // slightly off-centre rather than nearly a full turn. π/8 ≈ aim offset on the 180° cone.
  const rotationFromCenter = Math.min(normalizedRotation, 2 * Math.PI - normalizedRotation)
  if (rotationFromCenter > Math.PI / 8 && rotationFromCenter < 5 * Math.PI / 6) {
    return 'crossCourt'
  }

  // Default: Drive
  return 'drive'
}

// ============================================================================
// ANGLE CALCULATION
// ============================================================================

/**
 * Calculate shot angles based on shot type and context
 */
export function calculateShotAngles(
  shotType: ShotType,
  context: ShotContext
): ShotAngles {
  // Start with base angles for this shot type
  const angles = { ...BASE_SHOT_ANGLES[shotType] }

  // Apply ball height modifiers
  if (context.ballHeight === 'low') {
    // Must lift the ball - increase vertical angle
    angles.vertical += 0.25
    // Prevent downward shots
    angles.vertical = Math.max(angles.vertical, 0.2)
  } else if (context.ballHeight === 'high') {
    // Can hit down - decrease vertical angle
    angles.vertical -= 0.12
    // Kill shots can go negative
    if (shotType !== 'kill') {
      angles.vertical = Math.max(angles.vertical, 0)
    }
  }

  // Aim deviation lives only in `applyAccuracyToShot` (seedable) — no double jitter here.

  // Boast bias in local space; world aim comes from `playerRotation` in `calculateShot`.
  if (shotType === 'boast') {
    if (context.nearWall === 'left') {
      angles.horizontal = -Math.abs(angles.horizontal) - 0.35
    } else if (context.nearWall === 'right') {
      angles.horizontal = Math.abs(angles.horizontal) + 0.35
    }
  }

  // Player loft stick — neutral leaves base + height modifiers alone.
  angles.vertical += (context.loft - LOFT_NEUTRAL) * LOFT_VERTICAL_SCALE

  return angles
}

/**
 * Calculate power multiplier based on shot type and charge
 */
export function calculatePowerMultiplier(
  shotType: ShotType,
  chargePower: number
): number {
  const config = SHOT_POWER_MULTIPLIERS[shotType]
  return config.base + chargePower * config.chargeScale
}

// ============================================================================
// MAIN CALCULATION
// ============================================================================

const UP = new THREE.Vector3(0, 1, 0)

/**
 * Calculate complete shot result from context.
 *
 * `shotType` locks the preview to a type that has already passed the charge-name
 * debounce. Omit it and the type is chosen from the context, which is the strike path.
 */
export function calculateShot(context: ShotContext, shotType?: ShotType): ShotResult {
  const resolvedType = shotType ?? selectShotType(context)

  // Calculate angles
  const angles = calculateShotAngles(resolvedType, context)

  // Calculate power
  const powerMultiplier = calculatePowerMultiplier(resolvedType, context.chargePower)

  // Local aim, yaw by facing, then rally fold (side-wall-first corridor at extremes).
  const direction = foldAimForRally(
    new THREE.Vector3(angles.horizontal, angles.vertical, -1)
      .normalize()
      .applyAxisAngle(UP, context.playerRotation),
    'rally',
  )

  return {
    type: resolvedType,
    direction,
    powerMultiplier,
    displayName: SHOT_DISPLAY_NAMES[resolvedType],
  }
}

// ============================================================================
// VELOCITY CALCULATION
// ============================================================================

export interface ShotVelocity {
  /** Normalized direction the ball leaves the racquet in */
  direction: THREE.Vector3
  /** Speed the ball leaves the racquet at, in m/s */
  speed: number
}

/**
 * Convert a shot result into the velocity the ball leaves the racquet with.
 *
 * A strike replaces the ball's velocity rather than adding to it, so this returns a
 * speed in m/s and not an impulse — the two differ by the ball mass and are easy to
 * confuse, which is why the name says velocity.
 *
 * @param shot - Shot result from calculateShot
 * @param baseSpeed - Base speed in m/s, scaled by the shot type's power multiplier
 */
export function calculateVelocityFromShot(
  shot: ShotResult,
  baseSpeed: number
): ShotVelocity {
  return {
    direction: shot.direction.clone(),
    speed: baseSpeed * shot.powerMultiplier,
  }
}
