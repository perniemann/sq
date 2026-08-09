import { ATHLETE_INSET, COURT } from './court'

/** Explicit Shift-chase speed (m/s). Soft assist uses `ASSIST_SPEED` instead. */
export const PLAYER_CHASE_SPEED = 10

/**
 * Where the human athlete runs when holding chase (Shift / left touch).
 * Full floor is legal — do not pin Z behind the short line; that left the player
 * stuck near the T while the ball was returned into the front court (demo AI
 * has no such clamp, which is why demo looked fine and human play did not).
 */
export function playerChaseTarget(
  ballX: number,
  ballZ: number,
): [number, number, number] {
  const minX = -COURT.width / 2 + ATHLETE_INSET
  const maxX = COURT.width / 2 - ATHLETE_INSET
  const minZ = -COURT.length / 2 + ATHLETE_INSET
  const maxZ = COURT.length / 2 - ATHLETE_INSET
  return [
    Math.max(minX, Math.min(maxX, ballX)),
    0.01,
    Math.max(minZ, Math.min(maxZ, ballZ)),
  ]
}
