import * as THREE from 'three'
import { ATHLETE_INSET, COURT } from './court'
import { RECEIVER_POSITIONS } from './courtPositions'
import { calculateOptimalAIPosition } from './hitAccuracy'
import { predictInterceptPosition } from './ai'

/**
 * Soft drift toward the return pocket — arcade magnet, still well below chase (10).
 * Constraint (tested): `ASSIST_SPEED < PLAYER_CHASE_SPEED` so Shift stays the skill ceiling.
 * Tuned so Space-only returns land without forcing Shift every ball.
 */
export const ASSIST_SPEED = 5.2

/** Scratch for ideal stand calc — no per-frame `new Vector3` in the rally loop. */
const _playerScratch = new THREE.Vector3()

/** No pull when already roughly in the pocket (metres). */
export const ASSIST_DEAD_ZONE = 0.38

/**
 * Cap how far the assist target may sit from the athlete. A far ideal only becomes a
 * short step in the right direction — the Dead Cells “magnet” trick so the pull never
 * reads as an auto-sprint across the court. Generous enough for arcade returns.
 */
export const ASSIST_MAX_STEP = 3.2

export type PlayerAssistContext = {
  playerX: number
  playerZ: number
  ball: THREE.Vector3
  ballVelocity: THREE.Vector3
  /** True when the human is due to strike (receive / return). */
  isStriker: boolean
  phase: string
  servingPlayer: 'player' | 'opponent'
  serviceBox: 'left' | 'right'
  /** Shift chase owns movement. */
  isChasing: boolean
  isRecovering: boolean
  isSwinging: boolean
  holdPosition: boolean
}

export type PlayerAssistResult = {
  target: [number, number, number]
  speed: number
}

function clampToFloor(x: number, z: number): { x: number, z: number } {
  return {
    x: Math.max(-COURT.width / 2 + ATHLETE_INSET, Math.min(COURT.width / 2 - ATHLETE_INSET, x)),
    z: Math.max(-COURT.length / 2 + ATHLETE_INSET, Math.min(COURT.length / 2 - ATHLETE_INSET, z)),
  }
}

/**
 * Ideal stand point for a subtle assist. Serve receive uses the WSF receiver quarter;
 * rally returns use a short intercept + hit-zone offset (same geometry as demo AI, not
 * the same speed).
 */
export function playerAssistIdeal(ctx: PlayerAssistContext): { x: number, z: number } | null {
  if (
    ctx.isChasing ||
    ctx.isRecovering ||
    ctx.isSwinging ||
    ctx.holdPosition ||
    !ctx.isStriker
  ) {
    return null
  }

  // Opponent serving: ease toward the legal receive stance before the strike.
  if (ctx.phase === 'serving' && ctx.servingPlayer === 'opponent') {
    const box = RECEIVER_POSITIONS[ctx.serviceBox]
    return clampToFloor(box.x, box.z)
  }

  if (ctx.phase !== 'rally') return null

  _playerScratch.set(ctx.playerX, 0.01, ctx.playerZ)
  const intercept = predictInterceptPosition(ctx.ball, ctx.ballVelocity)
  const stand = calculateOptimalAIPosition(intercept, _playerScratch)
  return clampToFloor(stand.x, stand.z)
}

/**
 * Turn an ideal into a nearby nudge target, or null when inside the dead zone.
 */
export function playerAssistNudge(
  playerX: number,
  playerZ: number,
  idealX: number,
  idealZ: number,
): [number, number, number] | null {
  const dx = idealX - playerX
  const dz = idealZ - playerZ
  const dist = Math.hypot(dx, dz)
  if (dist < ASSIST_DEAD_ZONE) return null
  const scale = Math.min(1, ASSIST_MAX_STEP / dist)
  const clamped = clampToFloor(playerX + dx * scale, playerZ + dz * scale)
  return [clamped.x, 0.01, clamped.z]
}

/** Full assist decision for the human athlete this frame. */
export function computePlayerAssist(ctx: PlayerAssistContext): PlayerAssistResult | null {
  const ideal = playerAssistIdeal(ctx)
  if (!ideal) return null
  const target = playerAssistNudge(ctx.playerX, ctx.playerZ, ideal.x, ideal.z)
  if (!target) return null
  return { target, speed: ASSIST_SPEED }
}
