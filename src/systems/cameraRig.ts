/**
 * Gameplay camera rest pose. Shared by Canvas bootstrap and `GameCamera` so the first
 * frame does not pop from a mismatched default.
 */

/** Gallery seat behind the back wall (world metres). */
export const CAMERA_OFFSET = { x: 0, y: 2.4, z: 7.8 } as const

/** Rest subject: slightly behind the T, chest height. */
export const CAMERA_SUBJECT_REST = { x: 0, y: 1.35, z: 0.5 } as const

/** Look nudge toward the front wall so tin / service line stay readable. */
export const CAMERA_LOOK_FRONT_BIAS = { x: 0, y: 0.1, z: -1.4 } as const

/** How far the subject drifts from rest toward the ball (0–1). */
export const BALL_FOLLOW_WEIGHT = 0.42

/** Lateral camera travel as a fraction of half-court width. */
export const CAMERA_X_TRAVEL = 0.4

export const SUBJECT_MIN_Y = 0.4
export const SUBJECT_MAX_Y = 2.8

export const CAMERA_REST_POSITION: [number, number, number] = [
  CAMERA_SUBJECT_REST.x + CAMERA_OFFSET.x,
  CAMERA_SUBJECT_REST.y + CAMERA_OFFSET.y,
  CAMERA_SUBJECT_REST.z + CAMERA_OFFSET.z,
]

export const CAMERA_FOV = 52
