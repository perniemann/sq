/**
 * Diegetic placement — measured tin band + wall start lockup.
 *
 * Tin GLB (`measure:glb`): y 0→0.48, z −4.880→−4.777 (pre-scale). Y is unscaled;
 * Z is multiplied by `COURT_MODEL_SCALE[2]` with the court/tin meshes.
 */
import { COURT, COURT_MODEL_SCALE, FRONT_WALL_Z } from './court'

/** Measured tin mesh height (metres) — matches `tin.glb` / `COURT.tinHeight`. */
export const TIN_HUD_HEIGHT = 0.48

/** Vertical centre of the tin band. */
export const TIN_HUD_Y = TIN_HUD_HEIGHT / 2

/**
 * Authored tin / front-wall court-face Z before `COURT_MODEL_SCALE`
 * (`tin.glb` z max; court planes also list −4.777).
 */
export const TIN_FACE_Z_AUTHORED = -4.777

/** How far court-side of the tin face the HUD sits (metres). */
export const WORLD_HUD_Z_CLEARANCE = 0.08

/**
 * Court-side of the scaled tin face so glyphs are not buried in opaque tin/wall.
 * Must stay ahead of `TIN_FACE_Z_AUTHORED * scaleZ`.
 */
export const WORLD_HUD_Z =
  TIN_FACE_Z_AUTHORED * COURT_MODEL_SCALE[2] + WORLD_HUD_Z_CLEARANCE

/** Draw with the wall — never force over athletes (no elevated renderOrder / depthTest off). */
export const WORLD_HUD_RENDER_ORDER = 0

export const WORLD_HUD = {
  tinHeight: TIN_HUD_HEIGHT,
  /** Vertical centre of glyphs in the tin band (slightly above geometric mid for follow-cam). */
  tinTextY: TIN_HUD_Y + 0.04,
  /** Plate inset from court half-width (metres). */
  plateMarginX: 0.08,
  /** Start lockup on the front wall (demo) — mid face, not tin. */
  startY: 2.35,
  startDistanceFactor: 6.2,
  /** Tin band columns (metres). */
  logoX: -2.55,
  gameplayX: 0,
  scoreX: 2.2,
  scoreDigitGap: 0.28,
  pipGap: 0.07,
  pipBelow: 0.12,
  /** Font sizes must fit inside tinHeight (~0.48). Score 0.28 + outline fits. */
  fontScore: 0.28,
  fontColon: 0.2,
  fontMark: 0.14,
  fontLogo: 0.22,
  fontCallout: 0.2,
  fontPrompt: 0.09,
  fontTeach: 0.08,
  fontGamePoint: 0.085,
  outlineScore: 0.016,
  outlineCallout: 0.01,
  outlinePrompt: 0.005,
} as const

export function scorePlayerX(): number {
  return WORLD_HUD.scoreX - WORLD_HUD.scoreDigitGap
}

export function scoreOpponentX(): number {
  return WORLD_HUD.scoreX + WORLD_HUD.scoreDigitGap
}

export function turnMarkPlayerX(): number {
  return scorePlayerX() - 0.28
}

export function turnMarkOpponentX(): number {
  return scoreOpponentX() + 0.28
}

export function tinPlateWidth(): number {
  return COURT.width - WORLD_HUD.plateMarginX * 2
}

/** Sanity for tests — HUD must sit court-side of both the physics wall and tin face. */
export function worldHudClearsTinFace(): boolean {
  const tinFace = TIN_FACE_Z_AUTHORED * COURT_MODEL_SCALE[2]
  return WORLD_HUD_Z > tinFace && WORLD_HUD_Z > FRONT_WALL_Z
}
