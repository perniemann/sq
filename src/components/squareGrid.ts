import * as THREE from 'three'

/**
 * Live ball floor grid and wall impact pulse.
 * The charge-aim marker imports these so its grid cannot drift.
 */
export const GRID_DIVISIONS = 3
export const MARKER_Y = 0.008
export const MARKER_MIN_SCALE = 0.1
export const MARKER_GROWTH_PER_METRE = 0.07
/** Keep grids slightly off surfaces so court meshes do not z-fight them. */
export const SURFACE_INSET = 0.012
export const PULSE_WALL_SCALE = 0.2

/** Axis-aligned square grid in the XZ plane, centred at the origin. */
export function createSquareGridGeometry(
  halfExtent: number,
  divisions: number,
): THREE.BufferGeometry {
  const positions: number[] = []
  const step = (halfExtent * 2) / divisions
  for (let i = 0; i <= divisions; i++) {
    const t = -halfExtent + i * step
    positions.push(-halfExtent, 0, t, halfExtent, 0, t)
    positions.push(t, 0, -halfExtent, t, 0, halfExtent)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geometry
}
