/**
 * Court dimensions and the rules that derive directly from them (metres).
 *
 * These are plain numbers with no rendering or physics attached, so they live here rather
 * than in `components/Court.tsx` where they used to sit. Four non-component modules
 * (`systems/ai`, `systems/courtPositions`, `systems/shotContext`, `hooks/useBallCollisionHandlers`)
 * need them, and importing them from a component dragged React, drei and Rapier into
 * otherwise pure code — which both breaks the `systems/` purity rule and makes the modules
 * untestable outside a browser.
 *
 * Out-line heights follow WSF rules. Colliders use these values; GLB visuals that differ are
 * Court/tin visuals that differ from WSF are corrected with `COURT_MODEL_SCALE`. The athlete
 * and ball meshes are authored at the sizes used in-game (scale 1); see `npm run measure:glb`.
 */
import { HEX } from '../theme/colors'

export const COURT = {
  length: 9.75,           // Front to back
  width: 6.4,             // Side to side
  height: 4.57,           // Front wall out-line height (15 feet)
  backWallHeight: 2.13,   // Back wall out-line height (7 feet)
  // WSF minimum clear height above the floor. Above this the ball has hit the ceiling,
  // which is out anywhere on court — unlike the side-wall out line, which only applies
  // where the ball actually contacts that wall.
  clearHeight: 5.64,
  tinHeight: 0.48,        // Tin line height from floor
  serviceLineHeight: 1.78, // Service line height on front wall (WSF official: 1.78m)
  wallThickness: 0.1,
  // WSF: Short line is 4.26m from back wall
  // z = halfLength - 4.26 = 4.875 - 4.26 = 0.615m
  shortLineZ: 0.615,
  // Service boxes are 1.6m x 1.6m squares just BEHIND the short line
  // Box front edge touches short line, back edge is 1.6m behind
  serviceBoxSize: 1.6
}

/** Z of the front wall. Negative, since the front wall is at -length/2. */
export const FRONT_WALL_Z = -COURT.length / 2

/**
 * Athlete size equals the authored `player.glb` (scale 1). Wall inset and interference use
 * half the mesh width so logic matches what you see.
 */
export const ATHLETE_SIZE = { width: 1.031, height: 1.5, depth: 0.893 }

/** How close to a wall an athlete's centre may stand — half the body width. */
export const ATHLETE_INSET = ATHLETE_SIZE.width / 2

/** Physics / visual ball radius (metres). Collider stays here; `ball.glb` is scaled to fit. */
export const BALL_RADIUS = 0.02

/**
 * Bounding boxes of the shipped GLB models, in metres, as authored.
 * Reproduce with `npm run measure:glb`.
 */
export const MODEL_SIZE = {
  /** Art court is wider than WSF; X/Z are scaled onto `COURT` at render time. */
  court: { width: 8.42, height: 4.62, length: 9.76 },
  athlete: {
    width: 1.031,
    height: 1.5,
    depth: 0.893,
    zMin: -0.314,
    zMax: 0.579,
  },
  /**
   * Racquet as authored: grip near y=0, head toward +Y. Face lies in YZ (thin in X), so the
   * loader rotates +90° about Y to put the string bed in XY facing ±Z for the swing system.
   */
  racquet: { width: 0.03, height: 0.607, depth: 0.225 },
  /** Slightly ellipsoidal icosphere; scaled uniformly to `2 * BALL_RADIUS`. */
  ball: { width: 0.069, height: 0.078, depth: 0.066 },
}

/**
 * Per-axis correction for court + tin GLBs onto the WSF colliders.
 *
 * Authored court/tin are 8.42 m wide; physics stays at `COURT.width` 6.4. Y is left alone —
 * out-lines are already at 2.13 / 4.57; the 4.62 bbox is a wall cap above the front out-line.
 */
export const COURT_MODEL_SCALE: [number, number, number] = [
  COURT.width / MODEL_SIZE.court.width,
  1,
  COURT.length / MODEL_SIZE.court.length,
]

/** Player mesh is used as authored — no code scale. */
export const ATHLETE_MODEL_SCALE: [number, number, number] = [1, 1, 1]

/**
 * Recentres the athlete mesh on the gameplay position. The cone is drawn ahead of its
 * origin; this is a translation only, not a scale.
 */
export const ATHLETE_MODEL_Z_OFFSET =
  -((MODEL_SIZE.athlete.zMax + MODEL_SIZE.athlete.zMin) / 2)

/** Uniform scale so `ball.glb` matches the physics diameter `2 * BALL_RADIUS`. */
export const BALL_MODEL_SCALE =
  (BALL_RADIUS * 2) / Math.max(MODEL_SIZE.ball.width, MODEL_SIZE.ball.height, MODEL_SIZE.ball.depth)

/** Shared GLB accent-material name (`mat_a` = fill, `mat_b` = bright edges/lines). */
export const GLB_ACCENT_MATERIAL = 'mat_b'

/** Court line accent — default tin colour. */
export const COURT_LINE_COLOR = HEX.courtLine

/** Tin flash when the ball strikes it. */
export const TIN_DANGER_COLOR = HEX.tinDanger

/** How long the tin stays orange after a ball hit (ms, `performance.now` clock). */
export const TIN_HIT_FLASH_MS = 900

/** Cyan by default; orange only while a recent tin hit is still flashing. */
export function tinAccentColor(tinHitAt: number | null, now: number): typeof COURT_LINE_COLOR | typeof TIN_DANGER_COLOR {
  if (tinHitAt !== null && now - tinHitAt < TIN_HIT_FLASH_MS) return TIN_DANGER_COLOR
  return COURT_LINE_COLOR
}

/**
 * Calculate the out-line height at a given Z position
 *
 * WSF rules specify:
 * - Front wall out-line: 4.57m
 * - Back wall out-line: 2.13m
 * - Side walls: Linear interpolation between front and back
 *
 * @param z - Z position on court (negative = front, positive = back)
 * @returns Height of the out-line at that Z position
 */
export function getOutLineHeight(z: number): number {
  const halfLength = COURT.length / 2
  // Clamp z to court bounds
  const clampedZ = Math.max(-halfLength, Math.min(halfLength, z))
  // t = 0 at front wall (-halfLength), t = 1 at back wall (+halfLength)
  const t = (clampedZ + halfLength) / COURT.length
  // Linearly interpolate from front height to back height
  return COURT.height - t * (COURT.height - COURT.backWallHeight)
}
