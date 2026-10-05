import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { displayAlpha } from '../config'
import { chargeDurationToPower, useInputStore } from '../hooks/useInput'
import { isInStrikeRange } from '../systems/hitTiming'
import {
  ballisticPointAt,
  fillPreviewLaunch,
  predictSurfaceContact,
  type BallisticLaunch,
  type BallisticPoint,
  type CourtSurface,
  type SurfaceContact,
} from '../systems/predictedContact'
import { COURT } from '../systems/court'
import type { ServiceBox } from '../systems/serveRules'
import type { ShotType } from '../systems/shotContext'
import { useGameStore } from '../stores/gameStore'
import { HEX } from '../theme/colors'
import {
  createSquareGridGeometry,
  GRID_DIVISIONS,
  MARKER_GROWTH_PER_METRE,
  MARKER_MIN_SCALE,
  MARKER_Y,
  PULSE_WALL_SCALE,
  SURFACE_INSET,
} from './squareGrid'

/** Samples along the flight, plus one vertex on the contact grid. */
const ARC_SEGMENTS = 16

const _arcPoint: BallisticPoint = { x: 0, y: 0, z: 0 }

function placeAimGrid(
  surface: CourtSurface,
  contact: SurfaceContact,
  ballHeight: number,
  mesh: THREE.LineSegments,
): void {
  const halfW = COURT.width / 2
  const halfL = COURT.length / 2
  const scale = surface === 'floor'
    ? MARKER_MIN_SCALE + ballHeight * MARKER_GROWTH_PER_METRE
    : PULSE_WALL_SCALE
  mesh.scale.setScalar(scale)
  switch (surface) {
    case 'floor':
      mesh.position.set(contact.x, MARKER_Y, contact.z)
      mesh.rotation.set(0, 0, 0)
      return
    case 'front':
      mesh.position.set(contact.x, contact.y, -halfL + SURFACE_INSET)
      mesh.rotation.set(Math.PI / 2, 0, 0)
      return
    case 'back':
      mesh.position.set(contact.x, contact.y, halfL - SURFACE_INSET)
      mesh.rotation.set(-Math.PI / 2, 0, 0)
      return
    case 'left':
      mesh.position.set(-halfW + SURFACE_INSET, contact.y, contact.z)
      mesh.rotation.set(0, 0, -Math.PI / 2)
      return
    case 'right':
      mesh.position.set(halfW - SURFACE_INSET, contact.y, contact.z)
      mesh.rotation.set(0, 0, Math.PI / 2)
  }
}

function writeAimArc(
  launch: BallisticLaunch,
  contact: SurfaceContact,
  grid: THREE.LineSegments,
  geometry: THREE.BufferGeometry,
): void {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute
  const last = ARC_SEGMENTS
  for (let i = 0; i < last; i++) {
    ballisticPointAt(launch, contact.time * (i / last), _arcPoint)
    positions.setXYZ(i, _arcPoint.x, _arcPoint.y, _arcPoint.z)
  }
  positions.setXYZ(last, grid.position.x, grid.position.y, grid.position.z)
  positions.needsUpdate = true
  geometry.computeBoundingSphere()
}

interface SurfaceAimMarkerProps {
  ballRef: React.RefObject<RapierRigidBody | null>
  playerPositionVec: React.MutableRefObject<THREE.Vector3>
}

/**
 * Ballistic aim arc while the human is charging, ending on the pixel contact grid.
 * Serve: the whole charge, from the held ball. Rally: only inside strike range,
 * and only after the shot name has committed, so the arc does not jump ahead of the label.
 */
export default function SurfaceAimMarker({
  ballRef,
  playerPositionVec,
}: SurfaceAimMarkerProps): React.ReactElement {
  const rootRef = useRef<THREE.Group>(null)
  const gridRef = useRef<THREE.LineSegments>(null)
  const gridGeometry = useMemo(() => createSquareGridGeometry(1, GRID_DIVISIONS), [])
  const arcGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array((ARC_SEGMENTS + 1) * 3), 3),
    )
    return geometry
  }, [])
  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: HEX.player,
        transparent: true,
        opacity: displayAlpha(0.9),
        depthWrite: false,
      }),
    [],
  )
  const arcLine = useMemo(() => {
    const line = new THREE.Line(arcGeometry, material)
    line.frustumCulled = false
    return line
  }, [arcGeometry, material])
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
  const serveInputRef = useRef({
    kind: 'serve' as const,
    serviceBox: 'right' as ServiceBox,
    aim: 0,
    loft: 0,
    power: 0,
  })
  const rallyInputRef = useRef({
    kind: 'rally' as const,
    playerPosition: { x: 0, y: 0, z: 0 },
    ballPosition: { x: 0, y: 0, z: 0 },
    aim: 0,
    loft: 0,
    power: 0,
    shotType: null as ShotType | null,
  })

  useFrame(() => {
    const root = rootRef.current
    const grid = gridRef.current
    if (!root || !grid) return

    const store = useGameStore.getState()
    const input = useInputStore.getState()
    const aiming =
      !store.demoMode &&
      input.buttonA.pressed &&
      store.canHit &&
      store.currentStriker === 'player' &&
      (store.phase === 'serving' || store.phase === 'rally')

    if (!aiming) {
      root.visible = false
      return
    }

    const launch = launchRef.current
    const contact = contactRef.current
    const power = chargeDurationToPower(input.buttonA.holdDuration)
    let filled = false

    if (store.phase === 'serving') {
      const serveInput = serveInputRef.current
      serveInput.serviceBox = store.serviceBox
      serveInput.aim = input.aim
      serveInput.loft = input.loft
      serveInput.power = power
      filled = fillPreviewLaunch(serveInput, launch)
    } else {
      const body = ballRef.current
      if (!body) {
        root.visible = false
        return
      }
      const ball = body.translation()
      const player = playerPositionVec.current
      if (!isInStrikeRange(player, ball)) {
        root.visible = false
        return
      }
      if (!store.currentShotType) {
        root.visible = false
        return
      }
      const rallyInput = rallyInputRef.current
      rallyInput.playerPosition.x = player.x
      rallyInput.playerPosition.y = player.y
      rallyInput.playerPosition.z = player.z
      rallyInput.ballPosition.x = ball.x
      rallyInput.ballPosition.y = ball.y
      rallyInput.ballPosition.z = ball.z
      rallyInput.aim = input.aim
      rallyInput.loft = input.loft
      rallyInput.power = power
      rallyInput.shotType = store.currentShotType
      filled = fillPreviewLaunch(rallyInput, launch)
    }

    if (!filled || !predictSurfaceContact(launch, contact)) {
      root.visible = false
      return
    }

    placeAimGrid(contact.surface, contact, launch.origin.y, grid)
    writeAimArc(launch, contact, grid, arcGeometry)
    material.color.set(contact.kind === 'fault' ? HEX.tinDanger : HEX.player)
    root.visible = true
  })

  return (
    <group ref={rootRef} visible={false}>
      <primitive object={arcLine} />
      <lineSegments
        ref={gridRef}
        geometry={gridGeometry}
        material={material}
        frustumCulled={false}
      />
    </group>
  )
}
