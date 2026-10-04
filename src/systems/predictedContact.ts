/**
 * First court surface a charged shot would meet, under gravity and linear damping.
 *
 * The strike replaces the ball's velocity, so the preview ignores incoming speed.
 * Sweet-spot noise is left out: the marker is the aimed ball, and a mishit leaves
 * that line. Restitution and the second wall are out of scope — first contact only.
 *
 * Rapier's step is `v = (v + a dt) / (1 + λ dt)`, the discrete form of `dv/dt = a − λv`.
 * Position on one axis:
 *   p(t) = p0 + (v0 − a/λ) (1 − e^{−λt}) / λ + (a/λ) t
 */

import * as THREE from 'three'
import { BALL_RADIUS, COURT, FRONT_WALL_Z, getOutLineHeight } from './court'
import { aimToPlayerRotation } from './aimRotation'
import {
  analyzeShotContext,
  calculateShot,
  calculateVelocityFromShot,
  type ShotType,
} from './shotContext'
import { BASE_SHOT_SPEED } from './shotTypes'
import {
  judgeServeFrontWall,
  serveBallWorldPosition,
  serveSpeed,
  serveStrikeDirection,
  type ServiceBox,
} from './serveRules'

/** Matches `RigidBody linearDamping` on the ball. */
export const BALL_LINEAR_DAMPING = 0.4

/** Matches the Rapier world gravity Y component. */
export const GRAVITY_Y = -9.81

const MIN_HIT_TIME = 1e-4
const FLOOR_SEARCH_CAP_S = 12

export type CourtSurface = 'front' | 'back' | 'left' | 'right' | 'floor'
export type ContactKind = 'play' | 'fault'

export interface SurfaceContact {
  surface: CourtSurface
  /** Ball centre at contact. */
  x: number
  y: number
  z: number
  time: number
  kind: ContactKind
}

export interface BallisticLaunch {
  origin: { x: number, y: number, z: number }
  /** Unit direction. */
  direction: { x: number, y: number, z: number }
  speed: number
  serve: boolean
}

export type PreviewLaunchInput =
  | {
      kind: 'serve'
      serviceBox: ServiceBox
      aim: number
      loft: number
      power: number
    }
  | {
      kind: 'rally'
      playerPosition: { x: number, y: number, z: number }
      ballPosition: { x: number, y: number, z: number }
      aim: number
      loft: number
      power: number
      /**
       * Shot type after the charge-name debounce. Null until that label exists,
       * in which case the preview is withheld.
       */
      shotType: ShotType | null
    }

/**
 * Time for a damped axis (no constant acceleration) to reach `plane`.
 * Null when the axis is not moving toward the plane, or damping's asymptote
 * `v0 / λ` falls short of it.
 */
export function timeToDampedPlane(p0: number, v0: number, plane: number): number | null {
  if (Math.abs(v0) < 1e-8) return null
  const delta = plane - p0
  if (delta * v0 <= 0) return null
  const ratio = (BALL_LINEAR_DAMPING * delta) / v0
  if (ratio >= 1) return null
  const t = -Math.log(1 - ratio) / BALL_LINEAR_DAMPING
  if (!(t > MIN_HIT_TIME)) return null
  return t
}

function axisAt(p0: number, v0: number, accel: number, t: number): number {
  const decay = Math.exp(-BALL_LINEAR_DAMPING * t)
  const drift = v0 - accel / BALL_LINEAR_DAMPING
  return p0 + (drift * (1 - decay)) / BALL_LINEAR_DAMPING + (accel / BALL_LINEAR_DAMPING) * t
}

function timeToFloor(y0: number, vy0: number): number | null {
  const target = BALL_RADIUS
  if (y0 <= target) return null

  let tStart = 0
  if (vy0 > 0) {
    const arg = (-GRAVITY_Y / BALL_LINEAR_DAMPING) / (vy0 - GRAVITY_Y / BALL_LINEAR_DAMPING)
    if (arg > 0 && arg < 1) {
      tStart = -Math.log(arg) / BALL_LINEAR_DAMPING
    }
  }

  let tEnd = Math.max(tStart + 0.05, 0.05)
  let guard = 0
  while (axisAt(y0, vy0, GRAVITY_Y, tEnd) > target && guard < 24) {
    tEnd *= 1.6
    guard += 1
    if (tEnd > FLOOR_SEARCH_CAP_S) return null
  }
  if (axisAt(y0, vy0, GRAVITY_Y, tEnd) > target) return null

  let lo = tStart
  let hi = tEnd
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) * 0.5
    if (axisAt(y0, vy0, GRAVITY_Y, mid) > target) lo = mid
    else hi = mid
  }
  if (!(hi > MIN_HIT_TIME)) return null
  return hi
}

interface HitCandidate {
  t: number
  surface: CourtSurface
  x: number
  y: number
  z: number
}

function positionAt(
  origin: BallisticLaunch['origin'],
  vx: number,
  vy: number,
  vz: number,
  t: number,
): { x: number, y: number, z: number } {
  return {
    x: axisAt(origin.x, vx, 0, t),
    y: axisAt(origin.y, vy, GRAVITY_Y, t),
    z: axisAt(origin.z, vz, 0, t),
  }
}

function acceptWall(
  surface: CourtSurface,
  x: number,
  y: number,
  z: number,
): boolean {
  const halfW = COURT.width / 2 - BALL_RADIUS
  const frontZ = FRONT_WALL_Z + BALL_RADIUS
  const backZ = COURT.length / 2 - BALL_RADIUS
  const slack = 1e-4
  if (y < 0) return false
  if (surface === 'front' || surface === 'back') {
    if (Math.abs(x) > halfW + slack) return false
    const top = surface === 'front' ? COURT.height : COURT.backWallHeight
    return y < top
  }
  if (z < frontZ - slack || z > backZ + slack) return false
  return y < getOutLineHeight(z)
}

function acceptFloor(x: number, z: number): boolean {
  const halfW = COURT.width / 2 - BALL_RADIUS
  const frontZ = FRONT_WALL_Z + BALL_RADIUS
  const backZ = COURT.length / 2 - BALL_RADIUS
  const slack = 1e-4
  return Math.abs(x) <= halfW + slack && z >= frontZ - slack && z <= backZ + slack
}

/**
 * Losing contacts only: tin, a serve that misses the front wall or the service
 * line, and a rally that meets the floor before a wall. A rally side or back
 * wall is a legal boast. The service-box bounce is not judged here.
 */
function contactKind(
  surface: CourtSurface,
  y: number,
  serve: boolean,
): ContactKind {
  if (serve) {
    if (surface !== 'front') return 'fault'
    const judgement = judgeServeFrontWall(y, COURT.tinHeight, COURT.serviceLineHeight)
    return judgement === 'valid' ? 'play' : 'fault'
  }
  if (surface === 'floor') return 'fault'
  if (surface === 'front' && y < COURT.tinHeight) return 'fault'
  return 'play'
}

/**
 * Fill `out` with the first in-court surface the launch meets.
 * Returns false when every candidate misses (for example a shot over the out line).
 */
export function predictSurfaceContact(launch: BallisticLaunch, out: SurfaceContact): boolean {
  if (!(launch.speed > 0)) return false
  const vx = launch.direction.x * launch.speed
  const vy = launch.direction.y * launch.speed
  const vz = launch.direction.z * launch.speed
  const { origin } = launch

  const frontZ = FRONT_WALL_Z + BALL_RADIUS
  const backZ = COURT.length / 2 - BALL_RADIUS
  const leftX = -COURT.width / 2 + BALL_RADIUS
  const rightX = COURT.width / 2 - BALL_RADIUS

  let best: HitCandidate | null = null
  const consider = (candidate: HitCandidate | null): void => {
    if (!candidate) return
    if (!best || candidate.t < best.t) best = candidate
  }

  const wallAt = (
    surface: CourtSurface,
    t: number | null,
  ): HitCandidate | null => {
    if (t === null) return null
    const pos = positionAt(origin, vx, vy, vz, t)
    if (!acceptWall(surface, pos.x, pos.y, pos.z)) return null
    return { t, surface, x: pos.x, y: pos.y, z: pos.z }
  }

  consider(wallAt('front', timeToDampedPlane(origin.z, vz, frontZ)))
  consider(wallAt('back', timeToDampedPlane(origin.z, vz, backZ)))
  consider(wallAt('left', timeToDampedPlane(origin.x, vx, leftX)))
  consider(wallAt('right', timeToDampedPlane(origin.x, vx, rightX)))

  const floorT = timeToFloor(origin.y, vy)
  if (floorT !== null) {
    const pos = positionAt(origin, vx, vy, vz, floorT)
    if (acceptFloor(pos.x, pos.z)) {
      consider({
        t: floorT,
        surface: 'floor',
        x: pos.x,
        y: BALL_RADIUS,
        z: pos.z,
      })
    }
  }

  if (!best) return false
  const hit: HitCandidate = best
  out.surface = hit.surface
  out.x = hit.x
  out.y = hit.y
  out.z = hit.z
  out.time = hit.t
  out.kind = contactKind(hit.surface, hit.y, launch.serve)
  return true
}

/**
 * The launch a release would apply, without accuracy jitter.
 * Rally returns false until a debounced shot type is available.
 */
export function fillPreviewLaunch(input: PreviewLaunchInput, out: BallisticLaunch): boolean {
  if (input.kind === 'serve') {
    const pose = serveBallWorldPosition(input.serviceBox)
    const dir = serveStrikeDirection(input.serviceBox, input.aim, input.loft)
    out.origin.x = pose.x
    out.origin.y = pose.y
    out.origin.z = pose.z
    out.direction.x = dir.x
    out.direction.y = dir.y
    out.direction.z = dir.z
    out.speed = serveSpeed(input.power)
    out.serve = true
    return true
  }

  if (!input.shotType) return false

  const player = new THREE.Vector3(
    input.playerPosition.x,
    input.playerPosition.y,
    input.playerPosition.z,
  )
  const ball = new THREE.Vector3(
    input.ballPosition.x,
    input.ballPosition.y,
    input.ballPosition.z,
  )
  const context = analyzeShotContext(
    player,
    ball,
    aimToPlayerRotation(input.aim),
    input.power,
    1,
    input.loft,
  )
  const shot = calculateShot(context, input.shotType)
  const velocity = calculateVelocityFromShot(shot, BASE_SHOT_SPEED)
  out.origin.x = ball.x
  out.origin.y = ball.y
  out.origin.z = ball.z
  out.direction.x = velocity.direction.x
  out.direction.y = velocity.direction.y
  out.direction.z = velocity.direction.z
  out.speed = velocity.speed
  out.serve = false
  return true
}
