import * as THREE from 'three'
import { COURT } from './court'

/**
 * Service box positions (official WSF court layout)
 *
 * WSF rules:
 * - Short line is 4.26m from back wall (COURT.shortLineZ = 0.615m)
 * - Service boxes are 1.6m x 1.6m squares just BEHIND the short line
 * - Front edge of box touches short line, back edge is 1.6m behind
 * - Service boxes touch the SIDE WALLS (not the center line)
 *
 * Box center X: width/2 - boxSize/2 = 3.2 - 0.8 = ±2.4m
 * Box center Z: shortLineZ + boxSize/2 = 0.615 + 0.8 = 1.415m
 */
const serviceBoxCenterZ = COURT.shortLineZ + COURT.serviceBoxSize / 2
const serviceBoxCenterX = COURT.width / 2 - COURT.serviceBoxSize / 2

export const SERVICE_BOX_POSITIONS = {
  right: { x: serviceBoxCenterX, z: serviceBoxCenterZ },
  left: { x: -serviceBoxCenterX, z: serviceBoxCenterZ },
} as const

/**
 * Receiver positions (opposite back quarter from service box)
 * - Right box serve → receiver in back-left quarter
 * - Left box serve → receiver in back-right quarter
 *
 * Midpoint between the short line and the back wall (not shortLine averaged with itself).
 */
export const RECEIVER_Z =
  COURT.shortLineZ + (COURT.length / 2 - COURT.shortLineZ) / 2

export const RECEIVER_POSITIONS = {
  right: { x: -serviceBoxCenterX, z: RECEIVER_Z },
  left: { x: serviceBoxCenterX, z: RECEIVER_Z },
} as const

/**
 * The T — the intersection of the short line and the half-court line, and the position
 * both players recover to between shots. Squash has no net and no sides, so there is one
 * T and both players contend for it; see `systems/interference.ts` for how the
 * non-striker yields it.
 *
 * Players stand fractionally behind the T rather than on it, so the recovery target is
 * offset back from the short line.
 */
export const T_POSITION = new THREE.Vector3(0, 0.01, COURT.shortLineZ + 0.35)
