import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Trail, useGLTF } from '@react-three/drei'
import { RigidBody, BallCollider } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useGameStore } from '../stores/gameStore'
import {
  COURT,
  getOutLineHeight,
  BALL_RADIUS,
  BALL_MODEL_SCALE,
  GLB_ACCENT_MATERIAL,
} from '../systems/court'
import { bounceCoefficients, displayAlpha } from '../config'
import { HEX } from '../theme/colors'
import {
  BALL_BASE_COLOR,
  ballHitFlashColor,
  ballHitFlashMix,
} from '../systems/ballHitFlash'
import { isServeBallHeld, isBallFrozenBetweenPoints, serveBallWorldPosition } from '../systems/serveRules'
import {
  PIXEL_SHARD_COUNT,
  PIXEL_SHARD_DRIFT_SPEED,
  PIXEL_SHARD_STRIDE_M,
  RIBBON_TRAIL_LENGTH,
  RIBBON_TRAIL_WIDTH,
  pixelShardAge01,
  pixelShardAlive,
  pixelShardScale,
  ribbonTrailAttenuation,
  ribbonTrailVisibleFraction,
} from '../systems/pixelTrail'

interface PixelShard {
  pos: THREE.Vector3
  drift: THREE.Vector3
  bornAt: number
  index: number
}

function setMaterialHex(material: THREE.Material | null | undefined, hex: string): void {
  if (!material) return
  const withUniform = material as THREE.Material & {
    uniforms?: { color?: { value: THREE.Color } }
    color?: THREE.Color
  }
  if (withUniform.uniforms?.color?.value) {
    withUniform.uniforms.color.value.set(hex)
    return
  }
  if (withUniform.color) {
    withUniform.color.set(hex)
  }
}

/** WSF ball mass. Rapier only reads this from a collider, never from the rigid body. */
const BALL_MASS = 0.024
const BALL_COLOR = BALL_BASE_COLOR
const BALL_MODEL_PATH = '/models/ball.glb'

/**
 * Suppresses the trail entirely rather than setting its length to 0, which would leave
 * drei allocating an empty point buffer. Read once at module scope, matching the HUD.
 */
const PREFERS_REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Floor / impact grid. With no lights in the scene a real shadow is not available, so
 * this square neon grid is the cue for ball height and contact location.
 * Geometry is unit half-extent 1 → world width 2×scale (matches the old disc diameter).
 */
const MARKER_Y = 0.008
const MARKER_MIN_SCALE = 0.1
const MARKER_GROWTH_PER_METRE = 0.07
/** Authored for bloom’s linear pipeline — near ≈ old disc 0.55 after displayAlpha. */
const MARKER_NEAR_OPACITY = displayAlpha(0.78)
const MARKER_FAR_OPACITY = displayAlpha(0.4)
/** Height at which the marker reaches its faintest. */
const MARKER_FADE_HEIGHT = 3
const GRID_DIVISIONS = 3
/** Keep grids slightly off surfaces so court meshes do not z-fight them. */
const SURFACE_INSET = 0.012
const PULSE_DURATION_S = 0.28
const PULSE_EXPAND = 0.38
const PULSE_PEAK_OPACITY = displayAlpha(0.95)
const PULSE_WALL_SCALE = 0.2
/** Rising-edge pulse when canHit flips on (skipped under reduced motion). */
const LIVE_BALL_PULSE_MS = 220
const LIVE_BALL_PULSE_MIX = 0.55

/** The rigid bodies an out-line applies to. Contact at or above the line is out. */
const WALL_NAMES = ['frontWall', 'backWall', 'leftWall', 'rightWall'] as const
type WallName = (typeof WALL_NAMES)[number]
type ImpactSurface = 'floor' | WallName

interface ImpactRequest {
  surface: ImpactSurface
  x: number
  y: number
  z: number
}

function isWallName(name: string): name is WallName {
  return (WALL_NAMES as readonly string[]).includes(name)
}

/** Axis-aligned square grid in the XZ plane, centred at the origin. */
function createSquareGridGeometry(halfExtent: number, divisions: number): THREE.BufferGeometry {
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

function placeImpactTransform(
  surface: ImpactSurface,
  pos: { x: number; y: number; z: number },
  outPos: THREE.Vector3,
  outEuler: THREE.Euler,
): void {
  const halfW = COURT.width / 2
  const halfL = COURT.length / 2
  switch (surface) {
    case 'floor':
      outPos.set(pos.x, MARKER_Y, pos.z)
      outEuler.set(0, 0, 0)
      return
    case 'frontWall':
      outPos.set(pos.x, pos.y, -halfL + SURFACE_INSET)
      outEuler.set(Math.PI / 2, 0, 0)
      return
    case 'backWall':
      outPos.set(pos.x, pos.y, halfL - SURFACE_INSET)
      outEuler.set(-Math.PI / 2, 0, 0)
      return
    case 'leftWall':
      outPos.set(-halfW + SURFACE_INSET, pos.y, pos.z)
      outEuler.set(0, 0, -Math.PI / 2)
      return
    case 'rightWall':
      outPos.set(halfW - SURFACE_INSET, pos.y, pos.z)
      outEuler.set(0, 0, Math.PI / 2)
  }
}

/**
 * How far past the back wall the ball must travel before it counts as having left. The
 * back wall is a legal contact surface up to its out line, so the ball's centre can sit
 * slightly outside the nominal court length during a good return.
 */
const BEHIND_COURT_MARGIN = 0.5

interface BallProps {
  rigidBodyRef: React.RefObject<RapierRigidBody | null>
  initialPosition: [number, number, number]
  onWallHit: (wallName: string, ballPos: { x: number; y: number; z: number }) => void
  onFloorBounce: (bounceCount: number, ballPos: { x: number; y: number; z: number }) => void
  onTinHit: () => void
  onOutOfBounds: () => void
}

export default function Ball({
  rigidBodyRef,
  initialPosition,
  onWallHit,
  onFloorBounce,
  onTinHit,
  onOutOfBounds,
}: BallProps): React.ReactElement {
  const setBallPosition = useGameStore(state => state.setBallPosition)
  const phase = useGameStore(state => state.phase)
  const outReported = useRef(false)
  const posVecRef = useRef(new THREE.Vector3())
  const markerRef = useRef<THREE.LineSegments>(null)
  const markerMatRef = useRef<THREE.LineBasicMaterial>(null)
  const pulseRef = useRef<THREE.LineSegments>(null)
  const pulseMatRef = useRef<THREE.LineBasicMaterial>(null)
  const impactRequestRef = useRef<ImpactRequest | null>(null)
  const pulseAgeRef = useRef(-1)
  const pulseStartScaleRef = useRef(MARKER_MIN_SCALE)
  const pulsePosRef = useRef(new THREE.Vector3())
  const pulseEulerRef = useRef(new THREE.Euler())
  const ballMatsRef = useRef<THREE.MeshBasicMaterial[]>([])
  const paintedHexRef = useRef<string>(BALL_COLOR)
  const trailAnchorRef = useRef<THREE.Object3D>(null)
  const ribbonMatRef = useRef<THREE.Material | null>(null)
  const ribbonVisibleRef = useRef(0.5)
  const pixelTrailRef = useRef<THREE.InstancedMesh>(null)
  const shardsRef = useRef<PixelShard[]>([])
  const lastShardStampRef = useRef(new THREE.Vector3(Number.POSITIVE_INFINITY, 0, 0))
  const shardSeqRef = useRef(0)
  const trailDummyRef = useRef(new THREE.Object3D())
  const serveResetCount = useGameStore(state => state.serveResetCount)
  const scene = useThree(s => s.scene)
  const prevCanHitRef = useRef(false)
  const liveBallPulseUntilRef = useRef(0)
  const liveMixScratch = useRef(new THREE.Color())
  const liveMixTarget = useRef(new THREE.Color())
  /** Pose captured on first frozen frame — re-applied like serve hold so gravity cannot sink. */
  const freezePoseRef = useRef<{ x: number; y: number; z: number } | null>(null)

  const ribbonAttenuation = useCallback((t: number): number => (
    ribbonTrailAttenuation(t, ribbonVisibleRef.current)
  ), [])

  const gridGeometry = useMemo(
    () => createSquareGridGeometry(1, GRID_DIVISIONS),
    [],
  )
  const pixelTrailGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const pixelTrailMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: BALL_COLOR,
      depthWrite: false,
    }),
    [],
  )

  const { scene: ballScene } = useGLTF(BALL_MODEL_PATH)
  const ballModel = useMemo(() => {
    const cloned = ballScene.clone()
    const mats: THREE.MeshBasicMaterial[] = []
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const originalMat = Array.isArray(child.material) ? child.material[0] : child.material
        const matName = originalMat?.name?.toLowerCase() ?? ''
        const isAccent = matName === GLB_ACCENT_MATERIAL
        const mat = new THREE.MeshBasicMaterial({
          color: BALL_COLOR,
          transparent: !isAccent,
          opacity: isAccent ? 1 : 0.85,
          side: THREE.DoubleSide,
        })
        child.material = mat
        mats.push(mat)
      }
    })
    ballMatsRef.current = mats
    return cloned
  }, [ballScene])

  // Clearing the out-of-bounds latch needs both triggers. The serve counter covers the ball
  // being repositioned, which is the usual case; the phase covers `usePhaseInput`'s path
  // that enters the serving phase without calling `resetBallForServe`.
  useEffect(() => {
    outReported.current = false
    // Serve teleport — drop shards; ribbon remounts via key={serveResetCount}.
    shardsRef.current.length = 0
    lastShardStampRef.current.set(Number.POSITIVE_INFINITY, 0, 0)
    ribbonMatRef.current = null
    paintedHexRef.current = ''
  }, [serveResetCount])

  useEffect(() => {
    if (phase === 'serving') {
      outReported.current = false
    }
  }, [phase])

  // Shared BufferGeometry: skip R3F auto-dispose on either LineSegments, then dispose once.
  useEffect(() => () => {
    gridGeometry.dispose()
    pixelTrailGeometry.dispose()
    pixelTrailMaterial.dispose()
  }, [gridGeometry, pixelTrailGeometry, pixelTrailMaterial])

  const queueImpact = (surface: ImpactSurface, ballPos: { x: number; y: number; z: number }): void => {
    if (PREFERS_REDUCED_MOTION) return
    impactRequestRef.current = { surface, x: ballPos.x, y: ballPos.y, z: ballPos.z }
  }

  const showTrail =
    !PREFERS_REDUCED_MOTION && (phase === 'rally' || phase === 'serving')

  useFrame((_, delta) => {
    const ball = rigidBodyRef.current
    if (!ball) return

    const dt = Math.min(delta, 0.1)

    // Read live phase — a render-scoped `phase` can still be 'serving' on the same
    // frame as the strike (zustand already flipped to rally), which would zero the
    // serve velocity we just applied. Pin the *full* serve pose (not only Y): while
    // held the ball is still a dynamic body, so a charging racquet was shoving it
    // sideways and every serve drifted out to the left.
    const live = useGameStore.getState()
    if (isServeBallHeld(live.phase)) {
      freezePoseRef.current = null
      const pose = serveBallWorldPosition(live.serviceBox)
      ball.setTranslation(pose, true)
      ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
      ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
    } else if (isBallFrozenBetweenPoints(live.phase)) {
      if (!freezePoseRef.current) {
        const t = ball.translation()
        freezePoseRef.current = { x: t.x, y: t.y, z: t.z }
      }
      ball.setTranslation(freezePoseRef.current, true)
      ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
      ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
    } else {
      freezePoseRef.current = null
    }

    // Live returnable: tint the GLB ball (not a separate circle halo).
    const liveShow =
      live.canHit && (live.phase === 'rally' || live.phase === 'serving')
    if (liveShow && !prevCanHitRef.current && !PREFERS_REDUCED_MOTION) {
      liveBallPulseUntilRef.current = performance.now() + LIVE_BALL_PULSE_MS
    }
    prevCanHitRef.current = liveShow
    const liveHex = liveShow
      ? (live.currentStriker === 'opponent' ? HEX.opponent : HEX.player)
      : BALL_COLOR

    const pos = ball.translation()
    posVecRef.current.set(pos.x, pos.y, pos.z)
    setBallPosition(posVecRef.current)

    const now = performance.now()
    const flashHex = PREFERS_REDUCED_MOTION
      ? liveHex
      : ballHitFlashColor(live.ballHitAt, live.ballHitIntensity, live.ballHitSide, now)
    const hitMix = PREFERS_REDUCED_MOTION
      ? 0
      : ballHitFlashMix(live.ballHitAt, live.ballHitIntensity, now)

    let paintHex = liveHex
    if (hitMix > 0.01) {
      liveMixScratch.current.set(liveHex)
      liveMixTarget.current.set(flashHex)
      liveMixScratch.current.lerp(liveMixTarget.current, hitMix)
      paintHex = '#' + liveMixScratch.current.getHexString()
    } else if (liveShow && liveBallPulseUntilRef.current > now) {
      const t = 1 - (liveBallPulseUntilRef.current - now) / LIVE_BALL_PULSE_MS
      const pulse = (1 - t) * (1 - t)
      liveMixScratch.current.set(BALL_COLOR)
      liveMixTarget.current.set(liveHex)
      liveMixScratch.current.lerp(liveMixTarget.current, 0.65 + LIVE_BALL_PULSE_MIX * pulse)
      paintHex = '#' + liveMixScratch.current.getHexString()
    }

    const vel = ball.linvel()
    const speed = Math.hypot(vel.x, vel.y, vel.z)
    ribbonVisibleRef.current = ribbonTrailVisibleFraction(speed)

    trailAnchorRef.current?.position.set(pos.x, pos.y, pos.z)

    if (showTrail && !ribbonMatRef.current) {
      scene.traverse((obj) => {
        if (ribbonMatRef.current || !(obj instanceof THREE.Mesh)) return
        const mat = obj.material
        if (!mat || Array.isArray(mat)) return
        if ((mat as { type?: string }).type === 'MeshLineMaterial') {
          ribbonMatRef.current = mat
        }
      })
    }
    if (!showTrail) ribbonMatRef.current = null

    if (paintHex !== paintedHexRef.current) {
      paintedHexRef.current = paintHex
      for (const mat of ballMatsRef.current) {
        mat.color.set(paintHex)
      }
      setMaterialHex(ribbonMatRef.current, paintHex)
      pixelTrailMaterial.color.set(paintHex)
      if (markerMatRef.current) markerMatRef.current.color.set(paintHex)
      if (pulseMatRef.current) pulseMatRef.current.color.set(paintHex)
    }

    // Pixel shards on top of the ribbon — short life, hard-step dissolve, slight drift.
    const pixelMesh = pixelTrailRef.current
    const shards = shardsRef.current
    if (pixelMesh) {
      if (!showTrail) {
        shards.length = 0
        lastShardStampRef.current.set(Number.POSITIVE_INFINITY, 0, 0)
      } else {
        const stamp = lastShardStampRef.current
        if (
          !Number.isFinite(stamp.x)
          || stamp.distanceToSquared(posVecRef.current) >= PIXEL_SHARD_STRIDE_M * PIXEL_SHARD_STRIDE_M
        ) {
          // Drift mostly backward + a little lateral so shards peel off the ribbon.
          const invSpeed = speed > 0.2 ? 1 / speed : 0
          const bx = speed > 0.2 ? -vel.x * invSpeed : 0
          const by = speed > 0.2 ? -vel.y * invSpeed : 0.2
          const bz = speed > 0.2 ? -vel.z * invSpeed : 0
          const side = (shardSeqRef.current % 2 === 0 ? 1 : -1) * 0.35
          shards.push({
            pos: posVecRef.current.clone(),
            drift: new THREE.Vector3(
              (bx + side * bz) * PIXEL_SHARD_DRIFT_SPEED,
              (by + 0.25) * PIXEL_SHARD_DRIFT_SPEED,
              (bz - side * bx) * PIXEL_SHARD_DRIFT_SPEED,
            ),
            bornAt: now,
            index: shardSeqRef.current++,
          })
          stamp.copy(posVecRef.current)
          while (shards.length > PIXEL_SHARD_COUNT) shards.shift()
        }

        for (let i = shards.length - 1; i >= 0; i--) {
          const age = pixelShardAge01(shards[i].bornAt, now)
          if (age >= 1) {
            shards.splice(i, 1)
            continue
          }
          shards[i].pos.addScaledVector(shards[i].drift, dt)
        }
      }

      const dummy = trailDummyRef.current
      for (let i = 0; i < PIXEL_SHARD_COUNT; i++) {
        const shard = shards[i]
        if (!shard) {
          dummy.scale.setScalar(0)
          dummy.updateMatrix()
          pixelMesh.setMatrixAt(i, dummy.matrix)
          continue
        }
        const age01 = pixelShardAge01(shard.bornAt, now)
        if (!pixelShardAlive(age01, shard.index)) {
          dummy.scale.setScalar(0)
        } else {
          const scale = pixelShardScale(age01, hitMix)
          if (scale <= 0) {
            dummy.scale.setScalar(0)
          } else {
            dummy.position.copy(shard.pos)
            dummy.scale.setScalar(scale)
          }
        }
        dummy.updateMatrix()
        pixelMesh.setMatrixAt(i, dummy.matrix)
      }
      pixelMesh.instanceMatrix.needsUpdate = true
      pixelMesh.visible = showTrail && shards.length > 0
    }

    const height = Math.max(0, pos.y)
    const markerScale = MARKER_MIN_SCALE + height * MARKER_GROWTH_PER_METRE
    const marker = markerRef.current
    const markerMat = markerMatRef.current
    if (marker && markerMat) {
      marker.position.set(pos.x, MARKER_Y, pos.z)
      marker.scale.setScalar(markerScale)
      const fade = THREE.MathUtils.clamp(height / MARKER_FADE_HEIGHT, 0, 1)
      markerMat.opacity = THREE.MathUtils.lerp(MARKER_NEAR_OPACITY, MARKER_FAR_OPACITY, fade)
    }

    const impact = impactRequestRef.current
    if (impact) {
      impactRequestRef.current = null
      placeImpactTransform(impact.surface, impact, pulsePosRef.current, pulseEulerRef.current)
      pulseStartScaleRef.current =
        impact.surface === 'floor' ? markerScale : PULSE_WALL_SCALE
      pulseAgeRef.current = 0
      const pulse = pulseRef.current
      if (pulse) {
        pulse.visible = true
        pulse.position.copy(pulsePosRef.current)
        pulse.rotation.copy(pulseEulerRef.current)
        pulse.scale.setScalar(pulseStartScaleRef.current)
      }
      if (pulseMatRef.current) {
        pulseMatRef.current.opacity = PULSE_PEAK_OPACITY
      }
    }

    if (pulseAgeRef.current >= 0) {
      pulseAgeRef.current += dt
      const t = Math.min(1, pulseAgeRef.current / PULSE_DURATION_S)
      const pulse = pulseRef.current
      const pulseMat = pulseMatRef.current
      if (pulse && pulseMat) {
        const expand = 1 + t * PULSE_EXPAND
        pulse.scale.setScalar(pulseStartScaleRef.current * expand)
        // Ease-out fade — contact reads hardest at the first frames.
        pulseMat.opacity = PULSE_PEAK_OPACITY * (1 - t) * (1 - t)
        if (t >= 1) {
          pulseAgeRef.current = -1
          pulse.visible = false
          pulseMat.opacity = 0
        }
      } else if (t >= 1) {
        pulseAgeRef.current = -1
      }
    }

    // WSF: out means touching the ceiling or leaving the court. Height alone is not out —
    // below the out line the ball is in play at any height, so testing height everywhere
    // would make any lob illegal. The side walls are trapezoids topping out at the out
    // line, so a ball above that line clears them without ever registering a contact;
    // that case needs its own geometric test rather than the at-contact one.
    const overSideWall =
      Math.abs(pos.x) > COURT.width / 2 && pos.y > getOutLineHeight(pos.z)
    const leftCourt =
      pos.y > COURT.clearHeight ||
      overSideWall ||
      Math.abs(pos.z) > COURT.length / 2 + BEHIND_COURT_MARGIN
    if (leftCourt && !outReported.current) {
      outReported.current = true
      onOutOfBounds()
    }
  })

  const handleCollision = (payload: { other: { rigidBodyObject?: { name?: string } }; target: { rigidBody?: RapierRigidBody } }) => {
    const otherName = payload.other.rigidBodyObject?.name ?? 'unknown'
    const ball = payload.target.rigidBody ?? rigidBodyRef.current
    if (!ball) return
    const pos = ball.translation()
    const ballPos = { x: pos.x, y: pos.y, z: pos.z }

    if (otherName === 'floor') {
      queueImpact('floor', ballPos)
      onFloorBounce(useGameStore.getState().recordFloorBounce(), ballPos)
      onWallHit('floor', ballPos)
      return
    }

    if (!isWallName(otherName)) return

    // WSF: a wall contact at or above that wall's out line is out.
    if (pos.y >= getOutLineHeight(pos.z)) {
      if (!outReported.current) {
        outReported.current = true
        onOutOfBounds()
      }
      return
    }

    queueImpact(otherName, ballPos)
    onWallHit(otherName, ballPos)
    if (otherName === 'frontWall' && pos.y < COURT.tinHeight) {
      onTinHit()
    }
  }

  return (
    <>
      <RigidBody
        ref={rigidBodyRef}
        name="ball"
        position={initialPosition}
        colliders={false}
        linearDamping={0.4}
        angularDamping={0.2}
        ccd
        onCollisionEnter={handleCollision}
      >
        <BallCollider
          args={[BALL_RADIUS]}
          mass={BALL_MASS}
          restitution={bounceCoefficients().ball}
          friction={0.2}
        />
        <primitive object={ballModel} scale={BALL_MODEL_SCALE} />
      </RigidBody>

      <object3D ref={trailAnchorRef} />

      {/* Base ribbon — speed sets visible length; colour follows hit flash. */}
      {showTrail && (
        <Trail
          key={serveResetCount}
          target={trailAnchorRef as React.MutableRefObject<THREE.Object3D>}
          width={RIBBON_TRAIL_WIDTH}
          length={RIBBON_TRAIL_LENGTH}
          color={BALL_COLOR}
          attenuation={ribbonAttenuation}
          decay={1}
        />
      )}

      {/* Pixel disintegration overlay — short-lived cubes that crumble off the ribbon. */}
      <instancedMesh
        ref={pixelTrailRef}
        args={[pixelTrailGeometry, pixelTrailMaterial, PIXEL_SHARD_COUNT]}
        frustumCulled={false}
        visible={false}
        dispose={null}
      />

      {/* Floor marker + impact pulse. Outside the rigid body: marker tracks x/z on the
          floor; pulse is a single pooled grid that restarts on each contact. */}
      <lineSegments
        ref={markerRef}
        geometry={gridGeometry}
        position={[0, MARKER_Y, 0]}
        dispose={null}
      >
        <lineBasicMaterial
          ref={markerMatRef}
          color={BALL_COLOR}
          transparent
          opacity={MARKER_NEAR_OPACITY}
          depthWrite={false}
        />
      </lineSegments>
      {!PREFERS_REDUCED_MOTION && (
        <lineSegments ref={pulseRef} geometry={gridGeometry} visible={false} dispose={null}>
          <lineBasicMaterial
            ref={pulseMatRef}
            color={BALL_COLOR}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </lineSegments>
      )}
    </>
  )
}

useGLTF.preload(BALL_MODEL_PATH)
