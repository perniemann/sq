import * as THREE from 'three'

/**
 * Divisions of the live ball floor grid and its impact pulse.
 * Shared so the charge-aim marker cannot drift from that grid.
 */
export const GRID_DIVISIONS = 3

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
