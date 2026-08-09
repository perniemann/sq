import * as THREE from 'three'

/**
 * HIT ACCURACY SYSTEM
 * 
 * Based on the geometry diagram showing:
 * - Circular hit zone in front of player
 * - Center of zone = 100% accuracy
 * - Edge of zone = 0% accuracy
 * - Accuracy affects both power and direction
 * 
 * The hit zone represents the optimal area where the ball can be struck.
 * Hitting closer to the center results in cleaner, more powerful shots.
 * Hitting at the edges results in mis-hits with reduced power and deviation.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Hit zone configuration
 * 
 * The hit zone is a circle positioned in front of the player.
 * Based on the geometry diagram, the zone center aligns with the racquet
 * contact position from swing animation (0, 0.55, -0.85).
 */
export const HIT_ZONE_CONFIG = {
  /** Forward offset from player position to zone center (meters) 
   * Matches racquet contact offset Z = -0.85 */
  forwardOffset: 0.85,
  
  /** Vertical offset (height) from player origin to zone center (meters)
   * Matches racquet contact offset Y = 0.55 */
  heightOffset: 0.55,
  
  /** Radius of the hit zone (meters) - balls within this radius can be hit */
  radius: 1.45,
  
  /** Inner "sweet spot" radius for perfect accuracy (meters) — arcade-wide */
  sweetSpotRadius: 0.6,
  
  /** Minimum accuracy (even at edge of zone) */
  minAccuracy: 0.0,
  
  /** Maximum accuracy (at center/sweet spot) */
  maxAccuracy: 1.0,
} as const

/**
 * Accuracy effect configuration
 * 
 * How accuracy affects shot properties
 */
export const ACCURACY_EFFECTS = {
  /** Minimum power multiplier at 0% accuracy — keep edge contacts rally-viable */
  minPowerMultiplier: 0.6,
  
  /** Maximum power multiplier at 100% accuracy */
  maxPowerMultiplier: 1.0,
  
  /** Maximum direction deviation at 0% accuracy (radians) — ~15°; charge/aim still steer */
  maxDirectionDeviation: Math.PI / 12,
  
  /** Minimum direction deviation at 100% accuracy (radians) */
  minDirectionDeviation: 0,
} as const

// ============================================================================
// TYPES
// ============================================================================

export interface HitAccuracyResult {
  /** Accuracy value (0-1, where 1 is perfect center hit) */
  accuracy: number
  
  /** Distance from ball to zone center (meters) */
  distanceFromCenter: number
  
  /** Whether the ball is within the hittable zone */
  isInZone: boolean
  
  /** Power multiplier to apply (0.3-1.0) */
  powerMultiplier: number
  
  /** Direction deviation to apply (radians) */
  directionDeviation: number
  
  /** Hit zone center position (for debug visualization) */
  zoneCenterWorld: THREE.Vector3
}

export interface ShotModifiers {
  /** Power multiplier (0.3-1.0) */
  powerMultiplier: number
  
  /** Horizontal angle deviation (radians, can be negative or positive) */
  horizontalDeviation: number
  
  /** Vertical angle deviation (radians, can be negative or positive) */
  verticalDeviation: number
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/** Racquet vertical reach limits (must match swingAnimation.ts) */
const RACQUET_REACH_LIMITS = {
  minHeight: 0.1,   // Ankle level
  maxHeight: 2.0,   // Overhead
} as const

/**
 * Calculate the hit zone center in world space
 * 
 * The hit zone follows the ball's height within realistic reach limits,
 * enabling hits at any height from ankle level to overhead.
 * 
 * @param playerPosition - Player world position
 * @param playerRotation - Player Y rotation in radians (facing direction)
 * @param ballHeight - Ball Y position for dynamic height tracking (defaults to config height)
 * @returns Hit zone center position in world space
 */
export function calculateHitZoneCenter(
  playerPosition: THREE.Vector3,
  playerRotation: number,
  ballHeight: number = HIT_ZONE_CONFIG.heightOffset
): THREE.Vector3 {
  // Calculate forward vector based on player rotation
  // Player rotation 0 = facing negative Z (toward front wall)
  const forward = new THREE.Vector3(
    Math.sin(playerRotation),
    0,
    -Math.cos(playerRotation)
  )
  
  // Clamp ball height to realistic reach limits (ankle to overhead)
  const clampedHeight = Math.max(
    RACQUET_REACH_LIMITS.minHeight,
    Math.min(RACQUET_REACH_LIMITS.maxHeight, ballHeight)
  )
  
  // Zone center = player position + forward offset + clamped ball height
  const zoneCenter = playerPosition.clone()
  zoneCenter.add(forward.multiplyScalar(HIT_ZONE_CONFIG.forwardOffset))
  zoneCenter.y = playerPosition.y + clampedHeight
  
  return zoneCenter
}

/**
 * Calculate hit accuracy based on ball position relative to hit zone
 * 
 * The hit zone automatically tracks the ball's height, so accuracy is
 * calculated based on horizontal distance and how centered the ball is
 * in front of the player.
 * 
 * @param playerPosition - Player world position
 * @param playerRotation - Player Y rotation in radians
 * @param ballPosition - Ball world position
 * @returns Hit accuracy result with all calculated values
 */
export function calculateHitAccuracy(
  playerPosition: THREE.Vector3,
  playerRotation: number,
  ballPosition: THREE.Vector3
): HitAccuracyResult {
  // Calculate zone center in world space, tracking ball height
  const zoneCenterWorld = calculateHitZoneCenter(playerPosition, playerRotation, ballPosition.y)
  
  // Calculate distance from ball to zone center
  const distanceFromCenter = ballPosition.distanceTo(zoneCenterWorld)
  
  // Check if ball is within hittable zone
  const isInZone = distanceFromCenter <= HIT_ZONE_CONFIG.radius
  
  // Calculate accuracy based on distance
  // Sweet spot (inner radius) = 100% accuracy
  // Edge of zone = 0% accuracy
  // Linear falloff between sweet spot and edge
  let accuracy: number
  
  if (distanceFromCenter <= HIT_ZONE_CONFIG.sweetSpotRadius) {
    // In sweet spot - perfect accuracy
    accuracy = HIT_ZONE_CONFIG.maxAccuracy
  } else if (distanceFromCenter >= HIT_ZONE_CONFIG.radius) {
    // Outside zone - minimum accuracy
    accuracy = HIT_ZONE_CONFIG.minAccuracy
  } else {
    // Linear interpolation between sweet spot and edge
    const effectiveDistance = distanceFromCenter - HIT_ZONE_CONFIG.sweetSpotRadius
    const effectiveRange = HIT_ZONE_CONFIG.radius - HIT_ZONE_CONFIG.sweetSpotRadius
    const falloffProgress = effectiveDistance / effectiveRange
    accuracy = HIT_ZONE_CONFIG.maxAccuracy * (1 - falloffProgress)
  }
  
  // Clamp accuracy to valid range
  accuracy = Math.max(HIT_ZONE_CONFIG.minAccuracy, Math.min(HIT_ZONE_CONFIG.maxAccuracy, accuracy))
  
  // Calculate power multiplier (linear interpolation)
  const powerMultiplier = ACCURACY_EFFECTS.minPowerMultiplier + 
    accuracy * (ACCURACY_EFFECTS.maxPowerMultiplier - ACCURACY_EFFECTS.minPowerMultiplier)
  
  // Calculate direction deviation (inverse of accuracy)
  const directionDeviation = ACCURACY_EFFECTS.maxDirectionDeviation * (1 - accuracy)
  
  return {
    accuracy,
    distanceFromCenter,
    isInZone,
    powerMultiplier,
    directionDeviation,
    zoneCenterWorld,
  }
}

/**
 * Apply accuracy modifiers to a shot vector
 *
 * Scales the vector by the accuracy power multiplier and deviates its heading. The
 * vector is unit-agnostic: pass a unit direction and the result's length is the power
 * factor, or pass a scaled vector and the factor is folded in.
 *
 * @param baseVector - The base shot vector (direction, optionally already scaled)
 * @param accuracy - Accuracy value (0-1)
 * @returns Modified vector with accuracy effects applied
 */
export function applyAccuracyToShot(
  baseVector: THREE.Vector3,
  accuracy: number
): { modifiedVector: THREE.Vector3; modifiers: ShotModifiers } {
  // Calculate power multiplier
  const powerMultiplier = ACCURACY_EFFECTS.minPowerMultiplier + 
    accuracy * (ACCURACY_EFFECTS.maxPowerMultiplier - ACCURACY_EFFECTS.minPowerMultiplier)
  
  // Calculate maximum deviation for this accuracy level
  const maxDeviation = ACCURACY_EFFECTS.maxDirectionDeviation * (1 - accuracy)
  
  // Generate random deviation angles (both horizontal and vertical)
  // Use gaussian-like distribution for more realistic feel (center-weighted)
  const randomFactor1 = (Math.random() + Math.random() + Math.random()) / 3 - 0.5 // -0.5 to 0.5, center-weighted
  const randomFactor2 = (Math.random() + Math.random() + Math.random()) / 3 - 0.5
  
  const horizontalDeviation = randomFactor1 * 2 * maxDeviation
  const verticalDeviation = randomFactor2 * maxDeviation * 0.5 // Less vertical deviation
  
  // Apply power multiplier
  const scaledVector = baseVector.clone().multiplyScalar(powerMultiplier)
  
  // Apply direction deviation using rotation
  // Horizontal deviation (around Y axis)
  const horizontalRotation = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    horizontalDeviation
  )
  
  // Vertical deviation (around horizontal axis perpendicular to the shot direction)
  const shotHorizontal = new THREE.Vector3(scaledVector.x, 0, scaledVector.z).normalize()
  const verticalAxis = new THREE.Vector3().crossVectors(shotHorizontal, new THREE.Vector3(0, 1, 0))
  const verticalRotation = new THREE.Quaternion().setFromAxisAngle(verticalAxis, verticalDeviation)
  
  // Apply rotations
  const modifiedVector = scaledVector.clone()
  modifiedVector.applyQuaternion(horizontalRotation)
  modifiedVector.applyQuaternion(verticalRotation)
  
  return {
    modifiedVector,
    modifiers: {
      powerMultiplier,
      horizontalDeviation,
      verticalDeviation,
    },
  }
}

/**
 * Get a descriptive label for accuracy level
 * 
 * @param accuracy - Accuracy value (0-1)
 * @returns Human-readable accuracy label
 */
export function getAccuracyLabel(accuracy: number): string {
  if (accuracy >= 0.9) return 'PERFECT'
  if (accuracy >= 0.7) return 'CLEAN'
  if (accuracy >= 0.5) return 'GOOD'
  if (accuracy >= 0.3) return 'WEAK'
  return 'MIS-HIT'
}

/**
 * Get color for accuracy visualization
 * 
 * @param accuracy - Accuracy value (0-1)
 * @returns Hex color string
 */
export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 0.8) return '#00ff00' // Green - excellent
  if (accuracy >= 0.5) return '#ffff00' // Yellow - good
  if (accuracy >= 0.3) return '#ff8800' // Orange - weak
  return '#ff0000' // Red - mis-hit
}

// ============================================================================
// POSITIONING FUNCTIONS
// ============================================================================

/**
 * Calculate optimal player position to hit the ball
 * 
 * The player should position themselves so the ball is in their hit zone,
 * NOT stand directly at the ball position.
 * 
 * Strategy:
 * - Base: Face toward the ball (natural approach)
 * - When charging: Blend in charge rotation to account for shot direction
 * 
 * @param ballPosition - Ball world position (where we want hit zone to be)
 * @param playerPosition - Current player position (for direction calculation)
 * @param chargeRotation - Current charge rotation in radians (0 to ~3.49 for 200°)
 * @param isCharging - Whether player is currently charging
 * @returns Optimal position for player to stand
 */
export function calculateOptimalHitPosition(
  ballPosition: THREE.Vector3,
  playerPosition: THREE.Vector3,
  chargeRotation: number = 0,
  isCharging: boolean = false
): THREE.Vector3 {
  // Base direction: from player toward ball (so player faces ball)
  const toBall = ballPosition.clone().sub(playerPosition)
  toBall.y = 0
  
  // Calculate base facing angle (angle to look at the ball)
  // atan2(x, -z) gives angle where 0 = facing -Z (front wall)
  const baseFacingAngle = Math.atan2(toBall.x, -toBall.z)
  
  // Blend charge rotation when charging
  // This creates dynamic positioning as player charges up
  const effectiveRotation = isCharging 
    ? baseFacingAngle + chargeRotation * 0.5  // Partial blend for smoother feel
    : baseFacingAngle
  
  // Calculate offset direction (opposite of facing direction)
  // Player needs to stand BEHIND where they're looking by forwardOffset distance
  const offsetDir = new THREE.Vector3(
    -Math.sin(effectiveRotation),
    0,
    Math.cos(effectiveRotation)
  )
  
  // Optimal position = ball position + offset (standing behind the ball)
  const optimalPos = ballPosition.clone()
  optimalPos.y = 0.01  // Ground level
  optimalPos.add(offsetDir.multiplyScalar(HIT_ZONE_CONFIG.forwardOffset))
  
  return optimalPos
}

/**
 * Calculate optimal AI position to hit the ball (simplified version)
 * 
 * AI doesn't have charge rotation, so just uses direction toward ball.
 * 
 * @param ballPosition - Ball or intercept position
 * @param aiPosition - Current AI position
 * @returns Optimal position for AI to stand
 */
export function calculateOptimalAIPosition(
  ballPosition: THREE.Vector3,
  aiPosition: THREE.Vector3
): THREE.Vector3 {
  // Direction from AI toward ball
  const toBall = ballPosition.clone().sub(aiPosition)
  toBall.y = 0
  
  // Facing angle toward ball
  const facingAngle = Math.atan2(toBall.x, -toBall.z)
  
  // Offset direction (opposite of facing)
  const offsetDir = new THREE.Vector3(
    -Math.sin(facingAngle),
    0,
    Math.cos(facingAngle)
  )
  
  // Optimal position = ball position + offset
  const optimalPos = ballPosition.clone()
  optimalPos.y = 0.01
  optimalPos.add(offsetDir.multiplyScalar(HIT_ZONE_CONFIG.forwardOffset))
  
  return optimalPos
}
