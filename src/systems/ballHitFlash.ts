/**
 * Ball + trail colour flash after a racquet strike. Intensity is charge power (0–1).
 * Player hits pull toward cyan; opponent hits toward a hotter orange punch (readable on
 * the already-orange ball). Pure — no Three/React.
 */

import { HEX } from '../theme/colors'

export type BallHitSide = 'player' | 'opponent'

/** Resting ball colour. */
export const BALL_BASE_COLOR = HEX.ball

/** Player-strike flash target. */
export const BALL_FLASH_PLAYER = HEX.player

/**
 * Opponent-strike flash target — hotter / nearer white than HEX.opponent so the punch
 * reads against the ball's resting orange (opponent neon alone is too close).
 */
export const BALL_FLASH_OPPONENT = '#ffd28a'

/** Minimum flash window (ms) at zero charge. */
export const BALL_HIT_FLASH_BASE_MS = 220

/** Extra duration at full charge (ms). */
export const BALL_HIT_FLASH_POWER_MS = 480

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.startsWith('#') ? hex.slice(1) : hex
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(r: number, g: number, b: number): string {
  const ri = Math.max(0, Math.min(255, Math.round(r)))
  const gi = Math.max(0, Math.min(255, Math.round(g)))
  const bi = Math.max(0, Math.min(255, Math.round(b)))
  return `#${((ri << 16) | (gi << 8) | bi).toString(16).padStart(6, '0')}`
}

function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a)
  const [br, bg, bb] = parseHex(b)
  const u = clamp01(t)
  return toHex(
    ar + (br - ar) * u,
    ag + (bg - ag) * u,
    ab + (bb - ab) * u,
  )
}

export function ballHitFlashDurationMs(intensity: number): number {
  return BALL_HIT_FLASH_BASE_MS + clamp01(intensity) * BALL_HIT_FLASH_POWER_MS
}

/**
 * 0 at rest / after window; peaks near `intensity` just after the hit (ease-out envelope).
 */
export function ballHitFlashMix(
  hitAt: number | null,
  intensity: number,
  now: number,
): number {
  if (hitAt === null) return 0
  const dur = ballHitFlashDurationMs(intensity)
  const elapsed = now - hitAt
  if (elapsed < 0 || elapsed >= dur) return 0
  const t = elapsed / dur
  const envelope = (1 - t) * (1 - t)
  return clamp01(intensity) * envelope
}

export function ballHitFlashAccent(side: BallHitSide): string {
  return side === 'player' ? BALL_FLASH_PLAYER : BALL_FLASH_OPPONENT
}

/** Current display hex for ball mesh / trail / markers. */
export function ballHitFlashColor(
  hitAt: number | null,
  intensity: number,
  side: BallHitSide | null,
  now: number,
): string {
  if (side === null) return BALL_BASE_COLOR
  const mix = ballHitFlashMix(hitAt, intensity, now)
  if (mix <= 0) return BALL_BASE_COLOR
  return lerpHex(BALL_BASE_COLOR, ballHitFlashAccent(side), mix)
}
