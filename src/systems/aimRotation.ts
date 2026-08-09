/**
 * Maps charge-aim (0–1) onto player yaw for shot selection and ballistics.
 * Kept outside Player.tsx so Scene's shot preview and the mesh use the same curve.
 */

/** Total aim arc (200°), matching the charge indicator. */
export const AIM_ARC_RANGE = (200 * Math.PI) / 180

/** Yaw at aim 0 — facing the front wall (−Z). */
export const AIM_START_ANGLE = 0

/** +1 = clockwise from the player's view. */
export const AIM_DIRECTION = 1

/** Convert aim 0–1 to the yaw `selectShotType` / `calculateShot` expect. */
export function aimToPlayerRotation(aim: number): number {
  const a = Math.max(0, Math.min(1, aim))
  return AIM_START_ANGLE + a * AIM_ARC_RANGE * AIM_DIRECTION
}
