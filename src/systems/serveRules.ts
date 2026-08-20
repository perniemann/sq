/**
 * WSF serve contact on the front wall (Rule 5.7): the ball must strike the front wall
 * above the service line. Below the tin is tin; between tin and service line is a
 * serve fault — not a legal rally contact.
 *
 * Loft / speed / hold pose live here so player, AI, and demo paths cannot drift apart,
 * and so wall clearance is unit-tested without Rapier.
 *
 * Player control (skeptic-revised): hold duration → pace; loft stick → wall height;
 * aim → lateral width. Loft is independent of power.
 */

import { COURT, FRONT_WALL_Z } from './court'
import { SERVICE_BOX_POSITIONS } from './courtPositions'

export type ServeFrontWallJudgement = 'valid' | 'serveFault' | 'tin'
export type ServiceBox = 'left' | 'right'

/** Serve speed (m/s) at zero charge — short/soft end of the envelope. */
export const SERVE_BASE_SPEED = 18

/** Extra serve speed at full charge — approaches rally drive pace. */
export const SERVE_POWER_SPEED = 6

/** Pre-normalise Y loft at loft-stick 0 (low). Still clears the service line in vacuum tests. */
export const SERVE_LOFT_LOW = 0.30

/** Pre-normalise Y loft at loft-stick 1 (high / lob serve). Under court out-line. */
export const SERVE_LOFT_HIGH = 0.62

/**
 * @deprecated Use `SERVE_LOFT_LOW`. Kept as alias for older test/doc references.
 * Neutral stick (0.5) lands mid-band, not this floor.
 */
export const SERVE_LOFT_MIN = SERVE_LOFT_LOW

/**
 * Lateral pre-normalise |X| at aim 0 (modest opposite-quarter bias).
 * Sign is chosen per box so the serve crosses into the opposite quarter (WSF 5.7.4).
 */
export const SERVE_HORIZONTAL = 0.12

/** Extra |X| at full aim — still clamped in-court by vacuum tests. */
export const SERVE_HORIZONTAL_AIM = 0.1

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

/**
 * After a rally ends, pin the ball in place until Button A advances the phase.
 * Velocity-only freeze still drifts under gravity; callers re-apply a captured pose.
 */
export function isBallFrozenBetweenPoints(phase: string): boolean {
  return phase === 'point' || phase === 'gameOver' || phase === 'matchOver'
}

/** Athletes stay planted on the point / game / match callout (same window as the ball freeze). */
export function isAthleteHeldBetweenPoints(phase: string): boolean {
  return isBallFrozenBetweenPoints(phase)
}

/**
 * Human mesh hold: menu idle, between-points freeze, or foot planted in the box while serving.
 * Receivers stay free during `serving` so they can chase the toss.
 */
export function humanServeHoldPosition(
  phase: string,
  servingPlayer: 'player' | 'opponent',
  demoMode: boolean,
): boolean {
  return (
    phase === 'idle' ||
    isAthleteHeldBetweenPoints(phase) ||
    (phase === 'serving' && !demoMode && servingPlayer === 'player')
  )
}

/** AI mesh hold: idle, any serve stance, and between-points freeze. */
export function aiServeHoldPosition(phase: string): boolean {
  return (
    phase === 'idle' ||
    phase === 'serving' ||
    isAthleteHeldBetweenPoints(phase)
  )
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

/**
 * Upward component before normalising with (horizontal, loft, −1).
 * Driven by the loft stick (0–1), not charge power.
 */
export function serveLoftFromStick(loft: number): number {
  const t = clamp01(loft)
  return SERVE_LOFT_LOW + t * (SERVE_LOFT_HIGH - SERVE_LOFT_LOW)
}

/**
 * @deprecated Prefer `serveLoftFromStick`. Maps power → loft for AI/demo paths that
 * still want a simple height cue without a loft axis.
 */
export function serveLoft(power: number): number {
  return serveLoftFromStick(0.35 + clamp01(power) * 0.4)
}

export function serveSpeed(power: number): number {
  return SERVE_BASE_SPEED + clamp01(power) * SERVE_POWER_SPEED
}

/**
 * Opponent → human opening serves: slower so Shift+Space receive is learnable.
 * Demo / AI-vs-AI keeps full `serveSpeed` for spectacle.
 */
export const AI_SERVE_VS_HUMAN_SPEED_SCALE = 0.78

/** Extra loft (pre-normalise Y) on softened opponent serves — hangs a beat longer. */
export const AI_SERVE_VS_HUMAN_LOFT_BUMP = 0.06

/** Opponent serve speed; optional soft envelope vs a human receiver. */
export function serveSpeedForOpponent(
  power: number,
  opts: { softVsHuman: boolean },
): number {
  const speed = serveSpeed(power)
  return opts.softVsHuman ? speed * AI_SERVE_VS_HUMAN_SPEED_SCALE : speed
}

/** Opponent serve loft; optional soft hang vs a human receiver. */
export function serveLoftForOpponent(
  power: number,
  opts: { softVsHuman: boolean },
): number {
  const loft = serveLoft(power)
  if (!opts.softVsHuman) return loft
  return Math.min(SERVE_LOFT_HIGH, loft + AI_SERVE_VS_HUMAN_LOFT_BUMP)
}

/**
 * Lateral pre-normalise X for the service box at default aim.
 * Right box aims −X (toward the left court); left box aims +X.
 */
export function serveHorizontalAngle(box: ServiceBox): number {
  return box === 'right' ? -SERVE_HORIZONTAL : SERVE_HORIZONTAL
}

/**
 * Box bias plus player aim (0–1). Higher aim widens the cross toward the opposite
 * side; vacuum tests keep front-wall X in court and on the correct half.
 */
export function serveHorizontalFromAim(box: ServiceBox, aim: number): number {
  const sign = box === 'right' ? -1 : 1
  const magnitude = SERVE_HORIZONTAL + clamp01(aim) * SERVE_HORIZONTAL_AIM
  return sign * magnitude
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
