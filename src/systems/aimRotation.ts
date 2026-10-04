/**
 * Maps charge-aim (0–1) onto player yaw for shot selection and ballistics.
 * Arcade cone: 180° toward the front wall, neutral aim faces −Z.
 *
 * Handedness: from behind a player facing the front wall (−Z), court left is −X and
 * court right is +X. A −Z drive yawed by +θ (right-hand Y) heads toward −X, so aim
 * must *decrease* yaw as it increases — otherwise the floor needle and the ball disagree.
 *
 * Rally fold allows extreme lateral aims into a side-wall-first corridor (WSF-legal boast).
 * Centre aims stay front-wall-first. Serve / AI front solvers do not use the edge corridor.
 */

import * as THREE from 'three'
import { COURT } from './court'

/** Total aim cone (180°) — left wall through front to right wall. */
export const AIM_ARC_RANGE = Math.PI

/**
 * Yaw at aim 0 — full left (−X from behind the player facing the front wall).
 * (+π/2 on a −Z drive → world −X.)
 */
export const AIM_START_ANGLE = Math.PI / 2

/**
 * −1 = increasing aim yaws toward court right (+X).
 * Positive Y yaw alone would steer a −Z drive left (−X); this flips the stick mapping.
 */
export const AIM_DIRECTION = -1

/** Straight at the front wall — default on charge press / release-to-center. */
export const AIM_NEUTRAL = 0.5

/**
 * Minimum −Z after fold for centre / front-only aims (drives stay front-wall-first).
 */
export const MIN_FORWARD_Z_CENTRE = 0.35

/**
 * Minimum −Z at full lateral extreme — low enough that mid/back-court strikes can
 * meet a side wall before the front wall (boast corridor).
 */
export const MIN_FORWARD_Z_EDGE = 0.08

/** @deprecated Use MIN_FORWARD_Z_CENTRE — kept for call-site clarity in older tests. */
export const MIN_FORWARD_Z = MIN_FORWARD_Z_CENTRE

/**
 * Full loft-stick travel (±0.5 from neutral) added to pre-normalise Y on the preview
 * beam. Keep equal to `LOFT_VERTICAL_SCALE` in `shotContext.ts`.
 */
export const AIM_PREVIEW_LOFT_SCALE = 0.55

const UP = new THREE.Vector3(0, 1, 0)

/** Convert aim 0–1 to the yaw `selectShotType` / `calculateShot` expect. */
export function aimToPlayerRotation(aim: number): number {
  const a = Math.max(0, Math.min(1, aim))
  return AIM_START_ANGLE + a * AIM_ARC_RANGE * AIM_DIRECTION
}

/**
 * Forward component required after fold. High |x| (sideways) → edge corridor;
 * near-straight → centre drive floor. `frontOnly` always uses the centre floor.
 */
export function minForwardZForDirection(
  dir: THREE.Vector3,
  mode: 'rally' | 'frontOnly' = 'rally',
): number {
  if (mode === 'frontOnly') return MIN_FORWARD_Z_CENTRE
  const lateral = Math.min(1, Math.abs(dir.x) / 0.92)
  const t = lateral * lateral
  return THREE.MathUtils.lerp(MIN_FORWARD_Z_CENTRE, MIN_FORWARD_Z_EDGE, t)
}

/**
 * Fold a launch direction into a legal play hemisphere.
 *
 * - Behind the striker (`z > 0`): reflect to the front and flip X so the shot goes to
 *   the *opposing* front corner rather than back into the gallery.
 * - Rally mode: strong lateral aims keep a small −Z so the first wall can be a side wall.
 * - Front-only mode: always pull to `MIN_FORWARD_Z_CENTRE` (drives / AI-safe previews).
 *
 * Pass `out` to write into a reused vector. Omit it and the input is left unchanged.
 */
export function foldAimForRally(
  direction: THREE.Vector3,
  mode: 'rally' | 'frontOnly' = 'rally',
  out?: THREE.Vector3,
): THREE.Vector3 {
  const dir = out ?? direction.clone()
  if (out !== undefined && out !== direction) dir.copy(direction)
  if (dir.z > 0) {
    const lateral = dir.x === 0 ? 1 : dir.x
    const floor = mode === 'frontOnly' ? MIN_FORWARD_Z_CENTRE : MIN_FORWARD_Z_EDGE
    dir.x = -Math.sign(lateral) * Math.max(Math.abs(dir.x), floor)
    dir.z = -Math.max(Math.abs(dir.z), floor)
  } else {
    const floor = minForwardZForDirection(dir, mode)
    if (dir.z > -floor) {
      dir.z = -floor
    }
  }
  return dir.normalize()
}

/**
 * @deprecated Prefer `foldAimForRally(dir, 'frontOnly')` or rally mode.
 * Kept as the historical front-wall clamp for callers that must not boast.
 */
export function foldAimIntoFrontHemisphere(direction: THREE.Vector3): THREE.Vector3 {
  return foldAimForRally(direction, 'frontOnly')
}

/**
 * Soft charge-ring sector hints (no snap). Arc ends = BOAST, centre = STRAIGHT,
 * loft rail ends = LOB (from below) / SMASH (from above).
 */
export type ChargeRingHintId = 'LOB' | 'STRAIGHT' | 'SMASH' | 'BOAST'

/** Stable pose keys so L/R BOAST can highlight independently. */
export type ChargeRingHintKey =
  | 'boastLeft'
  | 'straight'
  | 'boastRight'
  | 'lob'
  | 'smash'

export interface ChargeRingHintPose {
  key: ChargeRingHintKey
  id: ChargeRingHintId
  /** Floor-ring local XY after ChargeIndicator's −90° X tilt. */
  x: number
  y: number
}

/** Aim offset from centre before a BOAST sector reads active (still continuous — no snap). */
export const CHARGE_RING_AIM_BOAST = 0.22

/** Loft offset from neutral before LOB / SMASH rail labels read active. */
export const CHARGE_RING_LOFT_EXTREME = 0.22

/**
 * Which sector hints should read bright for the current stick. Dual-axis: aim can
 * light BOAST/STRAIGHT while loft lights LOB/SMASH. Never snaps input.
 */
export function chargeRingHintActivation(
  aim: number,
  loft: number,
): Record<ChargeRingHintKey, boolean> {
  const a = Math.max(0, Math.min(1, aim))
  const l = Math.max(0, Math.min(1, loft))
  const boastLeft = a < AIM_NEUTRAL - CHARGE_RING_AIM_BOAST
  const boastRight = a > AIM_NEUTRAL + CHARGE_RING_AIM_BOAST
  return {
    boastLeft,
    boastRight,
    straight: !boastLeft && !boastRight,
    lob: l > AIM_NEUTRAL + CHARGE_RING_LOFT_EXTREME,
    smash: l < AIM_NEUTRAL - CHARGE_RING_LOFT_EXTREME,
  }
}

/**
 * Label poses for the diegetic charge ring. Pure layout — rendering stays in Player.
 */
export function chargeRingHintPoses(layout: {
  aimLabelR: number
  loftRailX: number
  loftHalf: number
}): ChargeRingHintPose[] {
  const { aimLabelR, loftRailX, loftHalf } = layout
  const atAim = (
    aim: number,
    key: ChargeRingHintKey,
    id: ChargeRingHintId,
  ): ChargeRingHintPose => {
    const theta = aimToFloorNeedleTheta(aim)
    return {
      key,
      id,
      x: Math.cos(theta) * aimLabelR,
      y: Math.sin(theta) * aimLabelR,
    }
  }
  return [
    atAim(0.08, 'boastLeft', 'BOAST'),
    atAim(AIM_NEUTRAL, 'straight', 'STRAIGHT'),
    atAim(0.92, 'boastRight', 'BOAST'),
    { key: 'lob', id: 'LOB', x: loftRailX, y: loftHalf * 0.92 },
    { key: 'smash', id: 'SMASH', x: loftRailX, y: -loftHalf * 0.92 },
  ]
}

/**
 * Unit launch direction for a flat drive at `aim`.
 * Rally mode — extreme aims enter the side-wall-first corridor.
 */
export function aimToDriveDirection(aim: number): THREE.Vector3 {
  return foldAimForRally(
    new THREE.Vector3(0, 0, -1).applyAxisAngle(UP, aimToPlayerRotation(aim)),
    'rally',
  )
}

/**
 * Charge-preview launch direction (aim yaw + loft stick). Loft scale matches
 * `LOFT_VERTICAL_SCALE` so the racquet beam tracks the struck ball.
 */
export function aimPreviewDirection(aim: number, loftStick = AIM_NEUTRAL): THREE.Vector3 {
  const dir = aimToDriveDirection(aim)
  const loft = Math.max(0, Math.min(1, loftStick))
  dir.y += (loft - AIM_NEUTRAL) * AIM_PREVIEW_LOFT_SCALE
  return foldAimForRally(dir, 'rally')
}

/**
 * Which vertical wall a horizontal ray hits first (ignore Y). Used for vacuum
 * acceptance tests of side-wall-first vs front-wall-first launches.
 */
export function firstVerticalWallAlongRay(
  originX: number,
  originZ: number,
  dirX: number,
  dirZ: number,
  halfWidth: number = COURT.width / 2,
  halfLength: number = COURT.length / 2,
): 'front' | 'left' | 'right' | 'back' | null {
  const eps = 1e-9
  let bestT = Infinity
  let hit: 'front' | 'left' | 'right' | 'back' | null = null

  const consider = (t: number, wall: typeof hit): void => {
    if (t > eps && t < bestT) {
      bestT = t
      hit = wall
    }
  }

  if (Math.abs(dirZ) > eps) {
    const tFront = (-halfLength - originZ) / dirZ
    const xAt = originX + dirX * tFront
    if (tFront > eps && Math.abs(xAt) <= halfWidth + 1e-6) consider(tFront, 'front')
    const tBack = (halfLength - originZ) / dirZ
    const xBack = originX + dirX * tBack
    if (tBack > eps && Math.abs(xBack) <= halfWidth + 1e-6) consider(tBack, 'back')
  }
  if (Math.abs(dirX) > eps) {
    const tRight = (halfWidth - originX) / dirX
    const zRight = originZ + dirZ * tRight
    if (tRight > eps && Math.abs(zRight) <= halfLength + 1e-6) consider(tRight, 'right')
    const tLeft = (-halfWidth - originX) / dirX
    const zLeft = originZ + dirZ * tLeft
    if (tLeft > eps && Math.abs(zLeft) <= halfLength + 1e-6) consider(tLeft, 'left')
  }

  return hit
}

/**
 * Floor-ring theta (after ChargeIndicator's −90° X tilt) for a needle at `aim`.
 * Local θ=0 is +X (right), θ=π/2 is −Z (front), θ=π is −X (left).
 */
export function aimToFloorNeedleTheta(aim: number): number {
  const a = Math.max(0, Math.min(1, aim))
  return Math.PI * (1 - a)
}

/**
 * Place a radial needle of length `length` on the floor ring so it only covers the
 * forward semicircle ray (not a diameter through the athlete).
 */
export function floorNeedlePose(
  aim: number,
  length: number,
): { x: number; y: number; theta: number } {
  const theta = aimToFloorNeedleTheta(aim)
  const half = length * 0.5
  return {
    x: Math.cos(theta) * half,
    y: Math.sin(theta) * half,
    theta,
  }
}
