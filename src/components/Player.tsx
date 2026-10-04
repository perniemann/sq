import React, { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useGLTF, Text } from '@react-three/drei'
import { FONT_UTILITY } from '../theme/fonts'
import * as THREE from 'three'
import {
  COURT,
  ATHLETE_INSET,
  ATHLETE_SIZE,
  ATHLETE_MODEL_SCALE,
  ATHLETE_MODEL_Z_OFFSET,
  GLB_ACCENT_MATERIAL,
} from '../systems/court'
import { type MovementPhase, type ChargePhase, useGameStore } from '../stores/gameStore'
import { T_POSITION } from '../systems/courtPositions'
import {
  isAthleteHeldBetweenPoints,
  serveBallWorldPosition,
  serveStrikeDirection,
} from '../systems/serveRules'
import {
  CHARGE_MOVE_SPEED_SCALE,
  LOFT_NEUTRAL,
  MOVEMENT_TIMING,
  POWER_BAND_LEVELS,
  useInputStore,
  useAim,
  useLoft,
} from '../hooks/useInput'
import {
  calculateSwingState,
  calculateRacquetTransform,
  type SwingState,
} from '../systems/swingAnimation'
import { isInSwingHitWindow } from '../systems/hitTiming'
import {
  athleteFillAuthoredOpacity,
  athleteFillStrength,
} from '../systems/athleteFill'
import { DEBUG, displayAlpha } from '../config'
import { HEX } from '../theme/colors'
import {
  AIM_ARC_RANGE,
  AIM_NEUTRAL,
  aimPreviewDirection,
  aimToFloorNeedleTheta,
  aimToPlayerRotation,
  chargeRingHintActivation,
  chargeRingHintPoses,
  floorNeedlePose,
} from '../systems/aimRotation'
import { PLAYER_CHASE_SPEED } from '../systems/playerChase'

const CYAN = HEX.player
/** Footprint radius for ground indicators. Court clamp uses `ATHLETE_INSET` (same value). */
const PLAYER_SIZE = ATHLETE_SIZE.width / 2

/** Reused when a ball position is not supplied, so useFrame stays allocation-free. */
const DEFAULT_BALL_POSITION = new THREE.Vector3(0, 1, -2)

function setAthleteFillOpacity(root: THREE.Object3D, opacity: number): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child.userData.isAthleteFill !== true) return
    const mats = Array.isArray(child.material) ? child.material : [child.material]
    for (const mat of mats) {
      if (mat instanceof THREE.MeshBasicMaterial) mat.opacity = opacity
    }
  })
}

/**
 * Arc length is quantised before it reaches the geometry so the ring is rebuilt at most
 * this many times per charge instead of once per frame.
 */
const CHARGE_ARC_STEPS = 32

// Model paths - GLB assets in public/models/
const PLAYER_MODEL_PATH = '/models/player.glb'
const RACQUET_MODEL_PATH = '/models/racquet.glb'

/**
 * Authored racquet face lies in YZ (thin in X). Swing code expects the string bed in XY
 * facing ±Z, so the mesh is yawed +90° about Y on load. Hit sensor stays the existing
 * CuboidCollider — visual only.
 */
const RACQUET_FACE_YAW = Math.PI / 2

/** Visual yaw smoothing only — ballistic aim uses `aimToPlayerRotation`. */
const ROTATION_SMOOTHING = 0.15

/**
 * Squash movement parameters (from biomechanics research)
 */
const MOVEMENT = {
  // Speed values (units/second)
  BASE_SPEED: 6,           // Normal movement speed
  CHASE_SPEED: PLAYER_CHASE_SPEED,
  RECOVERY_SPEED: 5,       // Slower return to T (energy conservation)
  
  // Timing
  SPLIT_STEP_DURATION: MOVEMENT_TIMING.SPLIT_STEP_DURATION,  // 100ms
  ACCELERATION_TIME: 0.3,  // seconds to reach 80% speed
  
  // Distance thresholds
  DECELERATION_DISTANCE: 0.5,  // Start slowing 0.5m from target
  LUNGE_DISTANCE: 0.8,         // Lunge forward when within 0.8m
  T_ARRIVAL_THRESHOLD: 0.1,    // Consider "at T" within 0.1m
  
  // Lunge
  LUNGE_OFFSET: 0.4,  // Forward offset during lunge
}

interface PlayerProps {
  position: [number, number, number]
  targetPosition?: [number, number, number] | null
  ballPosition?: THREE.Vector3
  isCharging?: boolean
  chargeLevel?: number
  chargePhase?: ChargePhase
  movementPhase?: MovementPhase
  chaseStartTime?: number | null
  isRecovering?: boolean
  color?: string
  isControllable?: boolean
  /** Whether the racquet is currently swinging (hit detection active) */
  isSwinging?: boolean
  /** Power level for the current swing (0-1) */
  swingPower?: number
  /** Callback when racquet hits the ball - receives racquet world position, player rotation, and player position for impulse */
  onRacquetHit?: (racquetPosition: THREE.Vector3, playerRotation: number, playerPosition: THREE.Vector3) => void
  /** Whether this player is the current striker (their turn to hit) */
  isCurrentStriker?: boolean
  /** Whether to hold position (don't auto-move to T during serve) */
  holdPosition?: boolean
  /** When charge button was pressed (for swing animation) */
  chargeStartTime?: number | null
  /** When swing was triggered (button released) */
  swingStartTime?: number | null
  /** Current shot type name to display above player */
  currentShotName?: string | null
  /** Written every frame so Scene's proximity hit check can supply the same aim angle. */
  rotationRef?: React.MutableRefObject<number>
  /**
   * Controllable player only: report sim position each frame. Required because Scene
   * re-renders often (AI `setState`) and must not drive the mesh via a stale `position`
   * prop — that pinned the body while the racquet still moved.
   */
  onPositionFrame?: (x: number, y: number, z: number) => void
  /**
   * Live chase / assist target from Scene's useFrame. Prefer this over `targetPosition`
   * so movement does not depend on a React re-render for the latest floor point.
   */
  targetPositionRef?: React.MutableRefObject<[number, number, number] | null>
  /** m/s for `targetPositionRef` — chase is fast, soft assist is slow. */
  moveSpeedRef?: React.MutableRefObject<number>
  /**
   * AI / demo athlete: live pose from Scene without a React `position` prop each frame.
   * When set, overrides `position` for non-controllable (and held) bodies.
   */
  livePositionRef?: React.MutableRefObject<[number, number, number]>
}

export default function Player({
  position,
  targetPosition = null,
  ballPosition,
  isCharging = false,
  chargeLevel = 0,
  chargePhase = 'none',
  movementPhase = 'idle',
  chaseStartTime = null,
  isRecovering = false,
  color = CYAN,
  isControllable = true,
  isSwinging = false,
  swingPower = 0,
  onRacquetHit,
  isCurrentStriker = false,
  holdPosition = false,
  chargeStartTime = null,
  swingStartTime = null,
  currentShotName = null,
  rotationRef,
  onPositionFrame,
  targetPositionRef,
  moveSpeedRef,
  livePositionRef,
}: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const pyramidRef = useRef<THREE.Group>(null)
  const currentPos = useRef(new THREE.Vector3(...position))
  const currentRotation = useRef(0)  // Y-axis rotation
  const velocity = useRef(new THREE.Vector3())
  const onPositionFrameRef = useRef(onPositionFrame)
  onPositionFrameRef.current = onPositionFrame
  const targetPositionRefLocal = useRef(targetPositionRef)
  targetPositionRefLocal.current = targetPositionRef
  const moveSpeedRefLocal = useRef(moveSpeedRef)
  moveSpeedRefLocal.current = moveSpeedRef
  const livePositionRefLocal = useRef(livePositionRef)
  livePositionRefLocal.current = livePositionRef
  
  // Racquet position state (world space) - use state to trigger re-render when initialized
  const racquetPositionRef = useRef(new THREE.Vector3())
  const racquetQuaternionRef = useRef(new THREE.Quaternion())
  const [racquetReady, setRacquetReady] = useState(false)
  
  // Swing state for animation
  const currentSwingState = useRef<SwingState | null>(null)
  // Note: With new rotation system, we always use forehand stance
  // Player rotation (controlled by charge) determines shot direction
  
  // Body rotation adjustment for stance
  const stanceBodyRotation = useRef(0)
  
  // Refs for collision callback to avoid stale closures
  const isSwingingRef = useRef(isSwinging)
  const onRacquetHitRef = useRef(onRacquetHit)
  const swingPowerRef = useRef(swingPower)
  
  // Keep refs updated
  isSwingingRef.current = isSwinging
  onRacquetHitRef.current = onRacquetHit
  swingPowerRef.current = swingPower
  
  // Split-step state
  const [splitStepActive, setSplitStepActive] = useState(false)
  const [splitStepScale, setSplitStepScale] = useState(1)
  
  // Reusable vectors for useFrame (avoid per-frame allocations)
  const targetRef = useRef(new THREE.Vector3())
  const tempVec1Ref = useRef(new THREE.Vector3())
  const tempVec2Ref = useRef(new THREE.Vector3())
  
  // Load GLB models
  const { scene: playerScene } = useGLTF(PLAYER_MODEL_PATH)
  const { scene: racquetScene } = useGLTF(RACQUET_MODEL_PATH)
  
  // Racquet rigid body ref for kinematic updates
  const racquetBodyRef = useRef<RapierRigidBody>(null)
  
  // Clone and apply materials: mat_b = opaque accent, mat_a = strength-linked fill
  const playerModel = useMemo(() => {
    const cloned = playerScene.clone()
    let accentMeshes = 0
    const idleFill = displayAlpha(athleteFillAuthoredOpacity(0))

    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const originalMat = Array.isArray(child.material) ? child.material[0] : child.material
        const matName = originalMat?.name?.toLowerCase() ?? ''

        if (matName === GLB_ACCENT_MATERIAL) {
          accentMeshes++
          child.userData.isAthleteFill = false
          child.material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: false,
            side: THREE.DoubleSide,
          })
        } else {
          child.userData.isAthleteFill = true
          child.material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: idleFill,
            // Write depth so diegetic tin HUD cannot paint over a nearer athlete.
            depthWrite: true,
            side: THREE.DoubleSide,
          })
        }
      }
    })

    if (accentMeshes === 0) {
      console.warn(
        `Player: no mesh used "${GLB_ACCENT_MATERIAL}"; athlete edges will be missing.`
        + ' Re-run `npm run measure:glb` and update GLB_ACCENT_MATERIAL.'
      )
    }

    return cloned
  }, [playerScene, color])

  const racquetModel = useMemo(() => {
    const cloned = racquetScene.clone()
    let accentMeshes = 0
    const idleFill = displayAlpha(athleteFillAuthoredOpacity(0))

    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const originalMat = Array.isArray(child.material) ? child.material[0] : child.material
        const matName = originalMat?.name?.toLowerCase() ?? ''

        if (matName === GLB_ACCENT_MATERIAL) {
          accentMeshes++
          child.userData.isAthleteFill = false
          child.material = new THREE.MeshBasicMaterial({
            color,
            transparent: false,
            side: THREE.DoubleSide,
          })
        } else {
          child.userData.isAthleteFill = true
          child.material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: idleFill,
            depthWrite: true,
            side: THREE.DoubleSide,
          })
        }
      }
    })

    if (accentMeshes === 0) {
      console.warn(
        `Racquet: no mesh used "${GLB_ACCENT_MATERIAL}"; edges will be missing.`
        + ' Re-run `npm run measure:glb` and update GLB_ACCENT_MATERIAL.'
      )
    }

    return cloned
  }, [racquetScene, color])

  const fillOpacityRef = useRef(displayAlpha(athleteFillAuthoredOpacity(0)))
  
  const aim = useAim()
  const loft = useLoft()
  // Bumped by resetBallForServe — must snap even when controllable free movement owns pose.
  const serveResetCount = useGameStore(state => state.serveResetCount)
  const appliedServeResetRef = useRef(serveResetCount)

  useFrame((_, delta) => {
    if (isControllable) {
      const clamped = Math.min(delta, 0.1)
      useInputStore.getState().tickAim(clamped)
      useInputStore.getState().tickLoft(clamped)
    }

    // Body + racquet fill densifies with shot strength (same curve for cyan and orange).
    const strength = athleteFillStrength(isCharging, chargeLevel)
    const nextFill = displayAlpha(athleteFillAuthoredOpacity(strength))
    if (nextFill !== fillOpacityRef.current) {
      fillOpacityRef.current = nextFill
      setAthleteFillOpacity(playerModel, nextFill)
      setAthleteFillOpacity(racquetModel, nextFill)
    }

    if (!groupRef.current) return
    
    const target = targetRef.current
    let currentSpeed: number

    // Authoritative pose: live ref (AI/demo/human) or props for held serve; controllable
    // free movement owns currentPos — never snap from a stale React prop *except* on
    // serve teleport. Without that snap, onPositionFrame overwrites playerPosRef before
    // holdPosition props catch up after a won point → continue.
    const livePose = livePositionRefLocal.current?.current
    let snappedThisFrame = false
    if (serveResetCount !== appliedServeResetRef.current) {
      appliedServeResetRef.current = serveResetCount
      snappedThisFrame = true
      if (livePose) {
        currentPos.current.set(livePose[0], livePose[1], livePose[2])
      } else {
        currentPos.current.set(position[0], position[1], position[2])
      }
      velocity.current.set(0, 0, 0)
    }

    // Live between-points hold: React `holdPosition` can lag one frame after awardPointTo,
    // and a null chase target would soft-walk toward T.
    const liveHeldBetween = isAthleteHeldBetweenPoints(useGameStore.getState().phase)
    const effectivelyHeld = holdPosition || liveHeldBetween || snappedThisFrame

    if (effectivelyHeld || !isControllable) {
      if (!snappedThisFrame) {
        if (livePose) {
          currentPos.current.set(livePose[0], livePose[1], livePose[2])
        } else {
          currentPos.current.set(position[0], position[1], position[2])
        }
      }
      if (effectivelyHeld) velocity.current.set(0, 0, 0)
    }
    
    const liveChaseTarget = targetPositionRefLocal.current?.current ?? targetPosition
    const heldPose = livePose ?? position

    if (effectivelyHeld) {
      target.set(...heldPose)
      currentSpeed = 0
    } else if (liveChaseTarget) {
      // Chase (Shift) or soft receive assist — speed comes from Scene.
      target.set(...liveChaseTarget)
      currentSpeed = moveSpeedRefLocal.current?.current ?? MOVEMENT.CHASE_SPEED
    } else if (isRecovering || movementPhase === 'recovering') {
      target.copy(T_POSITION)
      currentSpeed = MOVEMENT.RECOVERY_SPEED
    } else if (isControllable) {
      target.copy(T_POSITION)
      currentSpeed = MOVEMENT.RECOVERY_SPEED * 0.5
    } else {
      target.set(...(livePose ?? position))
      currentSpeed = MOVEMENT.BASE_SPEED
    }
    
    const distanceToTarget = currentPos.current.distanceTo(target)
    
    // --- SPLIT-STEP LOGIC ---
    if (chaseStartTime && !splitStepActive && movementPhase !== 'recovering') {
      const timeSinceChaseStart = Date.now() - chaseStartTime
      if (timeSinceChaseStart < MOVEMENT.SPLIT_STEP_DURATION) {
        setSplitStepActive(true)
        const progress = timeSinceChaseStart / MOVEMENT.SPLIT_STEP_DURATION
        const bobAmount = Math.sin(progress * Math.PI) * 0.15
        setSplitStepScale(1 + bobAmount)
      } else if (splitStepActive) {
        setSplitStepActive(false)
        setSplitStepScale(1)
      }
    } else if (!chaseStartTime && splitStepActive) {
      setSplitStepActive(false)
      setSplitStepScale(1)
    }
    
    // --- ACCELERATION CURVE ---
    let speedMultiplier = 1
    if (chaseStartTime && liveChaseTarget) {
      const chaseTime = (Date.now() - chaseStartTime) / 1000
      if (chaseTime > MOVEMENT.SPLIT_STEP_DURATION / 1000) {
        const adjustedTime = chaseTime - MOVEMENT.SPLIT_STEP_DURATION / 1000
        speedMultiplier = 1 - Math.exp(-adjustedTime * 5)
      } else {
        speedMultiplier = 0.1
      }
    }
    
    // --- DECELERATION NEAR TARGET ---
    if (distanceToTarget < MOVEMENT.DECELERATION_DISTANCE && liveChaseTarget) {
      const decelFactor = distanceToTarget / MOVEMENT.DECELERATION_DISTANCE
      speedMultiplier *= decelFactor
    }
    
    // --- LUNGE OFFSET ---
    // Must use distance to the *ball*, not the movement target. When idle/recovering the
    // target is the T, so distanceToTarget ≈ 0 and every charge looked like a dive.
    const lungeOffset = tempVec1Ref.current
    lungeOffset.set(0, 0, 0)
    if (isCharging && ballPosition) {
      tempVec2Ref.current.copy(ballPosition).sub(currentPos.current)
      tempVec2Ref.current.y = 0
      const distToBall = tempVec2Ref.current.length()
      if (distToBall > 0.1 && distToBall < MOVEMENT.LUNGE_DISTANCE) {
        tempVec2Ref.current.normalize()
        lungeOffset.copy(tempVec2Ref.current).multiplyScalar(MOVEMENT.LUNGE_OFFSET * chargeLevel)
      }
    }
    
    // --- APPLY MOVEMENT ---
    // Charge tax: slower chase/strafe while winding up (hold still builds power).
    if (isCharging) {
      speedMultiplier *= CHARGE_MOVE_SPEED_SCALE
    }
    const effectiveSpeed = currentSpeed * speedMultiplier
    const direction = tempVec2Ref.current.copy(target).sub(currentPos.current)
    direction.y = 0
    
    if (direction.length() > 0.01) {
      direction.normalize()
      direction.multiplyScalar(effectiveSpeed)
      velocity.current.lerp(direction, 0.1)
    } else {
      velocity.current.multiplyScalar(0.9)
    }
    
    tempVec2Ref.current.copy(velocity.current).multiplyScalar(delta)
    currentPos.current.add(tempVec2Ref.current)
    
    const displayPos = tempVec2Ref.current.copy(currentPos.current).add(lungeOffset)
    
    // --- CLAMP TO COURT (full floor walkable) ---
    displayPos.x = THREE.MathUtils.clamp(
      displayPos.x, 
      -COURT.width / 2 + ATHLETE_INSET, 
      COURT.width / 2 - ATHLETE_INSET
    )
    displayPos.z = THREE.MathUtils.clamp(
      displayPos.z, 
      -COURT.length / 2 + ATHLETE_INSET,
      COURT.length / 2 - ATHLETE_INSET
    )
    displayPos.y = 0.01
    
    currentPos.current.x = THREE.MathUtils.clamp(
      currentPos.current.x,
      -COURT.width / 2 + ATHLETE_INSET,
      COURT.width / 2 - ATHLETE_INSET
    )
    currentPos.current.z = THREE.MathUtils.clamp(
      currentPos.current.z,
      -COURT.length / 2 + ATHLETE_INSET,
      COURT.length / 2 - ATHLETE_INSET
    )
    
    groupRef.current.position.copy(displayPos)

    if (isControllable && onPositionFrameRef.current) {
      onPositionFrameRef.current(
        currentPos.current.x,
        currentPos.current.y,
        currentPos.current.z,
      )
    }
    
    // --- PLAYER ROTATION (aim-controlled for controllable player; charge is power only) ---
    if (isControllable) {
      let targetRotation = aimToPlayerRotation(AIM_NEUTRAL)
      const liveAim = useInputStore.getState().aim

      if (isCharging) {
        targetRotation = aimToPlayerRotation(liveAim)
      } else if (!isSwinging) {
        targetRotation = aimToPlayerRotation(AIM_NEUTRAL)
      } else {
        targetRotation = currentRotation.current
      }

      currentRotation.current = THREE.MathUtils.lerp(
        currentRotation.current,
        targetRotation,
        ROTATION_SMOOTHING
      )
    } else {
      // Non-controllable player (AI) - face the ball for shot direction
      if (ballPosition) {
        tempVec1Ref.current.copy(ballPosition).sub(currentPos.current)
        tempVec1Ref.current.y = 0
        if (tempVec1Ref.current.length() > 0.1) {
          const targetRotation = Math.atan2(tempVec1Ref.current.x, -tempVec1Ref.current.z)
          currentRotation.current = THREE.MathUtils.lerp(
            currentRotation.current,
            targetRotation,
            0.1
          )
        }
      }
    }
    
    if (rotationRef) {
      rotationRef.current = currentRotation.current
    }
    
    // Apply rotation to pyramid with stance adjustment
    if (pyramidRef.current) {
      pyramidRef.current.rotation.y = currentRotation.current + stanceBodyRotation.current
    }
    
    // --- VISUAL EFFECTS ---
    let scaleEffect = splitStepScale
    
    if (isCharging && chargePhase !== 'none') {
      switch (chargePhase) {
        case 'racquetPrep':
          scaleEffect *= 0.95
          break
        case 'bodyCoil':
          scaleEffect *= 0.9 + Math.sin(Date.now() * 0.008) * 0.03
          break
        case 'powerLoad':
          scaleEffect *= 0.88 + Math.sin(Date.now() * 0.015) * 0.05
          break
      }
    }
    
    // Uniform charge/split-step scale on the parent only — the child's ATHLETE_MODEL_SCALE
    // stays non-uniform (parent × child). Do not setScalar on the primitive.
    if (pyramidRef.current) {
      pyramidRef.current.scale.setScalar(scaleEffect)
    }
    
    // --- RACQUET POSITIONING WITH SWING ANIMATION ---
    // Use the new swing animation system for proper squash-like racquet movement
    
    // Calculate current swing state using the animation system
    const ballPosForSwing = ballPosition ?? DEFAULT_BALL_POSITION
    const swingState = calculateSwingState(
      isCharging,
      chargeStartTime,
      isSwinging,
      swingStartTime,
      ballPosForSwing,
      currentPos.current
    )
    
    // Store swing state for hit detection
    currentSwingState.current = swingState
    
    // Calculate racquet transform based on swing state
    // With new rotation system, racquet follows player rotation
    // Always uses forehand animation - player facing determines shot direction
    const racquetTransform = calculateRacquetTransform(
      swingState,
      currentRotation.current
    )
    
    // Apply stance body rotation to player (subtle rotation for forehand/backhand)
    const targetStanceRotation = racquetTransform.bodyRotation
    stanceBodyRotation.current = THREE.MathUtils.lerp(
      stanceBodyRotation.current,
      targetStanceRotation,
      0.15
    )
    
    // Set racquet world position (player position + offset)
    racquetPositionRef.current.copy(displayPos).add(racquetTransform.offset)
    
    // Set racquet rotation quaternion
    racquetQuaternionRef.current.copy(racquetTransform.rotation)
    
    // Mark racquet as ready after first position calculation
    if (!racquetReady) {
      setRacquetReady(true)
    }
    
    // Update racquet RigidBody kinematic position and rotation
    if (racquetBodyRef.current) {
      racquetBodyRef.current.setNextKinematicTranslation({
        x: racquetPositionRef.current.x,
        y: racquetPositionRef.current.y,
        z: racquetPositionRef.current.z
      })
      
      racquetBodyRef.current.setNextKinematicRotation({
        x: racquetQuaternionRef.current.x,
        y: racquetQuaternionRef.current.y,
        z: racquetQuaternionRef.current.z,
        w: racquetQuaternionRef.current.w
      })
    }
  })
  
  // Handle racquet collision with ball - use refs to avoid stale closures
  // Uses new swing animation system for timing-based hit detection
  const handleRacquetIntersection = (payload: { other: { rigidBodyObject?: { name?: string } | null } }) => {
    const otherName = payload.other.rigidBodyObject?.name
    const currentlySwinging = isSwingingRef.current
    const hitCallback = onRacquetHitRef.current
    const power = swingPowerRef.current
    const swingState = currentSwingState.current
    
    const canHit = currentlySwinging && isInSwingHitWindow(swingState)
    
    if (DEBUG) console.log('Racquet intersection:', otherName,
      'phase:', swingState?.phase,
      'progress:', swingState?.progress?.toFixed(2),
      'canHit:', canHit,
      'isControllable:', isControllable)
    
    // Trigger hit if colliding with ball AND in valid hit phase
    if (otherName === 'ball' && canHit && hitCallback) {
      const whoHit = isControllable ? 'PLAYER' : 'AI'
      const phaseInfo = swingState?.phase || 'unknown'
      if (DEBUG) console.log(`${whoHit} RACQUET HIT! Power: ${(power * 100).toFixed(0)}%, Phase: ${phaseInfo}`)
      // Pass racquet world position, player rotation, and player position for hit accuracy calculation
      hitCallback(
        racquetPositionRef.current.clone(),
        currentRotation.current,
        currentPos.current.clone()
      )
    }
  }

  return (
    <>
      {/* No `position` prop — R3F would re-apply it on every Scene re-render and
          fight useFrame movement (body frozen, racquet still hittable). */}
      <group ref={groupRef}>
        {/* Player pyramid */}
        <group ref={pyramidRef}>
          <primitive
            object={playerModel}
            position={[0, 0, ATHLETE_MODEL_Z_OFFSET]}
            scale={ATHLETE_MODEL_SCALE} // [1,1,1] — authored size
          />
        </group>
        
        {/* Charge indicator ring - only shows when it's this player's turn AND charging */}
        {isCurrentStriker && isCharging && (
          <ChargeIndicator
            aim={aim}
            power={chargeLevel}
            loft={isControllable ? loft : LOFT_NEUTRAL}
            color={color}
          />
        )}

        {/* Split-step indicator */}
        {splitStepActive && (
          <SplitStepIndicator color={color} />
        )}
        
        {/* Live shot type — primary readout (auto type, not sector hint vocabulary). */}
        {isCurrentStriker && isCharging && currentShotName && (
          <Text
            position={[0, 0.06, -PLAYER_SIZE * 0.95]}
            rotation={[-Math.PI / 2, 0, 0]}
            font={FONT_UTILITY}
            fontSize={0.38}
            color={color}
            fillOpacity={displayAlpha(0.95)}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor={HEX.void}
            outlineOpacity={displayAlpha(0.9)}
            material-depthWrite={false}
          >
            {currentShotName.toUpperCase()}
          </Text>
        )}
      </group>

      {/* Racquet → shot aim beam (world space). Forward arc only. */}
      {isCurrentStriker && isCharging && isControllable && racquetReady && (
        <ShotAimBeam color={color} racquetPosRef={racquetPositionRef} />
      )}
      
      {/* Racquet - primitive geometry with physics sensor and swing animation */}
      {racquetReady && (
        <RigidBody
          ref={racquetBodyRef}
          type="kinematicPosition"
          colliders={false}
          name={isControllable ? 'playerRacquet' : 'opponentRacquet'}
          position={[racquetPositionRef.current.x, racquetPositionRef.current.y, racquetPositionRef.current.z]}
          quaternion={[
            racquetQuaternionRef.current.x,
            racquetQuaternionRef.current.y,
            racquetQuaternionRef.current.z,
            racquetQuaternionRef.current.w
          ]}
          onIntersectionEnter={handleRacquetIntersection}
        >
          {/* Sensor collider for hit detection - enlarged for more forgiving collision */}
          <CuboidCollider args={[0.4, 0.35, 0.3]} sensor />
          
          <primitive object={racquetModel} rotation={[0, RACQUET_FACE_YAW, 0]} />
        </RigidBody>
      )}
    </>
  )
}

/** World-space length of the racquet → shot aim beam (metres). */
const SHOT_AIM_BEAM_LENGTH = 2.8

const _aimBeamDir = new THREE.Vector3()
const _aimBeamTip = new THREE.Vector3()

/**
 * Charge aim line. Rally draws the 180° cone from the racquet (`aimPreviewDirection`),
 * including a downward kill. A serve draws `serveStrikeDirection` from the held ball —
 * the same always-up launch the strike applies — so the line cannot dive into the floor.
 * Length is the launch tangent, not the surface contact. The floor ring still carries
 * the wide stick. Updated in useFrame so it tracks without React re-renders.
 */
function ShotAimBeam({
  color,
  racquetPosRef,
}: {
  color: string
  racquetPosRef: React.MutableRefObject<THREE.Vector3>
}): React.ReactElement {
  const tipRef = useRef<THREE.Mesh>(null)
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    return g
  }, [])
  const mat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: displayAlpha(0.95),
        depthWrite: false,
      }),
    [color],
  )
  const lineObj = useMemo(() => new THREE.Line(geom, mat), [geom, mat])

  useFrame(() => {
    const { aim, loft } = useInputStore.getState()
    const phase = useGameStore.getState().phase
    let originX: number
    let originY: number
    let originZ: number

    if (phase === 'serving') {
      const box = useGameStore.getState().serviceBox
      const pose = serveBallWorldPosition(box)
      const strike = serveStrikeDirection(box, aim, loft)
      _aimBeamDir.set(strike.x, strike.y, strike.z)
      originX = pose.x
      originY = pose.y
      originZ = pose.z
    } else {
      _aimBeamDir.copy(aimPreviewDirection(aim, loft))
      originX = racquetPosRef.current.x
      originY = racquetPosRef.current.y
      originZ = racquetPosRef.current.z
    }

    _aimBeamTip.set(originX, originY, originZ).addScaledVector(_aimBeamDir, SHOT_AIM_BEAM_LENGTH)

    const pos = lineObj.geometry.attributes.position as THREE.BufferAttribute
    pos.setXYZ(0, originX, originY, originZ)
    pos.setXYZ(1, _aimBeamTip.x, _aimBeamTip.y, _aimBeamTip.z)
    pos.needsUpdate = true
    lineObj.geometry.computeBoundingSphere()

    const tip = tipRef.current
    if (tip) tip.position.copy(_aimBeamTip)
  })

  return (
    <group>
      <primitive object={lineObj} />
      <mesh ref={tipRef}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={displayAlpha(0.95)}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/**
 * Aim cone + length ring during charge. Outer arc = 180° toward the front wall only
 * (not a full circle); radial needle = left/right aim; inner ring fill = shot length
 * (charge). Left loft rail always on during charge (mid tick = neutral height).
 * Soft LOB / STRAIGHT / SMASH / BOAST labels are hints only — no snap.
 */
function ChargeIndicator({
  aim,
  power,
  loft,
  color,
}: {
  aim: number
  power: number
  loft: number
  color: string
}) {
  const fullArcLength = AIM_ARC_RANGE
  const quantisedAim = Math.round(aim * CHARGE_ARC_STEPS) / CHARGE_ARC_STEPS
  const quantisedPower = Math.round(power * CHARGE_ARC_STEPS) / CHARGE_ARC_STEPS
  const quantisedLoft = Math.round(loft * CHARGE_ARC_STEPS) / CHARGE_ARC_STEPS
  const powerArcLength = Math.max(fullArcLength * quantisedPower, 0.001)
  // Floor ring: θ=0 right → θ=π/2 front → θ=π left (front semicircle only).
  const coneStart = 0
  const needleLength = aimOuterNeedleLength()
  const needle = floorNeedlePose(quantisedAim, needleLength)
  // Length fills left → right along the same cone.
  const powerStart = Math.PI - powerArcLength

  const aimInner = PLAYER_SIZE * 1.6
  const aimOuter = PLAYER_SIZE * 2.0
  const powerInner = PLAYER_SIZE * 1.15
  const powerOuter = PLAYER_SIZE * 1.45
  const loftRailX = -(aimOuter + PLAYER_SIZE * 0.45)
  const loftHalf = PLAYER_SIZE * 1.15
  const loftMarkerY = (quantisedLoft - LOFT_NEUTRAL) * 2 * loftHalf
  const needleWidth = PLAYER_SIZE * 0.28
  const needleThickness = PLAYER_SIZE * 0.08
  const sectorHints = chargeRingHintPoses({
    aimLabelR: aimOuter + PLAYER_SIZE * 0.55,
    loftRailX: loftRailX - PLAYER_SIZE * 0.55,
    loftHalf,
  })
  const activeHints = chargeRingHintActivation(quantisedAim, quantisedLoft)

  return (
    <group position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[aimInner, aimOuter, 32, 1, coneStart, fullArcLength]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={displayAlpha(0.28)}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Arc end caps — make the 180° limit readable vs a full ring. */}
      {[0, Math.PI].map((theta) => (
        <mesh
          key={theta}
          position={[Math.cos(theta) * ((aimInner + aimOuter) * 0.5), Math.sin(theta) * ((aimInner + aimOuter) * 0.5), 0.001]}
          rotation={[0, 0, theta]}
        >
          <planeGeometry args={[(aimOuter - aimInner) * 1.15, PLAYER_SIZE * 0.1]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={displayAlpha(0.85)}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      <mesh>
        <ringGeometry args={[powerInner, powerOuter, 32, 1, coneStart, fullArcLength]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={displayAlpha(0.22)}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh>
        <ringGeometry args={[powerInner, powerOuter, 32, 1, powerStart, powerArcLength]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={displayAlpha(0.72)}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Length-band ticks: tap / drive / full length */}
      {POWER_BAND_LEVELS.map((level) => {
        const theta = aimToFloorNeedleTheta(level)
        const midR = (powerInner + powerOuter) * 0.5
        return (
          <mesh
            key={level}
            position={[Math.cos(theta) * midR, Math.sin(theta) * midR, 0.001]}
            rotation={[0, 0, theta]}
          >
            <planeGeometry
              args={[(powerOuter - powerInner) * 1.2, PLAYER_SIZE * 0.08]}
            />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={displayAlpha(0.75)}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}

      {/* Radial needle — offset into the forward ray (not a diameter through the body). */}
      <mesh
        position={[needle.x, needle.y, 0.002]}
        rotation={[0, 0, needle.theta]}
      >
        <planeGeometry args={[needleLength, needleThickness]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={displayAlpha(1)}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        position={[
          Math.cos(needle.theta) * needleLength,
          Math.sin(needle.theta) * needleLength,
          0.003,
        ]}
      >
        <circleGeometry args={[needleWidth * 0.35, 10]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={displayAlpha(0.95)}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Height rail — always on while charging; mid tick = neutral loft. */}
      <mesh position={[loftRailX, 0, 0.001]}>
        <planeGeometry args={[PLAYER_SIZE * 0.08, loftHalf * 2]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={displayAlpha(0.35)}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[loftRailX, 0, 0.002]}>
        <planeGeometry args={[PLAYER_SIZE * 0.22, PLAYER_SIZE * 0.05]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={displayAlpha(0.6)}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[loftRailX, loftMarkerY, 0.003]}>
        <circleGeometry args={[PLAYER_SIZE * 0.12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={displayAlpha(0.95)}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Sector hints — continuous aim; active stick sector brightens, never snaps. */}
      {sectorHints.map((hint) => {
        const active = activeHints[hint.key]
        return (
          <Text
            key={hint.key}
            position={[hint.x, hint.y, 0.004]}
            font={FONT_UTILITY}
            fontSize={PLAYER_SIZE * (active ? 0.32 : 0.24)}
            color={color}
            fillOpacity={displayAlpha(active ? 0.92 : 0.38)}
            anchorX="center"
            anchorY="middle"
            outlineWidth={active ? 0.014 : 0.01}
            outlineColor={HEX.void}
            outlineOpacity={displayAlpha(active ? 0.85 : 0.5)}
            material-depthWrite={false}
          >
            {hint.id}
          </Text>
        )
      })}

      <mesh>
        <circleGeometry args={[0.1, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={displayAlpha(0.65)}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

function aimOuterNeedleLength(): number {
  return PLAYER_SIZE * 2.0 + PLAYER_SIZE * 0.4
}

function SplitStepIndicator({ color }: { color: string }) {
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[PLAYER_SIZE * 1.2, 6]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={displayAlpha(0.15)}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}


// Preload models
useGLTF.preload(PLAYER_MODEL_PATH)
useGLTF.preload(RACQUET_MODEL_PATH)

export { PLAYER_SIZE, MOVEMENT }
