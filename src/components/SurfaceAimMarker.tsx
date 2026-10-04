import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { displayAlpha } from '../config'
import { chargeDurationToPower, useInputStore } from '../hooks/useInput'
import { isInStrikeRange } from '../systems/hitTiming'
import {
  fillPreviewLaunch,
  predictSurfaceContact,
  type BallisticLaunch,
  type CourtSurface,
  type SurfaceContact,
} from '../systems/predictedContact'
import { COURT } from '../systems/court'
import { useGameStore } from '../stores/gameStore'
import { HEX } from '../theme/colors'

/** Half-extent of the aim cross (metres). Smaller than the live ball grid. */
const CROSS_HALF = 0.11

/** Keep the cross just off the surface so court meshes do not z-fight it. */
const PREDICT_SURFACE_INSET = 0.01

function createCrossGeometry(): THREE.BufferGeometry {
  const s = CROSS_HALF
  const positions = new Float32Array([
    -s, 0, 0, s, 0, 0,
    0, 0, -s, 0, 0, s,
  ])
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return geometry
}

/**
 * Lay an XZ cross on the contact face. Rotations match the live impact grid.
 */
function placeCross(
  surface: CourtSurface,
  contact: SurfaceContact,
  mesh: THREE.LineSegments,
): void {
  const halfW = COURT.width / 2
  const halfL = COURT.length / 2
  switch (surface) {
    case 'floor':
      mesh.position.set(contact.x, PREDICT_SURFACE_INSET, contact.z)
      mesh.rotation.set(0, 0, 0)
      return
    case 'front':
      mesh.position.set(contact.x, contact.y, -halfL + PREDICT_SURFACE_INSET)
      mesh.rotation.set(Math.PI / 2, 0, 0)
      return
    case 'back':
      mesh.position.set(contact.x, contact.y, halfL - PREDICT_SURFACE_INSET)
      mesh.rotation.set(-Math.PI / 2, 0, 0)
      return
    case 'left':
      mesh.position.set(-halfW + PREDICT_SURFACE_INSET, contact.y, contact.z)
      mesh.rotation.set(0, 0, -Math.PI / 2)
      return
    case 'right':
      mesh.position.set(halfW - PREDICT_SURFACE_INSET, contact.y, contact.z)
      mesh.rotation.set(0, 0, Math.PI / 2)
  }
}

interface SurfaceAimMarkerProps {
  ballRef: React.RefObject<RapierRigidBody | null>
  playerPositionVec: React.MutableRefObject<THREE.Vector3>
}

/**
 * First-surface cross while the human is aiming.
 * Serve: the whole charge, from the held ball. Rally: only inside strike range,
 * and only after the shot name has committed, so the cross does not jump ahead of the label.
 */
export default function SurfaceAimMarker({
  ballRef,
  playerPositionVec,
}: SurfaceAimMarkerProps): React.ReactElement {
  const meshRef = useRef<THREE.LineSegments>(null)
  const geometry = useMemo(() => createCrossGeometry(), [])
  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: HEX.player,
        transparent: true,
        opacity: displayAlpha(0.85),
        depthWrite: false,
      }),
    [],
  )
  const launchRef = useRef<BallisticLaunch>({
    origin: { x: 0, y: 0, z: 0 },
    direction: { x: 0, y: 0, z: 0 },
    speed: 0,
    serve: false,
  })
  const contactRef = useRef<SurfaceContact>({
    surface: 'front',
    x: 0,
    y: 0,
    z: 0,
    time: 0,
    kind: 'play',
  })

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const store = useGameStore.getState()
    const input = useInputStore.getState()
    const aiming =
      !store.demoMode &&
      input.buttonA.pressed &&
      store.canHit &&
      store.currentStriker === 'player' &&
      (store.phase === 'serving' || store.phase === 'rally')

    if (!aiming) {
      mesh.visible = false
      return
    }

    const launch = launchRef.current
    const contact = contactRef.current
    const power = chargeDurationToPower(input.buttonA.holdDuration)
    let filled = false

    if (store.phase === 'serving') {
      filled = fillPreviewLaunch({
        kind: 'serve',
        serviceBox: store.serviceBox,
        aim: input.aim,
        loft: input.loft,
        power,
      }, launch)
    } else {
      const body = ballRef.current
      if (!body) {
        mesh.visible = false
        return
      }
      const ball = body.translation()
      const player = playerPositionVec.current
      if (!isInStrikeRange(player, ball)) {
        mesh.visible = false
        return
      }
      if (!store.currentShotType) {
        mesh.visible = false
        return
      }
      filled = fillPreviewLaunch({
        kind: 'rally',
        playerPosition: player,
        ballPosition: ball,
        aim: input.aim,
        loft: input.loft,
        power,
        shotType: store.currentShotType,
      }, launch)
    }

    if (!filled || !predictSurfaceContact(launch, contact)) {
      mesh.visible = false
      return
    }

    placeCross(contact.surface, contact, mesh)
    material.color.set(contact.kind === 'fault' ? HEX.tinDanger : HEX.player)
    mesh.visible = true
  })

  return (
    <lineSegments
      ref={meshRef}
      geometry={geometry}
      material={material}
      visible={false}
      frustumCulled={false}
    />
  )
}
