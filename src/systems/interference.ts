import * as THREE from 'three'
import type { PlayerSide } from './scoring'

/**
 * Interference (WSF Rule 8)
 *
 * With a shared court both players can occupy the same ground, so obstruction stops being
 * an edge case and becomes a rule that has to be judged every rally. The rule distinguishes
 * two outcomes that the previous inline check collapsed into one:
 *
 * - **Let** (Rule 8.7): the striker was obstructed but would not clearly have won the
 *   rally. The rally is replayed, nobody scores, and the serve stays in the same box.
 * - **Stroke** (Rule 8.8): the obstruction denied a winning shot — specifically, the ball
 *   going straight to the front wall would have struck the opponent. The striker wins the
 *   rally.
 *
 * Everything here is pure geometry on the horizontal plane; heights are ignored because
 * both bodies stand on the floor.
 */

export type InterferenceCall = 'none' | 'let' | 'stroke'

/**
 * How close the two players have to be before obstruction is even considered (metres).
 * Beyond this the striker has room to play regardless of angle.
 */
export const INTERFERENCE_RADIUS = 0.9

/**
 * How close the ball has to be to the striker before they count as playing it (metres).
 * Two players brushing past each other in mid-court while the ball is away at the front
 * wall is not interference — the striker was not being denied anything yet.
 */
export const PLAYING_DISTANCE = 2.5

/**
 * How long the obstruction has to persist before it is called (ms). A momentary crossing
 * is not interference; in the real game the striker has to be actually held up. The timer
 * is the caller's to keep, so this module stays a pure judgement.
 */
export const INTERFERENCE_HOLD_MS = 250

/**
 * Closest the two bodies may stand (metres). Enforced separately from the rule so the
 * models never interpenetrate now that both can reach every part of the floor.
 */
export const MIN_SEPARATION = 0.6

/**
 * How aligned the non-striker has to be with the striker's line to the ball before it
 * counts as blocking access. cos(60°) — a 60° cone either side of that line.
 */
const BLOCKS_ACCESS_DOT = 0.5

/**
 * How aligned the non-striker has to be with the ball's straight line to the front wall
 * before the denied shot counts as a winner. cos(~32°) — tighter than the access test,
 * because a stroke requires the ball to have actually been going to hit them.
 */
const BLOCKS_SHOT_DOT = 0.85

/**
 * The line a straight drive takes to the front wall: down the court, parallel to the side
 * walls.
 *
 * This was previously built from a `frontWallZ` parameter and a target at the ball's own x,
 * which is this same vector by construction — the target shares the ball's x, so the
 * direction is (0, 0, -1) for every ball on the court and the parameter contributed nothing
 * but its sign. The straight-drive assumption is the substance of WSF Rule 8.8 here: the
 * stroke is owed when the ball played straight would have struck the opponent, not when
 * some other shot the striker might have chosen would have.
 */
const DOWN_COURT = new THREE.Vector3(0, 0, -1)

export interface InterferenceInput {
  /** The player whose turn it is to return the ball. */
  strikerPosition: THREE.Vector3
  /** The player who has just hit and must clear the way. */
  nonStrikerPosition: THREE.Vector3
  ballPosition: THREE.Vector3
  /**
   * Whether the striker is actually going for the ball. Standing near a stationary
   * opponent between rallies is not interference.
   */
  strikerIsPlaying: boolean
}

/** Horizontal (xz) direction from `from` to `to`, or null when the two coincide. */
function planarDirection(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 | null {
  const dir = new THREE.Vector3(to.x - from.x, 0, to.z - from.z)
  const length = dir.length()
  if (length < 1e-4) return null
  return dir.divideScalar(length)
}

/** Horizontal distance between two positions. */
export function planarDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

/**
 * Judge whether the non-striker is interfering, and if so how severely.
 *
 * @returns `'none'` when the striker has room, `'let'` when access was obstructed, and
 *   `'stroke'` when the obstruction stood in the line of a shot to the front wall.
 */
export function judgeInterference(input: InterferenceInput): InterferenceCall {
  const { strikerPosition, nonStrikerPosition, ballPosition, strikerIsPlaying } = input

  if (!strikerIsPlaying) return 'none'
  if (planarDistance(strikerPosition, ballPosition) > PLAYING_DISTANCE) return 'none'
  if (planarDistance(strikerPosition, nonStrikerPosition) > INTERFERENCE_RADIUS) return 'none'

  const toBall = planarDirection(strikerPosition, ballPosition)
  const toBlocker = planarDirection(strikerPosition, nonStrikerPosition)
  if (!toBall || !toBlocker) return 'none'

  // The opponent is beside the striker rather than in the way.
  if (toBall.dot(toBlocker) < BLOCKS_ACCESS_DOT) return 'none'

  // Rule 8.8: the ball driven straight to the front wall would have hit them. This also
  // covers the "behind the ball" case on its own — a blocker up-court of the ball scores a
  // negative dot against DOWN_COURT and cannot reach the threshold.
  const ballToBlocker = planarDirection(ballPosition, nonStrikerPosition)
  if (ballToBlocker && DOWN_COURT.dot(ballToBlocker) > BLOCKS_SHOT_DOT) {
    return 'stroke'
  }

  return 'let'
}

/**
 * A running obstruction, held across frames.
 *
 * The timer lives here rather than in `Scene.tsx` so that the judgement-to-award path is
 * testable without a renderer. It previously sat in `useFrame` as a pair of refs keyed only
 * on the call value, which let a stroke earned by one player be awarded to the other: the
 * striker changes the moment the ball is struck, the geometry does not change with it, so
 * the timer kept running across the handover and fired against the new striker — who was
 * the player that had caused the obstruction.
 */
export interface InterferenceWatch {
  call: InterferenceCall
  /** Who was owed the clear shot while this obstruction was running. */
  striker: PlayerSide | null
  /** When the current obstruction started (ms). */
  since: number
}

export function createInterferenceWatch(): InterferenceWatch {
  return { call: 'none', striker: null, since: 0 }
}

/**
 * Advance the obstruction timer by a frame.
 *
 * A momentary crossing is not interference — in the real game the striker has to be actually
 * held up — so a call is only awarded once the same obstruction against the same striker has
 * persisted for `holdMs`.
 *
 * @returns the next watch state, and the call to award now (`'none'` on all other frames)
 */
export function accumulateInterference(
  previous: InterferenceWatch,
  call: InterferenceCall,
  striker: PlayerSide,
  now: number,
  holdMs: number = INTERFERENCE_HOLD_MS
): { watch: InterferenceWatch; award: InterferenceCall } {
  if (call === 'none') {
    return { watch: createInterferenceWatch(), award: 'none' }
  }

  // A different call, or the same obstruction now owed to the other player, is a new
  // obstruction and starts the clock again.
  if (call !== previous.call || striker !== previous.striker) {
    return { watch: { call, striker, since: now }, award: 'none' }
  }

  if (now - previous.since >= holdMs) {
    // Cleared rather than left running, so one obstruction awards one call.
    return { watch: createInterferenceWatch(), award: call }
  }

  return { watch: previous, award: 'none' }
}

/**
 * Push `position` away from `other` until they are `minSeparation` apart, leaving `other`
 * untouched. The caller decides which body yields — the human player never does, so the
 * AI is the one moved.
 *
 * @returns a new position, or a copy of the original when they are already far enough apart
 */
export function separate(
  position: THREE.Vector3,
  other: THREE.Vector3,
  minSeparation: number = MIN_SEPARATION
): THREE.Vector3 {
  const gap = planarDistance(position, other)
  if (gap >= minSeparation) return position.clone()

  const away = planarDirection(other, position)
  // Exactly coincident: no direction to push along, so pick one rather than divide by zero.
  const push = away ?? new THREE.Vector3(0, 0, 1)
  return new THREE.Vector3(
    other.x + push.x * minSeparation,
    position.y,
    other.z + push.z * minSeparation
  )
}
