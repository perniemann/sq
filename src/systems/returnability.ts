/**
 * When the ball becomes returnable after a strike.
 *
 * WSF 6.2: a return is only complete once it hits the front wall (directly or after
 * other walls). Side/back contact alone must not re-enable the next strike — that would
 * let a receiver interrupt a boast mid-flight. Floor never restores returnability; volleys
 * after the front wall are still allowed because front-wall contact already set the flag.
 */

/** Court collider `name` that completes the prior return and restores `canHit`. */
export const RETURNABLE_WALL = 'frontWall' as const

/** True when this wall contact should set `canHit` true again after a strike. */
export function wallRestoresCanHit(wallName: string): boolean {
  return wallName === RETURNABLE_WALL
}
