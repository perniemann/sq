import { useCallback, useRef } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useGameStore } from '../stores/gameStore'
import { DEBUG } from '../config'
import { recordStrike } from '../systems/rallyTelemetry'
import { useInputStore } from './useInput'
import {
  calculateShotVelocity,
  getShotConfig,
  type ShotType,
} from '../systems/shotTypes'
import { aiRallyAim, calculateAIShot, shouldPlayDrop, type AIConfig } from '../systems/ai'
import {
  serveHorizontalAngle,
  serveHorizontalFromAim,
  serveLoft,
  serveLoftForOpponent,
  serveLoftFromStick,
  serveSpeed,
  serveSpeedForOpponent,
} from '../systems/serveRules'
import { aimToPlayerRotation } from '../systems/aimRotation'
import { recordReceiveSample } from '../systems/receiveTelemetry'
import { calculateSwingState } from '../systems/swingAnimation'
import { swingTimingQuality } from '../systems/hitTiming'
import type { ServeRefs } from './useServeReset'

interface UseHitHandlersParams {
  ballRef: React.RefObject<RapierRigidBody | null>
  ballPosition: THREE.Vector3
  playerPositionVec: React.MutableRefObject<THREE.Vector3>
  aiPosRef: React.MutableRefObject<[number, number, number]>
  serveRefs: ServeRefs
  setLastHitter: (h: 'player' | 'opponent' | null) => void
  setCurrentStriker: (s: 'player' | 'opponent') => void
  setPhase: (p: 'idle' | 'serving' | 'rally' | 'point' | 'gameOver' | 'matchOver') => void
  setRallyState: (s: 'inactive' | 'serving' | 'active' | 'ended') => void
  setCurrentShotType: (s: ShotType | null) => void
  setLastShotType: (s: ShotType) => void
  aiSwingPower: number
  playerAISwingPower: number
  /** Read for `accuracy`, which decides how far each AI shot misses its aim point. */
  aiConfig: React.MutableRefObject<AIConfig>
  playerAIConfig: React.MutableRefObject<AIConfig>
  lastAIHitTime: React.MutableRefObject<number>
  lastPlayerAIHitTime: React.MutableRefObject<number>
  aiChargeStartTime: React.MutableRefObject<number | null>
  aiSwingTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  playerAIChargeStartTime: React.MutableRefObject<number | null>
  playerAISwingTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  setAIIsSwinging: (v: boolean) => void
  setAISwingStartTime: (v: number | null) => void
  setAISwingPower: (v: number) => void
  setAIChargePhase: (p: 'none' | 'racquetPrep' | 'bodyCoil' | 'powerLoad') => void
  setPlayerAIIsSwinging: (v: boolean) => void
  setPlayerAISwingStartTime: (v: number | null) => void
  setPlayerAISwingPower: (v: number) => void
  setPlayerAIChargePhase: (p: 'none' | 'racquetPrep' | 'bodyCoil' | 'powerLoad') => void
  endSwing: () => void
  triggerRecovery: () => void
}

/**
 * The ball can be struck by the racquet sensor and by the per-frame proximity check in the
 * same tick. This is the shortest gap allowed between any two strikes, which keeps a single
 * swing from applying its impulse twice.
 */
const HIT_COOLDOWN_MS = 150

/**
 * A miss sample in [-1, 1], centre-weighted so most shots land near the aim point and
 * only a few stray far enough to find the tin or the side wall.
 */
function missSample(): number {
  return (Math.random() + Math.random() + Math.random()) / 1.5 - 1
}

/**
 * A racquet strike replaces the ball's velocity. Adding to it would make shot power
 * depend on how fast the ball arrived, and a fast enough incoming ball would send the
 * "shot" backwards.
 */
function strikeBall(ball: RapierRigidBody, direction: THREE.Vector3, speed: number): void {
  recordStrike()
  ball.setLinvel(
    { x: direction.x * speed, y: direction.y * speed, z: direction.z * speed },
    true
  )
  ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
}

export function useHitHandlers(params: UseHitHandlersParams): {
  handleRacquetHit: (racquetPosition: THREE.Vector3, playerRotation?: number) => void
  handleAIRacquetHit: (racquetPosition: THREE.Vector3, playerRotation?: number) => void
  handlePlayerAIRacquetHit: (racquetPosition: THREE.Vector3, playerRotation?: number) => void
} {
  const {
    ballRef,
    ballPosition,
    playerPositionVec,
    aiPosRef,
    serveRefs,
    setLastHitter,
    setCurrentStriker,
    setPhase,
    setRallyState,
    setCurrentShotType,
    setLastShotType,
    aiSwingPower,
    playerAISwingPower,
    aiConfig,
    playerAIConfig,
    lastAIHitTime,
    lastPlayerAIHitTime,
    aiChargeStartTime,
    aiSwingTimeoutRef,
    playerAIChargeStartTime,
    playerAISwingTimeoutRef,
    setAIIsSwinging,
    setAISwingStartTime,
    setAISwingPower,
    setAIChargePhase,
    setPlayerAIIsSwinging,
    setPlayerAISwingStartTime,
    setPlayerAISwingPower,
    setPlayerAIChargePhase,
    endSwing,
    triggerRecovery,
  } = params

  const phase = useGameStore(state => state.phase)
  const servingPlayer = useGameStore(state => state.servingPlayer)

  const lastHitAtRef = useRef(0)
  const claimHit = useCallback((): boolean => {
    const now = Date.now()
    if (now - lastHitAtRef.current < HIT_COOLDOWN_MS) return false
    lastHitAtRef.current = now
    return true
  }, [])

  const handleRacquetHit = useCallback(
    (_racquetPosition: THREE.Vector3, _playerRotation = 0) => {
      const ball = ballRef.current
      // canHit is checked here rather than only at the call sites, because the racquet
      // sensor fires independently of the proximity check and must obey the same rule.
      if (!ball || !useGameStore.getState().canHit || !claimHit()) return

      useGameStore.getState().resetStrikeWallTracking()

      const power = useInputStore.getState().swing.power
      let direction: THREE.Vector3
      let speed: number
      let shotDisplayName: string
      let executedShotType: ShotType | null = null

      if (phase === 'serving') {
        const currentBox = useGameStore.getState().serviceBox
        const { aim, loft } = useInputStore.getState()
        direction = new THREE.Vector3(
          serveHorizontalFromAim(currentBox, aim),
          serveLoftFromStick(loft),
          -1,
        ).normalize()
        speed = serveSpeed(power)
        shotDisplayName = `SERVE (${currentBox.toUpperCase()})`
      } else {
        // Live aim yaw (not lerped mesh yaw) so executed type matches the ground preview.
        const input = useInputStore.getState()
        const swing = calculateSwingState(
          input.buttonA.pressed,
          input.buttonA.holdStart,
          input.swing.active,
          input.swing.startTime,
          ballPosition,
          playerPositionVec.current,
        )
        const shot = calculateShotVelocity(
          power,
          playerPositionVec.current,
          ballPosition,
          aimToPlayerRotation(input.aim),
          input.loft,
          { timingQuality: swingTimingQuality(swing) },
        )
        executedShotType = shot.type
        shotDisplayName = getShotConfig(shot.type).displayName
        direction = shot.direction
        speed = shot.speed
      }

      if (DEBUG) console.log(
        `${shotDisplayName}: power=${(power * 100).toFixed(0)}%, speed=${speed.toFixed(1)} m/s, dir=(${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})`
      )

      strikeBall(ball, direction, speed)
      useGameStore.getState().signalBallHit('player', power)

      // Phase 0 evidence: successful human return while chasing (or not).
      if (phase === 'rally') {
        recordReceiveSample({
          outcome: 'returned',
          chased: useInputStore.getState().buttonB.pressed,
          now: Date.now(),
        })
      }

      if (executedShotType) {
        setLastShotType(executedShotType)
      }
      setCurrentShotType(null)
      setLastHitter('player')
      setCurrentStriker('opponent')
      serveRefs.ballHitFrontWall.current = false

      if (phase === 'serving') {
        serveRefs.serveInFlight.current = true
        setPhase('rally')
        setRallyState('active')
      } else {
        serveRefs.serveInFlight.current = false
      }
      useGameStore.getState().setCanHit(false)
      endSwing()
      triggerRecovery()
    },
    [
      ballRef,
      ballPosition,
      claimHit,
      phase,
      playerPositionVec,
      serveRefs,
      setCurrentShotType,
      setCurrentStriker,
      setLastHitter,
      setLastShotType,
      setPhase,
      setRallyState,
      endSwing,
      triggerRecovery,
    ]
  )

  const handleAIRacquetHit = useCallback(
    (_racquetPosition: THREE.Vector3) => {
      const ball = ballRef.current
      // The AI is bound by front-wall returnability too. It used to clear `canHit`
      // without ever checking it, so only the human was actually held to it.
      if (!ball || !useGameStore.getState().canHit || !claimHit()) return

      useGameStore.getState().resetStrikeWallTracking()

      const power = aiSwingPower
      let direction: THREE.Vector3
      let speed: number
      let shotDisplayName: string

      if (phase === 'serving' && servingPlayer === 'opponent') {
        const currentBox = useGameStore.getState().serviceBox
        const softVsHuman = !useGameStore.getState().demoMode
        direction = new THREE.Vector3(
          serveHorizontalAngle(currentBox),
          serveLoftForOpponent(power, { softVsHuman }),
          -1,
        ).normalize()
        speed = serveSpeedForOpponent(power, { softVsHuman })
        shotDisplayName = `AI SERVE (${currentBox.toUpperCase()})`
      } else {
        // Aim away from the human, not the AI's own floor X (that locked left when the
        // player held the right service side).
        const lateralAim = aiRallyAim(playerPositionVec.current.x, Math.random())
        const shot = calculateAIShot({
          ballPosition,
          power,
          lateralAim,
          heightAim: Math.random(),
          accuracy: aiConfig.current.accuracy,
          lateralMiss: missSample(),
          heightMiss: missSample(),
          drop: shouldPlayDrop(ballPosition, lateralAim, Math.random()),
        })
        direction = shot.direction
        speed = shot.speed
        shotDisplayName = 'AI Shot'
      }

      if (DEBUG) console.log(
        `${shotDisplayName}: power=${(power * 100).toFixed(0)}%, speed=${speed.toFixed(1)} m/s, dir=(${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})`
      )

      strikeBall(ball, direction, speed)
      useGameStore.getState().signalBallHit('opponent', power)
      lastAIHitTime.current = Date.now()
      setLastHitter('opponent')
      setCurrentStriker('player')
      serveRefs.ballHitFrontWall.current = false

      if (phase === 'serving') {
        serveRefs.serveInFlight.current = true
        setPhase('rally')
        setRallyState('active')
      } else {
        serveRefs.serveInFlight.current = false
      }
      setAIIsSwinging(false)
      setAISwingStartTime(null)
      setAISwingPower(0)
      setAIChargePhase('none')
      aiChargeStartTime.current = null
      if (aiSwingTimeoutRef.current) {
        clearTimeout(aiSwingTimeoutRef.current)
        aiSwingTimeoutRef.current = null
      }
      useGameStore.getState().setCanHit(false)
    },
    [
      ballRef,
      ballPosition,
      claimHit,
      phase,
      servingPlayer,
      aiSwingPower,
      aiConfig,
      playerPositionVec,
      serveRefs,
      lastAIHitTime,
      aiChargeStartTime,
      aiSwingTimeoutRef,
      setLastHitter,
      setCurrentStriker,
      setPhase,
      setRallyState,
      setAIIsSwinging,
      setAISwingStartTime,
      setAISwingPower,
      setAIChargePhase,
    ]
  )

  const handlePlayerAIRacquetHit = useCallback(
    (_racquetPosition: THREE.Vector3) => {
      const ball = ballRef.current
      if (!ball || !useGameStore.getState().canHit || !claimHit()) return

      useGameStore.getState().resetStrikeWallTracking()

      const power = playerAISwingPower
      let direction: THREE.Vector3
      let speed: number
      let shotDisplayName: string

      if (phase === 'serving' && servingPlayer === 'player') {
        const currentBox = useGameStore.getState().serviceBox
        direction = new THREE.Vector3(
          serveHorizontalAngle(currentBox),
          serveLoft(power),
          -1,
        ).normalize()
        speed = serveSpeed(power)
        shotDisplayName = `PLAYER AI SERVE (${currentBox.toUpperCase()})`
      } else {
        const lateralAim = aiRallyAim(aiPosRef.current[0], Math.random())
        const shot = calculateAIShot({
          ballPosition,
          power,
          lateralAim,
          heightAim: Math.random(),
          accuracy: playerAIConfig.current.accuracy,
          lateralMiss: missSample(),
          heightMiss: missSample(),
          drop: shouldPlayDrop(ballPosition, lateralAim, Math.random()),
        })
        direction = shot.direction
        speed = shot.speed
        shotDisplayName = 'Player AI Shot'
      }

      if (DEBUG) console.log(
        `${shotDisplayName}: power=${(power * 100).toFixed(0)}%, speed=${speed.toFixed(1)} m/s, dir=(${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})`
      )

      strikeBall(ball, direction, speed)
      useGameStore.getState().signalBallHit('player', power)
      lastPlayerAIHitTime.current = Date.now()
      setLastHitter('player')
      setCurrentStriker('opponent')
      serveRefs.ballHitFrontWall.current = false

      if (phase === 'serving') {
        serveRefs.serveInFlight.current = true
        setPhase('rally')
        setRallyState('active')
      } else {
        serveRefs.serveInFlight.current = false
      }
      setPlayerAIIsSwinging(false)
      setPlayerAISwingStartTime(null)
      setPlayerAISwingPower(0)
      setPlayerAIChargePhase('none')
      playerAIChargeStartTime.current = null
      if (playerAISwingTimeoutRef.current) {
        clearTimeout(playerAISwingTimeoutRef.current)
        playerAISwingTimeoutRef.current = null
      }
      useGameStore.getState().setCanHit(false)
    },
    [
      ballRef,
      ballPosition,
      claimHit,
      phase,
      servingPlayer,
      playerAISwingPower,
      playerAIConfig,
      aiPosRef,
      serveRefs,
      lastPlayerAIHitTime,
      playerAIChargeStartTime,
      playerAISwingTimeoutRef,
      setLastHitter,
      setCurrentStriker,
      setPhase,
      setRallyState,
      setPlayerAIIsSwinging,
      setPlayerAISwingStartTime,
      setPlayerAISwingPower,
      setPlayerAIChargePhase,
    ]
  )

  return {
    handleRacquetHit,
    handleAIRacquetHit,
    handlePlayerAIRacquetHit,
  }
}
