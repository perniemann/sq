import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../stores/gameStore'
import { COURT, FRONT_WALL_Z } from '../systems/court'
import {
  BALL_FOLLOW_WEIGHT,
  CAMERA_LOOK_FRONT_BIAS,
  CAMERA_OFFSET,
  CAMERA_SUBJECT_REST,
  CAMERA_X_TRAVEL,
  SUBJECT_MAX_Y,
  SUBJECT_MIN_Y,
} from '../systems/cameraRig'

/**
 * Fixed look at the front-wall tin for scale/colour evidence. Append `?tin` — same convention
 * as `?orbit` / `?nobloom`. Not a gameplay camera.
 */
const TIN_VIEW =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('tin')

interface GameCameraProps {
  followEnabled: boolean
  /** Fraction of the remaining distance covered in one 60 Hz frame. */
  smoothing: number
}

const OFFSET = new THREE.Vector3(CAMERA_OFFSET.x, CAMERA_OFFSET.y, CAMERA_OFFSET.z)
const COURT_CENTRE = new THREE.Vector3(
  CAMERA_SUBJECT_REST.x,
  CAMERA_SUBJECT_REST.y,
  CAMERA_SUBJECT_REST.z
)
const LOOK_FRONT_BIAS = new THREE.Vector3(
  CAMERA_LOOK_FRONT_BIAS.x,
  CAMERA_LOOK_FRONT_BIAS.y,
  CAMERA_LOOK_FRONT_BIAS.z
)

/**
 * Smooth-follow camera that tracks the ball, bounded to the court.
 *
 * The subject is clamped into the court volume before anything else: a ball that leaves
 * the court must not take the camera with it, which is what left the shipped build
 * rendering a black screen.
 */
export default function GameCamera({
  followEnabled,
  smoothing,
}: GameCameraProps): null {
  const positionRef = useRef(new THREE.Vector3().copy(COURT_CENTRE).add(OFFSET))
  const lookAtRef = useRef(new THREE.Vector3().copy(COURT_CENTRE).add(LOOK_FRONT_BIAS))
  const clampedBallRef = useRef(new THREE.Vector3())
  const subjectRef = useRef(new THREE.Vector3())
  const lookTargetRef = useRef(new THREE.Vector3())
  const desiredRef = useRef(new THREE.Vector3())

  useFrame(({ camera }, delta) => {
    if (TIN_VIEW) {
      // Close to the front wall, looking slightly down at the tin band so it fills the frame.
      camera.position.set(0, 1.0, -2.2)
      camera.lookAt(0, COURT.tinHeight * 0.5, FRONT_WALL_Z)
      return
    }

    if (!followEnabled) return

    const ballPosition = useGameStore.getState().ballPosition
    const halfWidth = COURT.width / 2
    const halfLength = COURT.length / 2

    const clampedBall = clampedBallRef.current.set(
      THREE.MathUtils.clamp(ballPosition.x, -halfWidth, halfWidth),
      THREE.MathUtils.clamp(ballPosition.y, SUBJECT_MIN_Y, SUBJECT_MAX_Y),
      THREE.MathUtils.clamp(ballPosition.z, -halfLength, halfLength)
    )
    const subject = subjectRef.current.copy(COURT_CENTRE).lerp(clampedBall, BALL_FOLLOW_WEIGHT)

    // `smoothing` is expressed per 60 Hz frame, so convert it to this frame's real delta
    // rather than letting the convergence rate ride on the frame rate.
    const alpha = 1 - Math.pow(1 - smoothing, delta * 60)

    // The camera sits behind the back wall by design — the court's back panels are
    // translucent — so z is free and only lateral travel is bounded (tightly, so the
    // frame stays a composed court shot rather than a side-on chase).
    const desired = desiredRef.current.copy(subject).add(OFFSET)
    const xLimit = halfWidth * CAMERA_X_TRAVEL
    desired.x = THREE.MathUtils.clamp(desired.x, -xLimit, xLimit)

    positionRef.current.lerp(desired, alpha)
    camera.position.copy(positionRef.current)

    const lookTarget = lookTargetRef.current.copy(subject).add(LOOK_FRONT_BIAS)
    lookAtRef.current.lerp(lookTarget, alpha)
    camera.lookAt(lookAtRef.current)
  })

  return null
}
