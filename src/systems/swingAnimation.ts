import * as THREE from 'three'

/**
 * SQUASH SWING ANIMATION SYSTEM
 * 
 * Based on biomechanics research for authentic squash swing animation.
 * Uses quaternion interpolation (slerp) for smooth rotation between keyframes.
 * 
 * Swing phases based on professional squash biomechanics:
 * - Ready: Racquet at waist, slightly forward
 * - Backswing: Racquet high behind shoulder (wrist cocked, body coiled)
 * - Forward: Rapid uncoiling, wrist uncocking
 * - Contact: Full extension, racquet face perpendicular to target
 * - FollowThrough: Continue arc past contact
 * - Recovery: Return to ready position
 */

// ============================================================================
// TYPES
// ============================================================================

export type SwingPhase = 
  | 'ready' 
  | 'backswing' 
  | 'forward' 
  | 'contact' 
  | 'followThrough' 
  | 'recovery'

export type StanceSide = 'forehand' | 'backhand'

export interface SwingKeyframe {
  /** Euler angles for racquet rotation (pitch, yaw, roll) */
  rotation: THREE.Euler
  /** Offset from shoulder pivot point */
  offset: THREE.Vector3
}

export interface SwingPhaseConfig {
  /** Duration of this phase in milliseconds */
  duration: number
  /** Easing function for this phase */
  easing: (t: number) => number
  /** Keyframe at end of this phase */
  keyframe: SwingKeyframe
}

export interface SwingState {
  /** Current phase of the swing */
  phase: SwingPhase
  /** Progress through current phase (0-1) */
  progress: number
  /** Whether swing is active (after charge release) */
  isSwinging: boolean
  /** Whether currently in charge/preparation */
  isCharging: boolean
  /** Charge level (0-1) during charging phase */
  chargeLevel: number
  /** Time when current phase started */
  phaseStartTime: number
  /** Shot side (forehand or backhand) */
  stanceSide: StanceSide
}

export interface RacquetTransform {
  /** World-space offset from player position */
  offset: THREE.Vector3
  /** Rotation quaternion for racquet */
  rotation: THREE.Quaternion
  /** Player body rotation adjustment for stance */
  bodyRotation: number
}

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

/**
 * Easing functions for natural motion
 * Based on Robert Penner's easing equations
 */
export const easing = {
  /** Linear - constant speed */
  linear: (t: number): number => t,
  
  /** Ease out quad - decelerate smoothly (good for backswing end) */
  easeOutQuad: (t: number): number => 1 - (1 - t) * (1 - t),
  
  /** Ease in quad - accelerate smoothly (good for forward swing start) */
  easeInQuad: (t: number): number => t * t,
  
  /** Ease in cubic - stronger acceleration (good for fast forward swing) */
  easeInCubic: (t: number): number => t * t * t,
  
  /** Ease out cubic - smooth deceleration (good for follow-through) */
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  
  /** Ease in out quad - smooth start and end */
  easeInOutQuad: (t: number): number => 
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  
  /** Ease out back - slight overshoot (good for impact feel) */
  easeOutBack: (t: number): number => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
}

// ============================================================================
// PHASE TIMING CONSTANTS
// ============================================================================

/**
 * Phase durations in milliseconds
 * Total swing time from release: ~400ms (fast, responsive)
 */
export const PHASE_DURATIONS = {
  /** Time from charge release to start forward swing */
  backswing: 0,      // Backswing happens during charge - no extra time
  /** Forward swing to contact - fast! */
  forward: 100,
  /** Contact window — kept wide so release timing is forgiving */
  contact: 90,
  /** Follow-through after contact */
  followThrough: 180,
  /** Return to ready position */
  recovery: 250,
} as const

/**
 * Charge phase timing (during button hold)
 * 
 * Quick shot: < 120ms (instant shot, no charge animation)
 * Charged shot: 120-750ms (power scales to smash)
 */
export const CHARGE_PHASE_TIMING = {
  /** Quick shot threshold - taps shorter than this = instant shot */
  quickShot: 120,     // 0-120ms = quick shot
  /** Initial racquet prep phase */
  racquetPrep: 150,   // 120-270ms
  /** Body coil phase */
  bodyCoil: 400,      // 270-520ms
  /** Maximum power ready (smash) */
  powerLoad: 750,     // 520-750ms (caps at 0.75s for smash)
} as const

// ============================================================================
// KEYFRAMES - FOREHAND
// ============================================================================

/**
 * Forehand swing keyframes
 * Racquet swings from right side (for right-handed player)
 * 
 * Coordinate system:
 * - X: left(-) / right(+)
 * - Y: down(-) / up(+)
 * - Z: back(+) / forward(-)
 * 
 * Rotation Euler (applied in XYZ order):
 * - X: pitch (tilt up/down)
 * - Y: yaw (rotate left/right)
 * - Z: roll (twist)
 */
const FOREHAND_KEYFRAMES: Record<SwingPhase, SwingKeyframe> = {
  ready: {
    rotation: new THREE.Euler(0, 0, 0),
    offset: new THREE.Vector3(0.25, 0.5, -0.3),  // Right side, waist height, forward
  },
  backswing: {
    // Racquet high behind right shoulder
    rotation: new THREE.Euler(
      -Math.PI * 0.35,   // Tilt back (pitch up)
      Math.PI * 0.15,    // Rotate outward
      Math.PI * 0.1      // Slight roll
    ),
    offset: new THREE.Vector3(0.45, 0.9, 0.2),  // Right, shoulder height, behind
  },
  forward: {
    // Racquet coming through - mid swing
    rotation: new THREE.Euler(
      -Math.PI * 0.1,    // Coming down
      Math.PI * 0.05,    // Rotating through
      0                   // Leveling
    ),
    offset: new THREE.Vector3(0.35, 0.6, -0.4),  // Moving forward
  },
  contact: {
    // Full extension - racquet face perpendicular to front wall
    rotation: new THREE.Euler(
      0,                  // Level
      0,                  // Straight ahead
      0                   // No roll
    ),
    offset: new THREE.Vector3(0.2, 0.55, -0.7),  // Extended forward
  },
  followThrough: {
    // Continue arc past contact
    rotation: new THREE.Euler(
      Math.PI * 0.2,      // Racquet wraps over
      -Math.PI * 0.15,    // Cross body
      -Math.PI * 0.1      // Roll through
    ),
    offset: new THREE.Vector3(-0.1, 0.7, -0.5),  // Crossed to left side
  },
  recovery: {
    // Return to ready
    rotation: new THREE.Euler(0, 0, 0),
    offset: new THREE.Vector3(0.25, 0.5, -0.3),
  },
}

// ============================================================================
// KEYFRAMES - BACKHAND
// ============================================================================

/**
 * Backhand swing keyframes
 * Racquet swings from left side (for right-handed player)
 * Mirrors forehand with adjustments for backhand mechanics
 */
const BACKHAND_KEYFRAMES: Record<SwingPhase, SwingKeyframe> = {
  ready: {
    rotation: new THREE.Euler(0, 0, 0),
    offset: new THREE.Vector3(-0.25, 0.5, -0.3),  // Left side, waist height
  },
  backswing: {
    // Racquet behind left shoulder
    rotation: new THREE.Euler(
      -Math.PI * 0.4,     // Tilt back (more than forehand)
      -Math.PI * 0.2,     // Rotate inward
      -Math.PI * 0.15     // Roll
    ),
    offset: new THREE.Vector3(-0.5, 0.85, 0.15),  // Left, shoulder height, behind
  },
  forward: {
    rotation: new THREE.Euler(
      -Math.PI * 0.15,
      -Math.PI * 0.05,
      -Math.PI * 0.05
    ),
    offset: new THREE.Vector3(-0.35, 0.6, -0.35),
  },
  contact: {
    rotation: new THREE.Euler(0, 0, 0),
    offset: new THREE.Vector3(-0.15, 0.55, -0.7),  // Extended forward, left side
  },
  followThrough: {
    rotation: new THREE.Euler(
      Math.PI * 0.15,
      Math.PI * 0.2,
      Math.PI * 0.1
    ),
    offset: new THREE.Vector3(0.15, 0.65, -0.45),  // Crossed to right side
  },
  recovery: {
    rotation: new THREE.Euler(0, 0, 0),
    offset: new THREE.Vector3(-0.25, 0.5, -0.3),
  },
}

// ============================================================================
// PHASE CONFIGURATIONS
// ============================================================================

/**
 * Get phase configuration with easing for each phase
 */
export function getPhaseConfig(phase: SwingPhase): { duration: number; easing: (t: number) => number } {
  switch (phase) {
    case 'ready':
      return { duration: 0, easing: easing.linear }
    case 'backswing':
      return { duration: PHASE_DURATIONS.backswing, easing: easing.easeOutQuad }
    case 'forward':
      return { duration: PHASE_DURATIONS.forward, easing: easing.easeInCubic }
    case 'contact':
      return { duration: PHASE_DURATIONS.contact, easing: easing.linear }
    case 'followThrough':
      return { duration: PHASE_DURATIONS.followThrough, easing: easing.easeOutCubic }
    case 'recovery':
      return { duration: PHASE_DURATIONS.recovery, easing: easing.easeInOutQuad }
  }
}

/**
 * Get the next phase in the swing sequence
 */
export function getNextPhase(phase: SwingPhase): SwingPhase {
  switch (phase) {
    case 'ready': return 'backswing'
    case 'backswing': return 'forward'
    case 'forward': return 'contact'
    case 'contact': return 'followThrough'
    case 'followThrough': return 'recovery'
    case 'recovery': return 'ready'
  }
}

/**
 * Get the previous phase in the swing sequence
 */
export function getPreviousPhase(phase: SwingPhase): SwingPhase {
  switch (phase) {
    case 'ready': return 'ready'
    case 'backswing': return 'ready'
    case 'forward': return 'backswing'
    case 'contact': return 'forward'
    case 'followThrough': return 'contact'
    case 'recovery': return 'followThrough'
  }
}

// ============================================================================
// KEYFRAME ACCESS
// ============================================================================

/**
 * Get keyframes for a given stance side
 */
export function getKeyframes(stanceSide: StanceSide): Record<SwingPhase, SwingKeyframe> {
  return stanceSide === 'forehand' ? FOREHAND_KEYFRAMES : BACKHAND_KEYFRAMES
}

/**
 * Get a specific keyframe
 */
export function getKeyframe(phase: SwingPhase, stanceSide: StanceSide): SwingKeyframe {
  const keyframes = getKeyframes(stanceSide)
  return keyframes[phase]
}

// ============================================================================
// INTERPOLATION
// ============================================================================

/**
 * Interpolate between two keyframes using easing
 * 
 * @param from - Starting keyframe
 * @param to - Ending keyframe
 * @param t - Raw progress (0-1)
 * @param easingFn - Easing function to apply
 * @returns Interpolated keyframe values
 */
export function interpolateKeyframes(
  from: SwingKeyframe,
  to: SwingKeyframe,
  t: number,
  easingFn: (t: number) => number
): { rotation: THREE.Quaternion; offset: THREE.Vector3 } {
  // Apply easing to progress
  const easedT = easingFn(Math.max(0, Math.min(1, t)))
  
  // Interpolate rotation using quaternion slerp
  const fromQuat = new THREE.Quaternion().setFromEuler(from.rotation)
  const toQuat = new THREE.Quaternion().setFromEuler(to.rotation)
  const resultQuat = fromQuat.clone().slerp(toQuat, easedT)
  
  // Interpolate offset using vector lerp
  const resultOffset = new THREE.Vector3().lerpVectors(from.offset, to.offset, easedT)
  
  return {
    rotation: resultQuat,
    offset: resultOffset,
  }
}

// ============================================================================
// SWING STATE CALCULATION
// ============================================================================

/**
 * Calculate current swing state based on input state
 * 
 * @param isCharging - Whether charge button is held
 * @param chargeStartTime - When charging started (ms timestamp)
 * @param isSwinging - Whether swing has been triggered (button released)
 * @param swingStartTime - When swing started (ms timestamp)
 * @param ballPosition - Ball world position
 * @param playerPosition - Player world position
 * @returns Current swing state
 */
export function calculateSwingState(
  isCharging: boolean,
  chargeStartTime: number | null,
  isSwinging: boolean,
  swingStartTime: number | null,
  ballPosition: THREE.Vector3,
  playerPosition: THREE.Vector3
): SwingState {
  const now = Date.now()
  
  // Determine stance side based on ball position relative to player
  const stanceSide: StanceSide = ballPosition.x > playerPosition.x ? 'forehand' : 'backhand'
  
  // Not charging or swinging - ready position
  if (!isCharging && !isSwinging) {
    return {
      phase: 'ready',
      progress: 1,
      isSwinging: false,
      isCharging: false,
      chargeLevel: 0,
      phaseStartTime: now,
      stanceSide,
    }
  }
  
  // Currently charging (button held) - backswing phase
  if (isCharging && chargeStartTime !== null) {
    const chargeElapsed = now - chargeStartTime
    
    // Calculate charge level (0-1, max at 0.75s for smash)
    const chargeLevel = Math.min(1, chargeElapsed / CHARGE_PHASE_TIMING.powerLoad)
    
    // Backswing progress based on charge time
    // Quick initial backswing (first 150ms), then hold at full backswing
    const backswingProgress = Math.min(1, chargeElapsed / 150)
    
    return {
      phase: 'backswing',
      progress: backswingProgress,
      isSwinging: false,
      isCharging: true,
      chargeLevel,
      phaseStartTime: chargeStartTime,
      stanceSide,
    }
  }
  
  // Swing in progress (button released)
  if (isSwinging && swingStartTime !== null) {
    const swingElapsed = now - swingStartTime
    
    // Calculate which phase we're in
    let phaseTime = 0
    let currentPhase: SwingPhase = 'forward'
    let phaseProgress = 0
    let phaseStart = swingStartTime
    
    // Forward phase
    if (swingElapsed < PHASE_DURATIONS.forward) {
      currentPhase = 'forward'
      phaseProgress = swingElapsed / PHASE_DURATIONS.forward
      phaseStart = swingStartTime
    }
    // Contact phase
    else if (swingElapsed < PHASE_DURATIONS.forward + PHASE_DURATIONS.contact) {
      currentPhase = 'contact'
      phaseTime = swingElapsed - PHASE_DURATIONS.forward
      phaseProgress = phaseTime / PHASE_DURATIONS.contact
      phaseStart = swingStartTime + PHASE_DURATIONS.forward
    }
    // Follow-through phase
    else if (swingElapsed < PHASE_DURATIONS.forward + PHASE_DURATIONS.contact + PHASE_DURATIONS.followThrough) {
      currentPhase = 'followThrough'
      phaseTime = swingElapsed - PHASE_DURATIONS.forward - PHASE_DURATIONS.contact
      phaseProgress = phaseTime / PHASE_DURATIONS.followThrough
      phaseStart = swingStartTime + PHASE_DURATIONS.forward + PHASE_DURATIONS.contact
    }
    // Recovery phase
    else if (swingElapsed < PHASE_DURATIONS.forward + PHASE_DURATIONS.contact + PHASE_DURATIONS.followThrough + PHASE_DURATIONS.recovery) {
      currentPhase = 'recovery'
      phaseTime = swingElapsed - PHASE_DURATIONS.forward - PHASE_DURATIONS.contact - PHASE_DURATIONS.followThrough
      phaseProgress = phaseTime / PHASE_DURATIONS.recovery
      phaseStart = swingStartTime + PHASE_DURATIONS.forward + PHASE_DURATIONS.contact + PHASE_DURATIONS.followThrough
    }
    // Swing complete - back to ready
    else {
      return {
        phase: 'ready',
        progress: 1,
        isSwinging: false,
        isCharging: false,
        chargeLevel: 0,
        phaseStartTime: now,
        stanceSide,
      }
    }
    
    return {
      phase: currentPhase,
      progress: phaseProgress,
      isSwinging: true,
      isCharging: false,
      chargeLevel: 0,
      phaseStartTime: phaseStart,
      stanceSide,
    }
  }
  
  // Fallback - ready position
  return {
    phase: 'ready',
    progress: 1,
    isSwinging: false,
    isCharging: false,
    chargeLevel: 0,
    phaseStartTime: now,
    stanceSide,
  }
}

// ============================================================================
// MAIN TRANSFORM CALCULATION
// ============================================================================

/**
 * Calculate the racquet transform for the current swing state
 * 
 * @param swingState - Current swing state
 * @param playerRotation - Player's current Y rotation
 * @returns Transform to apply to racquet
 */
export function calculateRacquetTransform(
  swingState: SwingState,
  playerRotation: number
): RacquetTransform {
  const { phase, progress, stanceSide } = swingState
  
  // Get keyframes for this stance
  const keyframes = getKeyframes(stanceSide)
  
  // Get current and previous phase keyframes for interpolation
  const currentKeyframe = keyframes[phase]
  const previousPhase = getPreviousPhase(phase)
  const previousKeyframe = keyframes[previousPhase]
  
  // Get easing for current phase
  const phaseConfig = getPhaseConfig(phase)
  
  // Interpolate between previous and current keyframe
  const interpolated = interpolateKeyframes(
    previousKeyframe,
    currentKeyframe,
    progress,
    phaseConfig.easing
  )
  
  // Apply player rotation to offset (transform to world space)
  const worldOffset = interpolated.offset.clone()
  worldOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation)
  
  // Calculate body rotation adjustment for stance
  // Forehand: rotate slightly toward hitting side
  // Backhand: rotate slightly away
  let bodyRotation = 0
  if (phase !== 'ready' && phase !== 'recovery') {
    if (stanceSide === 'forehand') {
      // Rotate body ~25 degrees toward forehand side during swing
      bodyRotation = Math.PI * 0.14 * Math.min(1, progress * 2)
    } else {
      // Rotate body ~35 degrees for backhand
      bodyRotation = -Math.PI * 0.19 * Math.min(1, progress * 2)
    }
  }
  
  // Combine racquet rotation with player rotation
  const playerQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    playerRotation
  )
  const finalRotation = interpolated.rotation.clone().premultiply(playerQuat)
  
  return {
    offset: worldOffset,
    rotation: finalRotation,
    bodyRotation,
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if swing is in the contact phase (for hit detection).
 * Prefer `isInSwingHitWindow` from `hitTiming.ts` for gameplay strikes.
 */
export function isInContactPhase(swingState: SwingState): boolean {
  return swingState.phase === 'contact' && swingState.isSwinging
}

/**
 * Get total swing duration from release to recovery complete
 */
export function getTotalSwingDuration(): number {
  return (
    PHASE_DURATIONS.forward +
    PHASE_DURATIONS.contact +
    PHASE_DURATIONS.followThrough +
    PHASE_DURATIONS.recovery
  )
}

/**
 * Get duration until contact phase starts
 */
export function getDurationUntilContact(): number {
  return PHASE_DURATIONS.forward
}

/**
 * Get contact phase duration
 */
export function getContactPhaseDuration(): number {
  return PHASE_DURATIONS.contact
}

// Export keyframes for debugging/visualization
export { FOREHAND_KEYFRAMES, BACKHAND_KEYFRAMES }
