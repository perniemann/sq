import { useMemo, useRef, type ReactElement } from 'react'
import { RigidBody, CuboidCollider, ConvexHullCollider } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import {
  COURT,
  COURT_MODEL_SCALE,
  COURT_LINE_COLOR,
  GLB_ACCENT_MATERIAL,
  tinAccentColor,
} from '../systems/court'
import { useGameStore } from '../stores/gameStore'
import { bounceCoefficients } from '../config'

const COURT_MODEL_PATH = '/models/court.glb'
const TIN_MODEL_PATH = '/models/tin.glb'

/**
 * Generate vertices for a trapezoidal side wall collider
 * The wall slopes from frontHeight at the front to backHeight at the back
 * 
 * @param side - 'left' (-1) or 'right' (+1)
 * @param frontHeight - Height at front wall
 * @param backHeight - Height at back wall
 * @param length - Court length
 * @param thickness - Wall thickness
 */
function createSideWallVertices(
  side: number,
  frontHeight: number,
  backHeight: number,
  length: number,
  thickness: number
): Float32Array {
  const halfLength = length / 2
  
  // X positions for inner and outer surfaces
  // Inner surface is AT the court edge (width/2), wall extends OUTWARD
  const xInner = side * (COURT.width / 2)
  const xOuter = side * (COURT.width / 2 + thickness)
  
  // 8 vertices forming a trapezoidal prism
  // Front is at -halfLength (negative Z), back is at +halfLength (positive Z)
  const vertices = new Float32Array([
    // Inner surface (facing court)
    xInner, 0, -halfLength,           // 0: bottom front inner
    xInner, 0, halfLength,            // 1: bottom back inner
    xInner, frontHeight, -halfLength, // 2: top front inner
    xInner, backHeight, halfLength,   // 3: top back inner
    
    // Outer surface (outside court)
    xOuter, 0, -halfLength,           // 4: bottom front outer
    xOuter, 0, halfLength,            // 5: bottom back outer
    xOuter, frontHeight, -halfLength, // 6: top front outer
    xOuter, backHeight, halfLength,   // 7: top back outer
  ])
  
  return vertices
}

// Set to true to visualize collider boundaries (for debugging)
const DEBUG_COLLIDERS = false

function applyCourtMaterials(
  root: THREE.Object3D,
  color: string,
  fillOpacity: number,
  label: string
): THREE.Object3D {
  let accentMeshes = 0

  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const originalMat = Array.isArray(child.material) ? child.material[0] : child.material
      const matName = originalMat?.name?.toLowerCase() ?? ''

      if (matName === GLB_ACCENT_MATERIAL) {
        accentMeshes++
        child.material = new THREE.MeshBasicMaterial({
          color,
          transparent: false,
          side: THREE.DoubleSide,
        })
      } else {
        child.material = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: fillOpacity,
          side: THREE.DoubleSide,
        })
      }
    }
  })

  if (accentMeshes === 0) {
    console.warn(
      `${label}: no mesh used "${GLB_ACCENT_MATERIAL}"; bright edges will be missing.`
      + ' Re-run `npm run measure:glb` and update GLB_ACCENT_MATERIAL.'
    )
  }

  return root
}

/** Paint every MeshBasicMaterial on a court/tin root (fill + accent share the hue). */
function setCourtRootColor(root: THREE.Object3D, color: string): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const mats = Array.isArray(child.material) ? child.material : [child.material]
    for (const mat of mats) {
      if (mat instanceof THREE.MeshBasicMaterial) mat.color.set(color)
    }
  })
}

/**
 * Tin band from `tin.glb` — same world origin as the court.
 * Matches court lines until the ball hits it, then flashes orange briefly.
 * Scaled with `COURT_MODEL_SCALE` so it tracks the court onto the WSF colliders.
 */
function TinModel(): ReactElement {
  const { scene } = useGLTF(TIN_MODEL_PATH)
  const colorRef = useRef<string>(COURT_LINE_COLOR)

  const tinModel = useMemo(
    () => applyCourtMaterials(scene.clone(), COURT_LINE_COLOR, 0.35, 'Tin'),
    [scene]
  )

  useFrame(() => {
    const next = tinAccentColor(useGameStore.getState().tinHitAt, performance.now())
    if (next === colorRef.current) return
    colorRef.current = next
    setCourtRootColor(tinModel, next)
  })

  return <primitive object={tinModel} position={[0, 0, 0]} scale={COURT_MODEL_SCALE} />
}

export default function Court() {
  const halfLength = COURT.length / 2
  const t = COURT.wallThickness
  const bounce = bounceCoefficients()

  const { scene } = useGLTF(COURT_MODEL_PATH)
  
  const courtModel = useMemo(
    () => applyCourtMaterials(scene.clone(), COURT_LINE_COLOR, 0.02, 'Court'),
    [scene]
  )
  
  const leftWallVertices = useMemo(() => 
    createSideWallVertices(-1, COURT.height, COURT.backWallHeight, COURT.length, t),
    [t]
  )
  
  const rightWallVertices = useMemo(() => 
    createSideWallVertices(1, COURT.height, COURT.backWallHeight, COURT.length, t),
    [t]
  )

  return (
    <group>
      <primitive object={courtModel} position={[0, 0, 0]} scale={COURT_MODEL_SCALE} />
      <TinModel />
      
      {/* ===== PHYSICS COLLIDERS (invisible) ===== */}
      
      {/* Floor collider */}
      <RigidBody type="fixed" colliders={false} restitution={bounce.floor} friction={0.55} name="floor">
        <CuboidCollider 
          args={[COURT.width / 2, t / 2, COURT.length / 2]} 
          position={[0, -t / 2, 0]} 
        />
      </RigidBody>
      
      {/* Front wall - full height (4.57m) */}
      {/* Extended width to cover side wall thickness and prevent corner gaps */}
      <RigidBody 
        type="fixed" 
        colliders={false}
        position={[0, COURT.height / 2, -halfLength - t / 2]}
        restitution={bounce.wall}
        friction={0.45}
        name="frontWall"
      >
        <CuboidCollider args={[COURT.width / 2 + t, COURT.height / 2, t / 2]} />
      </RigidBody>
      
      {/* Back wall - shorter height (2.13m) */}
      {/* Extended width to cover side wall thickness and prevent corner gaps */}
      <RigidBody 
        type="fixed" 
        colliders={false}
        position={[0, COURT.backWallHeight / 2, halfLength + t / 2]}
        restitution={bounce.wall}
        friction={0.45}
        name="backWall"
      >
        <CuboidCollider args={[COURT.width / 2 + t, COURT.backWallHeight / 2, t / 2]} />
      </RigidBody>
      
      {/* Left wall - trapezoidal (slopes from 4.57m front to 2.13m back) */}
      <RigidBody 
        type="fixed" 
        colliders={false}
        restitution={bounce.wall}
        friction={0.45}
        name="leftWall"
      >
        <ConvexHullCollider args={[leftWallVertices]} />
      </RigidBody>
      
      {/* Right wall - trapezoidal (slopes from 4.57m front to 2.13m back) */}
      <RigidBody 
        type="fixed" 
        colliders={false}
        restitution={bounce.wall}
        friction={0.45}
        name="rightWall"
      >
        <ConvexHullCollider args={[rightWallVertices]} />
      </RigidBody>
      
      {/* Debug visualization of colliders */}
      {DEBUG_COLLIDERS && (
        <group>
          {/* Floor outline */}
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[COURT.width, COURT.length]} />
            <meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.3} />
          </mesh>
          
          {/* Front wall outline */}
          <mesh position={[0, COURT.height / 2, -halfLength]}>
            <planeGeometry args={[COURT.width, COURT.height]} />
            <meshBasicMaterial color="#00ff00" wireframe transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
          
          {/* Back wall outline */}
          <mesh position={[0, COURT.backWallHeight / 2, halfLength]}>
            <planeGeometry args={[COURT.width, COURT.backWallHeight]} />
            <meshBasicMaterial color="#00ff00" wireframe transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  )
}

useGLTF.preload(COURT_MODEL_PATH)
useGLTF.preload(TIN_MODEL_PATH)
