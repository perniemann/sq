import * as THREE from 'three'
import { COURT, FRONT_WALL_Z, ATHLETE_INSET } from './court'
import { calculateOptimalAIPosition } from './hitAccuracy'
import { T_POSITION } from './courtPositions'
import { separate } from './interference'

/**
 * AI controller for both sides of a shared squash court.
 *
 * Squash has no net and no halves: both players cover the whole floor, hit off the same
 * front wall and contend for the same T. Turn-taking is carried by `currentStriker` in the
 * game store, not by geography, so nothing here tests which end of the court the ball is
 * in. The striker chases the ball; the non-striker recovers to the T and steps off the
 * striker's line (WSF Rule 8.1 — the striker is owed unobstructed access).
 */

export interface AIConfig {
  difficulty: 'easy' | 'medium' | 'hard'
  reactionDelay: number      // ms before AI starts moving
  moveSpeed: number          // units per second
  accuracy: number           // 0-1, affects return precision
  hitRange: number           // distance at which AI can hit the ball
}

export interface AIState {
  position: THREE.Vector3
  targetPosition: THREE.Vector3 | null
  isMovingToBall: boolean
  lastReactionTime: number
  /**
   * Which side of the T this athlete holds while it is not the striker. Latched rather than
   * derived from position, so it does not flip as the ball wanders across the centre line.
   */
  yieldSide: YieldSide
}

const DIFFICULTY_CONFIGS: Record<AIConfig['difficulty'], Omit<AIConfig, 'difficulty'>> = {
  easy: {
    reactionDelay: 400,      // Slow reaction
    moveSpeed: 4,            // Slow movement
    accuracy: 0.6,           // Less accurate
    hitRange: 0.8            // Smaller hit range
  },
  medium: {
    reactionDelay: 280,      // Extra beat so soft assist can close
    moveSpeed: 6,
    accuracy: 0.75,
    hitRange: 1.0
  },
  hard: {
    reactionDelay: 80,       // Fast reaction
    moveSpeed: 8,            // Fast movement
    accuracy: 0.95,          // Very accurate
    hitRange: 1.2            // Larger hit range
  }
}

const GRAVITY = 9.81

/** Height the athlete aims to meet the ball at: a comfortable mid-thigh drive contact. */
const STRIKE_HEIGHT = 0.7

/** Longest lead extrapolated. Past this, drag and wall rebounds dominate the estimate. */
const MAX_LEAD_TIME = 1.2

/** Below this the ball is effectively dead; walk to it rather than predicting an arc. */
const MIN_TRACKED_SPEED = 0.5

/** Racquet reach, matching `RACQUET_REACH_LIMITS.maxHeight` in `hitAccuracy.ts`. */
const MAX_REACH_HEIGHT = 2.0

/**
 * How far off the T the non-striker steps to clear the striker's line (metres). Has to
 * exceed `INTERFERENCE_RADIUS` in `interference.ts`, or yielding still reads as blocking.
 */
const YIELD_OFFSET = 1.3

/**
 * How far off centre the ball has to come before the non-striker gives up the side of the T
 * it is holding (metres).
 *
 * This was a 0.3 m dead band, which is narrower than the ball's ordinary lateral wander: a
 * straight length crosses it constantly, and every crossing walked the non-striker the full
 * 2 × `YIELD_OFFSET` between yield spots — through the T and through the striker. The
 * threshold is now the yield offset itself, so the ball has to arrive at least as far over as
 * the spot being vacated, and the side is latched in `AIState` rather than re-derived from
 * position each frame.
 */
const YIELD_SWITCH_X = YIELD_OFFSET

/**
 * Create AI configuration from difficulty
 */
export function createAIConfig(difficulty: AIConfig['difficulty']): AIConfig {
  return {
    difficulty,
    ...DIFFICULTY_CONFIGS[difficulty]
  }
}

/**
 * Create initial AI state
 */
export function createAIState(startPosition: [number, number, number]): AIState {
  return {
    position: new THREE.Vector3(...startPosition),
    targetPosition: null,
    isMovingToBall: false,
    lastReactionTime: 0,
    // Start on the side the athlete already stands, so it does not cross the court on the
    // first frame of the rally.
    yieldSide: startPosition[0] >= 0 ? 1 : -1
  }
}

/** Keep a floor position inside the walkable area. */
function clampToCourt(x: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(
    THREE.MathUtils.clamp(x, -COURT.width / 2 + ATHLETE_INSET, COURT.width / 2 - ATHLETE_INSET),
    0.01,
    THREE.MathUtils.clamp(z, -COURT.length / 2 + ATHLETE_INSET, COURT.length / 2 - ATHLETE_INSET)
  )
}

/**
 * Fold a coordinate back inside ±limit, which approximates a single specular rebound off
 * that wall. Clamping instead would send the athlete into the corner the ball is about to
 * bounce out of.
 */
function foldIntoCourt(value: number, limit: number): number {
  if (value > limit) return limit - (value - limit)
  if (value < -limit) return -limit - (value + limit)
  return value
}

/**
 * Seconds until the ball next descends to `targetHeight` under gravity alone. Air drag
 * and wall rebounds are ignored: this is a movement lead, not a trajectory solver.
 *
 * @returns the descending root, or null when the ball never reaches that height
 */
function timeToHeight(currentHeight: number, verticalVelocity: number, targetHeight: number): number | null {
  const discriminant = verticalVelocity * verticalVelocity + 2 * GRAVITY * (currentHeight - targetHeight)
  if (discriminant < 0) return null
  const t = (verticalVelocity + Math.sqrt(discriminant)) / GRAVITY
  return t > 0 ? t : null
}

/**
 * Predict where the ball can next be met, anywhere on the court.
 *
 * Replaces the former front-half / back-half pair, whose three-case structure ("ball
 * returning", "ball heading to the front wall", "ball in my zone") only made sense while
 * each player owned half the floor.
 *
 * @returns the floor position to move toward
 */
export function predictInterceptPosition(
  ballPosition: THREE.Vector3,
  ballVelocity: THREE.Vector3
): THREE.Vector3 {
  if (ballVelocity.length() < MIN_TRACKED_SPEED) {
    return clampToCourt(ballPosition.x, ballPosition.z)
  }

  // Meet the ball at contact height on the way down; if it never gets that high, meet it
  // where it lands.
  const lead = timeToHeight(ballPosition.y, ballVelocity.y, STRIKE_HEIGHT)
    ?? timeToHeight(ballPosition.y, ballVelocity.y, 0)
    ?? 0
  const clampedLead = Math.min(lead, MAX_LEAD_TIME)

  return clampToCourt(
    foldIntoCourt(ballPosition.x + ballVelocity.x * clampedLead, COURT.width / 2),
    foldIntoCourt(ballPosition.z + ballVelocity.z * clampedLead, COURT.length / 2)
  )
}

/** Which side of the T the non-striker holds: 1 is the right of the court, -1 the left. */
export type YieldSide = 1 | -1

/**
 * Whether the non-striker should switch sides of the T.
 *
 * It gives up the side it holds only when the ball comes decisively to that side, so the
 * choice is sticky. Keying the side to the striker's x instead made the target flip every
 * time the striker crossed the centre line, which walked the non-striker back and forth
 * straight through them.
 */
export function nextYieldSide(current: YieldSide, ballPosition: THREE.Vector3): YieldSide {
  const ballIsOnHeldSide = Math.abs(ballPosition.x) > YIELD_SWITCH_X
    && Math.sign(ballPosition.x) === current
  return ballIsOnHeldSide ? (-current as YieldSide) : current
}

/**
 * Where the non-striker recovers to.
 *
 * WSF Rule 8.1 obliges the player who has just hit to give the incoming striker
 * unobstructed access to the ball and a clear swing at it. Both players want the same T,
 * so the non-striker takes it to one side, leaving the striker's line to the front wall open.
 */
export function yieldTarget(side: YieldSide): THREE.Vector3 {
  return clampToCourt(T_POSITION.x + side * YIELD_OFFSET, T_POSITION.z)
}

export interface AthleteUpdateInput {
  state: AIState
  ballPosition: THREE.Vector3
  ballVelocity: THREE.Vector3
  config: AIConfig
  deltaTime: number
  gamePhase: string
  /** True when this athlete is the one due to return the ball. */
  isStriker: boolean
  /** Current time in ms. The reaction delay is measured against it. */
  now: number
  /**
   * Where the other athlete is, used to push this one's recovery target clear of them.
   *
   * Only the recovery target is adjusted, never a striker chasing the ball — the striker has
   * right of way and the non-striker is the one obliged to clear. Without this the recovery
   * target could sit inside the other body, and since a hard separation is also applied to
   * the resulting position, the athlete walked in and was shoved back out on the same frame,
   * vibrating at frame rate and holding the pair inside the interference radius.
   */
  avoidPosition?: THREE.Vector3
}

/**
 * Advance one athlete by a frame. Used for both sides — the opponent always, and the
 * player as well while demo mode is running.
 */
export function updateAthlete(input: AthleteUpdateInput): AIState {
  const {
    state,
    ballPosition,
    ballVelocity,
    config,
    deltaTime,
    gamePhase,
    isStriker,
    now,
    avoidPosition,
  } = input

  // During serve setup both athletes hold the positions resetBallForServe gave them.
  if (gamePhase === 'serving') return state

  const newState: AIState = { ...state }

  if (gamePhase !== 'rally') {
    newState.targetPosition = T_POSITION.clone()
    newState.isMovingToBall = false
  } else if (!isStriker) {
    // Not our turn: clear the striker's path rather than chase a ball we may not play.
    newState.yieldSide = nextYieldSide(state.yieldSide, ballPosition)
    newState.targetPosition = yieldTarget(newState.yieldSide)
    newState.isMovingToBall = false
  } else {
    if (!state.isMovingToBall && now - state.lastReactionTime > config.reactionDelay) {
      newState.isMovingToBall = true
      newState.lastReactionTime = now
    }

    if (newState.isMovingToBall) {
      const predictedPos = predictInterceptPosition(ballPosition, ballVelocity)
      // Stand so the ball arrives in the hit zone, rather than standing on the ball.
      newState.targetPosition = calculateOptimalAIPosition(predictedPos, state.position)
    }
  }

  // Stop short of the other athlete rather than walking into them and being pushed back.
  if (newState.targetPosition && avoidPosition && !isStriker) {
    newState.targetPosition = separate(newState.targetPosition, avoidPosition)
  }

  if (newState.targetPosition) {
    const direction = newState.targetPosition.clone().sub(state.position)
    direction.y = 0

    const distance = direction.length()

    if (distance > 0.05) {
      direction.normalize()
      const moveDistance = Math.min(distance, config.moveSpeed * deltaTime)
      newState.position = state.position.clone().add(direction.multiplyScalar(moveDistance))
    }

    // The whole floor is walkable by both athletes — squash has no net.
    newState.position = clampToCourt(newState.position.x, newState.position.z)
  }

  return newState
}

/**
 * Rally drive speed in m/s at zero and at full charge — lockstep with player
 * `SHOT_PACE_SCALE` (~1.14× prior 13 / 6).
 */
export const AI_SHOT_BASE_SPEED = 15
export const AI_SHOT_POWER_SPEED = 7

/**
 * Where on the front wall the AI aims: tight above the tin, kept mid-wall so
 * pace + loft do not pin every rally under the out-line (demo visual tune).
 */
const AI_TARGET_WALL_HEIGHT = { min: 0.65, max: 1.2 }

/**
 * A drop is aimed just over the tin and hit softly, so it dies in a front corner.
 * Soft envelope stays at 8 m/s (not pace-scaled) so `dropCarries` still rejects
 * back-court / wide-aim soft shots; drives use the scaled base/power speeds.
 */
const AI_DROP_WALL_HEIGHT = { min: 0.55, max: 0.85 }
export const AI_DROP_SPEED = 8

/**
 * How often the AI goes short when a drop is on. Roughly one shot in six of those, which is
 * about what a real player mixes in and enough to keep the front corners live. The overall
 * rate is lower, because most positions do not allow a drop at all.
 */
/** Soften drop spam so length + wall angles stay the main pressure. */
export const AI_DROP_CHANCE = 0.1

/**
 * Whether a drop from here would still be a drop.
 *
 * The constraint is the distance the shot has to carry, not where the athlete is standing.
 * `calculateAIShot` raises the speed of any shot that cannot reach its aim point, so asking
 * for a drop from too far out silently returns something else: at `AI_DROP_SPEED` the ball's
 * whole range is `v²/g` = 6.5 m, against 7.9 m from the back of the court. Gating on z alone
 * left about a third of allowed drops coming out as 3 m lobs, because lateral aim adds up to
 * 2.4 m to the distance that has to be covered.
 *
 * Checked against the top of the drop band, which is the most demanding target in it, so the
 * answer holds for any `heightAim`.
 */
function dropCarries(ballPosition: THREE.Vector3, lateralAim: number): boolean {
  const targetX = lateralAim * (COURT.width / 2 - AI_TARGET_WALL_MARGIN)
  const distance = Math.hypot(targetX - ballPosition.x, FRONT_WALL_Z - ballPosition.z)
  const rise = AI_DROP_WALL_HEIGHT.max - ballPosition.y
  return minimumReachSpeed(distance, rise) * REACH_SPEED_MARGIN <= AI_DROP_SPEED
}

/**
 * Whether to play a drop rather than a drive.
 *
 * @param roll - a sample in [0, 1), supplied by the caller so this stays pure
 */
export function shouldPlayDrop(
  ballPosition: THREE.Vector3,
  lateralAim: number,
  roll: number
): boolean {
  return dropCarries(ballPosition, lateralAim) && roll < AI_DROP_CHANCE
}

/** Aim points are kept this far off the side walls, so a shot on target stays in play. */
const AI_TARGET_WALL_MARGIN = 0.8

/**
 * How far a fully inaccurate shot misses its aim point by (metres). Scaled by
 * `1 - accuracy`, this is what puts balls into the tin and ends rallies: with a perfect
 * aim every shot clears the tin and lands in court, and the rally never finishes.
 *
 * Note what a wide lateral miss means. At the easiest difficulty the aim point can land up to
 * 0.8 m outside the front wall, which needs the aim and the miss both at full extent — the
 * miss sample is a sum of three uniforms, so that tail is vanishingly rare. When it happens the
 * ball meets a side wall first, which is a boast: legal if it carries on to the front wall, a
 * NOT UP if it does not. Both are reasonable outcomes for a mis-hit, so the aim is deliberately
 * not clamped to the wall — clamping would pile misses up at the wall's edge instead.
 */
/**
 * How far a fully inaccurate shot misses its aim point by (metres). Scaled by
 * `1 - accuracy`. Height miss used to be 4 m and visually pinned every demo rally
 * under the out-line; keep height scatter on the tin/service band, width near the
 * side-wall edge (see `keeps even the worst mis-hit…` test).
 */
const AI_MISS_HEIGHT = 0.8
const AI_MISS_WIDTH = 2.2

export interface AIShotInput {
  ballPosition: THREE.Vector3
  /** Charge level, 0–1. */
  power: number
  /** Aim across the front wall, -1 (left) to 1 (right). */
  lateralAim: number
  /** Aim up the front wall, 0 (just over the tin) to 1 (high). */
  heightAim: number
  /** Shot quality, 0–1. Below 1 the aim point scatters — see `AIConfig.accuracy`. */
  accuracy: number
  /** Miss sample in [-1, 1] across the wall, supplied by the caller so this stays pure. */
  lateralMiss: number
  /** Miss sample in [-1, 1] up the wall. */
  heightMiss: number
  /**
   * Play a drop instead of a drive: low on the front wall and slow, so the ball dies in a
   * front corner. Without it every shot rebounds deep and neither player ever has reason
   * to go short, which leaves half the shared court unused.
   */
  drop: boolean
}

/**
 * Slowest launch that can still reach a point `distance` away and `rise` above the ball
 * (m/s). Below this no launch angle exists at all and the ball lands short however it is
 * aimed, because a projectile's range is capped at v²/g.
 */
function minimumReachSpeed(distance: number, rise: number): number {
  return Math.sqrt(GRAVITY * (rise + Math.hypot(rise, distance)))
}

/**
 * Speed is raised this far past the bare minimum when a shot would otherwise fall short.
 * At exactly the minimum there is a single launch angle and the solve sits on a repeated
 * root, which floating point turns into a miss.
 */
const REACH_SPEED_MARGIN = 1.08

/**
 * Launch elevation that lands a projectile on a point `distance` away and `rise` above
 * it, taking the flatter of the two solutions — a squash drive is hit hard and flat, not
 * lobbed.
 *
 * @returns the angle in radians, or null when the point is out of range at that speed
 */
function launchAngle(speed: number, distance: number, rise: number): number | null {
  const speedSq = speed * speed
  const discriminant = speedSq * speedSq - GRAVITY * (GRAVITY * distance * distance + 2 * rise * speedSq)
  if (discriminant < 0) return null
  return Math.atan2(speedSq - Math.sqrt(discriminant), GRAVITY * distance)
}

/**
 * Pick where across the front wall an AI rally shot is aimed, in [-1, 1].
 *
 * Biased away from the *opponent*, not the striker: aiming away from self made every return
 * from the human's usual (+X) service side slam into the left wall. A small random width
 * keeps length/angle variety without locking one corner.
 *
 * @param opponentX - opponent floor X (world); ≥0 → aim left half, else right half
 * @param roll - sample in [0, 1), supplied by the caller so this stays pure
 */
export function aiRallyAim(opponentX: number, roll: number): number {
  const away = opponentX >= 0 ? -1 : 1
  return away * (0.2 + Math.max(0, Math.min(1, roll)) * 0.5)
}

/**
 * Aim an AI rally shot at a point on the front wall.
 *
 * AI never uses the human side-wall-first rally fold corridor — front-wall
 * ballistic solve keeps opponent returns in play (skeptic: AI front clamp).
 *
 * Firing at a fixed elevation, as this used to, made the shot's arc depend entirely on
 * where the ball happened to be: from the back of the court a 0.25 elevation at 35 m/s
 * arcs over the 5.64 m clear height and the rally ends OUT on the first return. Aiming at
 * a wall point and solving for the elevation that reaches it keeps every shot in play from
 * anywhere on the floor.
 */
export function calculateAIShot(input: AIShotInput): { direction: THREE.Vector3; speed: number } {
  const { ballPosition, power, lateralAim, heightAim, accuracy, lateralMiss, heightMiss, drop } = input

  const band = drop ? AI_DROP_WALL_HEIGHT : AI_TARGET_WALL_HEIGHT
  const miss = 1 - THREE.MathUtils.clamp(accuracy, 0, 1)
  const targetX = lateralAim * (COURT.width / 2 - AI_TARGET_WALL_MARGIN) + lateralMiss * miss * AI_MISS_WIDTH
  // Cap the ceiling so miss cannot aim into the gallery roof (demo visual); still
  // allow tin misses below the band for rally endings.
  const targetY = THREE.MathUtils.clamp(
    THREE.MathUtils.lerp(band.min, band.max, heightAim) + heightMiss * miss * AI_MISS_HEIGHT,
    0.05,
    COURT.height - 0.4,
  )

  const deltaX = targetX - ballPosition.x
  const deltaZ = FRONT_WALL_Z - ballPosition.z
  const horizontalDistance = Math.hypot(deltaX, deltaZ)
  const rise = targetY - ballPosition.y

  // Standing on the front wall: there is no horizontal line to solve along, so just put
  // the ball into the wall.
  if (horizontalDistance < 1e-3) {
    return { direction: new THREE.Vector3(0, 0, -1), speed: AI_SHOT_BASE_SPEED }
  }

  const requested = drop ? AI_DROP_SPEED : AI_SHOT_BASE_SPEED + power * AI_SHOT_POWER_SPEED
  // A slow shot from deep cannot reach the front wall at all: at 8 m/s the ball's entire
  // range is 6.5 m, short of the 7.9 m from the back of the court, so it hits the floor
  // first and the return is down however it is aimed. Hit it as hard as the distance
  // needs rather than playing a shot that cannot land.
  const speed = Math.max(requested, minimumReachSpeed(horizontalDistance, rise) * REACH_SPEED_MARGIN)

  // The margin above guarantees a solution; the fallback is the repeated root at exactly
  // minimum speed, for the floating-point edge.
  const elevation = launchAngle(speed, horizontalDistance, rise)
    ?? Math.atan2(speed * speed, GRAVITY * horizontalDistance)

  const horizontal = Math.cos(elevation) / horizontalDistance
  return {
    direction: new THREE.Vector3(
      deltaX * horizontal,
      Math.sin(elevation),
      deltaZ * horizontal
    ),
    speed,
  }
}

export interface StrikeCheckInput {
  state: AIState
  ballPosition: THREE.Vector3
  ballVelocity: THREE.Vector3
  config: AIConfig
  /** False until the prior return has hit the front wall (`canHit` / WSF 6.2). */
  returnable: boolean
}

/**
 * Whether the athlete should start charging a shot.
 *
 * Charging takes 200–500 ms, so this looks ahead rather than waiting for the ball to
 * arrive. Whose turn it is comes from `currentStriker` at the call site; `returnable`
 * blocks charging while the prior shot has not yet completed on the front wall.
 */
export function shouldStrike(input: StrikeCheckInput): boolean {
  const { state, ballPosition, ballVelocity, config, returnable } = input

  if (!returnable) return false

  // A stationary ball is dead; swinging at it would loop forever.
  if (ballVelocity.length() < 0.2) return false

  // Out of racquet reach, high or low.
  if (ballPosition.y <= 0.1 || ballPosition.y >= MAX_REACH_HEIGHT) return false

  const chargeTime = 0.5
  const predictedBallPos = ballPosition.clone().add(ballVelocity.clone().multiplyScalar(chargeTime))
  const predictedDistance = state.position.distanceTo(predictedBallPos)
  const distanceToBall = state.position.distanceTo(ballPosition)

  const ballCloseNow = distanceToBall < config.hitRange * 2.5
  const ballWillBeClose = predictedDistance < config.hitRange * 1.8

  // Closing on us, in any direction — the old test read the sign of velocity.z, which only
  // meant "approaching" while each player owned one end of the court.
  const toAthlete = state.position.clone().sub(ballPosition)
  toAthlete.y = 0
  const ballApproaching = toAthlete.lengthSq() < 1e-6 || ballVelocity.dot(toAthlete) > 0

  return (ballCloseNow || ballWillBeClose) && ballApproaching
}
