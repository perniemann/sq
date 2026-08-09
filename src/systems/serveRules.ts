/**
 * WSF serve contact on the front wall (Rule 5.7): the ball must strike the front wall
 * above the service line. Below the tin is tin; between tin and service line is a
 * serve fault — not a legal rally contact.
 *
 * Loft / speed / hold pose live here so player, AI, and demo paths cannot drift apart,
 * and so wall clearance is unit-tested without Rapier.
 */

import { COURT, FRONT_WALL_Z } from './court'
import { SERVICE_BOX_POSITIONS } from './courtPositions'

export type ServeFrontWallJudgement = 'valid' | 'serveFault' | 'tin'
export type ServiceBox = 'left' | 'right'

/** Serve speed (m/s) at zero charge. Slower than a rally drive. */
export const SERVE_BASE_SPEED = 17

/** Extra serve speed at full charge. */
export const SERVE_POWER_SPEED = 4

/**
 * Pre-normalise Y loft at zero charge (paired with Z = −1). Tuned to clear the
 * 1.78 m service line from `SERVE_BALL_HEIGHT` under gravity (drag eats some margin).
 */
export const SERVE_LOFT_MIN = 0.38

/** Extra loft at full charge. */
export const SERVE_LOFT_POWER = 0.08

/**
 * Pre-normalise |X| aim (paired with Z = −1). Sign is chosen per box so the serve
 * crosses into the opposite quarter (WSF 5.7.4). Kept modest so a full-charge serve
 * (demo AI always maxes charge) lands mid-quarter instead of the far back corner.
 */
export const SERVE_HORIZONTAL = 0.14

/**
 * Held serve height (m). While `phase === 'serving'`, the ball is pinned to the full
 * serve pose so it cannot freefall or be nudged sideways by the racquet before strike.
 */
export const SERVE_BALL_HEIGHT = 1.0

/** Ball sits slightly forward of the box centre. */
export const SERVE_BALL_Z_OFFSET = 0.3

const GRAVITY = 9.81

/** True from ready-to-serve until the strike flips phase to rally. */
export function isServeBallHeld(phase: string): boolean {
  return phase === 'serving'
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

export function judgeServeFrontWall(
  ballY: number,
  tinHeight: number,
  serviceLineHeight: number
): ServeFrontWallJudgement {
  if (ballY < tinHeight) return 'tin'
  if (ballY < serviceLineHeight) return 'serveFault'
  return 'valid'
}

/** Upward component before normalising with (horizontal, loft, −1). */
export function serveLoft(power: number): number {
  return SERVE_LOFT_MIN + clamp01(power) * SERVE_LOFT_POWER
}

export function serveSpeed(power: number): number {
  return SERVE_BASE_SPEED + clamp01(power) * SERVE_POWER_SPEED
}

/**
 * Lateral pre-normalise X for the service box. Right box aims −X (toward the left
 * court); left box aims +X.
 */
export function serveHorizontalAngle(box: ServiceBox): number {
  return box === 'right' ? -SERVE_HORIZONTAL : SERVE_HORIZONTAL
}

/** World pose of the held / just-struck serve ball for a box. */
export function serveBallWorldPosition(box: ServiceBox): { x: number, y: number, z: number } {
  const boxPos = SERVICE_BOX_POSITIONS[box]
  return {
    x: boxPos.x,
    y: SERVE_BALL_HEIGHT,
    z: boxPos.z + SERVE_BALL_Z_OFFSET,
  }
}

function serveFlightToFrontWall(input: {
  ballX: number
  ballY: number
  ballZ: number
  horizontalAngle: number
  loft: number
  speed: number
}): { x: number, y: number, time: number } {
  const { ballX, ballY, ballZ, horizontalAngle, loft, speed } = input
  const len = Math.hypot(horizontalAngle, loft, 1)
  const dirX = horizontalAngle / len
  const dirY = loft / len
  const dirZ = -1 / len
  const vz = dirZ * speed
  if (vz >= 0) return { x: ballX, y: ballY, time: 0 }
  const time = (FRONT_WALL_Z - ballZ) / vz
  if (time <= 0) return { x: ballX, y: ballY, time: 0 }
  return {
    time,
    x: ballX + dirX * speed * time,
    y: ballY + dirY * speed * time - 0.5 * GRAVITY * time * time,
  }
}

/**
 * Vacuum front-wall crossing height for a serve launch. Optimistic vs Rapier
 * (no linearDamping); tests require clearance above the service line with margin.
 */
export function serveFrontWallHeight(input: {
  ballY: number
  ballZ: number
  horizontalAngle: number
  loft: number
  speed: number
  ballX?: number
}): number {
  return serveFlightToFrontWall({
    ballX: input.ballX ?? 0,
    ballY: input.ballY,
    ballZ: input.ballZ,
    horizontalAngle: input.horizontalAngle,
    loft: input.loft,
    speed: input.speed,
  }).y
}

/** Vacuum front-wall crossing X — must stay inside the court width. */
export function serveFrontWallX(input: {
  ballX: number
  ballY: number
  ballZ: number
  horizontalAngle: number
  loft: number
  speed: number
}): number {
  return serveFlightToFrontWall(input).x
}

/** Half-width margin kept inside the side walls at the front-wall plane. */
export function serveFrontWallInCourtX(wallX: number, margin = 0.35): boolean {
  return Math.abs(wallX) <= COURT.width / 2 - margin
}
