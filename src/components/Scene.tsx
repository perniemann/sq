import { useRef, useEffect, useCallback, useState, lazy, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import Court from './Court'
import Ball from './Ball'
import Player from './Player'
import WorldHud from './WorldHud'
import GameCamera from './GameCamera'
import { HEX } from '../theme/colors'
import { installRallyTelemetryGlobal } from '../systems/rallyTelemetry'
import { installReceiveTelemetryGlobal } from '../systems/receiveTelemetry'
import { opponentMatchDifficulty } from '../systems/matchDifficulty'

const OrbitDebug = lazy(() => import('./OrbitDebug'))
import { 
  useKeyboardInput,
  useMouseInput, 
  useInputStore, 
  useIsChasing, 
  useIsCharging,
  useChargePhase,
  useChaseStartTime,
  useChargeStartTime,
  useIsSwinging,
  useSwingStartTime,
  useSwingPower,
  usePendingShotPower,
  MOVEMENT_TIMING
} from '../hooks/useInput'
import { getTotalSwingDuration } from '../systems/swingAnimation'
import { useGameStore, type MovementPhase } from '../stores/gameStore'
import { detectShotType, getShotConfig } from '../systems/shotTypes'
import {
  createAIConfig,
  createAIState,
  updateAthlete,
  shouldStrike,
  type AIState,
  type AIConfig
} from '../systems/ai'
import { useServeReset } from '../hooks/useServeReset'
import { useBallCollisionHandlers } from '../hooks/useBallCollisionHandlers'
import { useHitHandlers } from '../hooks/useHitHandlers'
import { usePhaseInput } from '../hooks/usePhaseInput'
import { useDemoModeEffects } from '../hooks/useDemoModeEffects'
import { determinePointWinner, type PlayerSide, type PointReason } from '../systems/scoring'
import { SERVICE_BOX_POSITIONS, RECEIVER_POSITIONS } from '../systems/courtPositions'
import { serveBallWorldPosition, isBallFrozenBetweenPoints, humanServeHoldPosition, aiServeHoldPosition } from '../systems/serveRules'
import { playerChaseTarget, PLAYER_CHASE_SPEED } from '../systems/playerChase'
import { computePlayerAssist } from '../systems/playerAssist'
import { aimToPlayerRotation } from '../systems/aimRotation'
import { isInStrikeRange } from '../systems/hitTiming'
import {
  judgeInterference,
  separate,
  accumulateInterference,
  createInterferenceWatch,
} from '../systems/interference'
import { DEBUG } from '../config'

/**
 * The shipped camera has to be the one exercised during development, or it never gets
 * tested — splitting on `import.meta.env.DEV` is why the production build shipped a black
 * screen while dev looked fine. Append `?orbit` to the URL to inspect the scene with
 * OrbitControls instead.
 */
const USE_ORBIT_CONTROLS =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('orbit')

export default function Scene() {
  // Keyboard + mouse both route through pressButtonAction / button B store.
  useKeyboardInput()
  useMouseInput()

  const isCharging = useIsCharging()
  const pendingShotPower = usePendingShotPower()
  const chargePhase = useChargePhase()
  const isChasing = useIsChasing()
  const chaseStartTime = useChaseStartTime()
  const chargeStartTime = useChargeStartTime()
  const isSwinging = useIsSwinging()
  const swingStartTime = useSwingStartTime()
  const swingPower = useSwingPower()
  const updateHoldDuration = useInputStore(state => state.updateHoldDuration)
  const endSwing = useInputStore(state => state.endSwing)

  useEffect(() => {
    if (import.meta.env.DEV) {
      installRallyTelemetryGlobal()
      installReceiveTelemetryGlobal()
    }
  }, [])

  const phase = useGameStore(state => state.phase)
  const setPhase = useGameStore(state => state.setPhase)
  const rallyState = useGameStore(state => state.rallyState)
  const setRallyState = useGameStore(state => state.setRallyState)
  // Ball position is mutated in place each frame — do not subscribe (would re-render Scene @ 60 Hz).
  const ballPosition = useGameStore.getState().ballPosition
  const currentShotType = useGameStore(state => state.currentShotType)
  const setCurrentShotType = useGameStore(state => state.setCurrentShotType)
  const setLastShotType = useGameStore(state => state.setLastShotType)
  const currentStriker = useGameStore(state => state.currentStriker)
  const setCurrentStriker = useGameStore(state => state.setCurrentStriker)
  const setLastHitter = useGameStore(state => state.setLastHitter)
  const awardPointTo = useGameStore(state => state.awardPointTo)
  const callLet = useGameStore(state => state.callLet)
  const resetMatch = useGameStore(state => state.resetMatch)
  const startNextGame = useGameStore(state => state.startNextGame)
  const servingPlayer = useGameStore(state => state.servingPlayer)
  const serviceBox = useGameStore(state => state.serviceBox)
  const demoMode = useGameStore(state => state.demoMode)
  const setDemoMode = useGameStore(state => state.setDemoMode)
  const gamesWonPlayer = useGameStore(state => state.matchState.gamesWon.player)
  const gamesWonOpponent = useGameStore(state => state.matchState.gamesWon.opponent)
  const [movementPhase, setMovementPhase] = useState<MovementPhase>('idle')
  const movementPhaseRef = useRef<MovementPhase>('idle')
  const setMovementPhaseIfChanged = useCallback((next: MovementPhase) => {
    if (movementPhaseRef.current === next) return
    movementPhaseRef.current = next
    setMovementPhase(next)
  }, [])
  const [isRecovering, setIsRecovering] = useState(false)
  const recoveryTimeoutRef = useRef<number | null>(null)
  const ballRef = useRef<RapierRigidBody>(null)
  const canHit = useGameStore(state => state.canHit)
  const currentShotName =
    phase === 'serving' && isCharging && canHit && currentStriker === 'player'
      ? 'SERVE'
      : currentShotType
        ? getShotConfig(currentShotType).displayName
        : null
  
  // Ball held in the service box until strike (full pose pinned in Ball while serving).
  const servePose = serveBallWorldPosition(serviceBox as 'left' | 'right')
  const SERVE_BALL_POSITION: [number, number, number] = [
    servePose.x,
    servePose.y,
    servePose.z,
  ]
  
  // Player position state - use ref for actual position tracking
  // Start in the right service box (default starting box)
  const initialServicePos = SERVICE_BOX_POSITIONS.right
  const playerPosRef = useRef<[number, number, number]>([initialServicePos.x, 0.01, initialServicePos.z])
  const playerPositionVec = useRef(new THREE.Vector3(initialServicePos.x, 0.01, initialServicePos.z))
  const targetPosRef = useRef<[number, number, number] | null>(null)
  /** Chase vs soft assist speed — Player reads this with the target ref. */
  const moveSpeedRef = useRef(10)
  // Aim angle published by each Player so the proximity hit path can pass it on.
  const playerRotationRef = useRef(0)
  const aiRotationRef = useRef(0)
  
  // AI opponent state - starts in receiver position (back opposing quarter)
  const initialReceiverPos = RECEIVER_POSITIONS[serviceBox as keyof typeof RECEIVER_POSITIONS]
  const aiConfig = useRef<AIConfig>(createAIConfig('medium'))
  const aiState = useRef<AIState>(createAIState([initialReceiverPos.x, 0.01, initialReceiverPos.z]))

  // First human game opens easy; demo stays medium; ramp after either side wins a game.
  useEffect(() => {
    const next = opponentMatchDifficulty({
      demoMode,
      gamesWonPlayer,
      gamesWonOpponent,
    })
    if (aiConfig.current.difficulty === next) return
    aiConfig.current = createAIConfig(next)
    if (DEBUG) console.log('Opponent AI difficulty →', next)
  }, [demoMode, gamesWonPlayer, gamesWonOpponent])

  /** Opponent floor pose — updated in useFrame / serve reset; never via React setState. */
  const aiPosRef = useRef<[number, number, number]>([
    initialReceiverPos.x,
    0.01,
    initialReceiverPos.z,
  ])
  const lastAIHitTime = useRef(0)
  
  // Ball velocity tracking for AI prediction
  const ballVelocity = useRef(new THREE.Vector3())
  const lastBallPosition = useRef(new THREE.Vector3())
  // Reusable vectors to avoid per-frame allocations
  const aiPosVecRef = useRef(new THREE.Vector3())
  const tempVec1Ref = useRef(new THREE.Vector3())
  // Interference has to persist to be called, so the current judgement and when it began
  // are carried between frames.
  const interferenceWatch = useRef(createInterferenceWatch())
  
  // AI swing state management
  const [aiIsSwinging, setAIIsSwinging] = useState(false)
  const [aiSwingPower, setAISwingPower] = useState(0)
  const [aiChargePhase, setAIChargePhase] = useState<'none' | 'racquetPrep' | 'bodyCoil' | 'powerLoad'>('none')
  const aiChargeStartTime = useRef<number | null>(null)
  const aiSwingTimeoutRef = useRef<number | null>(null)
  const [aiSwingStartTime, setAISwingStartTime] = useState<number | null>(null)
  
  // Player AI state for demo mode (mirrors opponent AI)
  const playerAIConfig = useRef<AIConfig>(createAIConfig('medium'))
  const playerAIState = useRef<AIState>(createAIState([initialServicePos.x, 0.01, initialServicePos.z]))
  const lastPlayerAIHitTime = useRef(0)
  
  // Player AI swing state management (for demo mode)
  const [playerAIIsSwinging, setPlayerAIIsSwinging] = useState(false)
  const [playerAISwingPower, setPlayerAISwingPower] = useState(0)
  const [playerAIChargePhase, setPlayerAIChargePhase] = useState<'none' | 'racquetPrep' | 'bodyCoil' | 'powerLoad'>('none')
  const playerAIChargeStartTime = useRef<number | null>(null)
  const playerAISwingTimeoutRef = useRef<number | null>(null)
  const [playerAISwingStartTime, setPlayerAISwingStartTime] = useState<number | null>(null)

  /** Debounce ground shot-type preview so the label does not flicker frame-to-frame. */
  const shotPreviewCandidateRef = useRef<string | null>(null)
  const shotPreviewSinceRef = useRef(0)
  
  const {
    resetBallForServe,
    startNextRally,
    serveRefs,
  } = useServeReset({
    ballRef,
    playerPosRef,
    playerPositionVec,
    aiState,
    playerAIState,
    aiPosRef,
    lastAIHitTime,
  })
  
  /**
   * Award a point and handle the result
   */
  const handlePointScored = useCallback((winner: 'player' | 'opponent', reason: PointReason) => {
    // Read the phase from the store, not from this render's closure. A single floor
    // contact reports a bounce and a wall hit back to back, so the second call arrives
    // before React has re-rendered with the phase the first call set, and a stale
    // closure would award the same rally twice.
    const livePhase = useGameStore.getState().phase
    if (livePhase === 'point' || livePhase === 'gameOver' || livePhase === 'matchOver') {
      return
    }
    
    if (DEBUG) console.log(`Point for ${winner}: ${reason}`)
    
    awardPointTo(winner, reason)
    useInputStore.getState().endSwing()
    
    // Reset ball hit tracking
    serveRefs.ballHitFrontWall.current = false
    serveRefs.serveHitAboveServiceLine.current = false
    serveRefs.serveInFlight.current = false
  }, [awardPointTo, serveRefs])

  /**
   * End the rally with a let: no point, no change of server or service box, replayed by
   * the same "continue" path a point uses. Guarded on the live phase for the same reason
   * handlePointScored is — a rally can only end once.
   */
  const handleLetCalled = useCallback(() => {
    const livePhase = useGameStore.getState().phase
    if (livePhase === 'point' || livePhase === 'gameOver' || livePhase === 'matchOver') {
      return
    }

    if (DEBUG) console.log('LET: rally replayed, no point')

    callLet()
    useInputStore.getState().endSwing()

    serveRefs.ballHitFrontWall.current = false
    serveRefs.serveHitAboveServiceLine.current = false
    serveRefs.serveInFlight.current = false
  }, [callLet, serveRefs])

  const {
    handleWallHit,
    handleFloorBounce,
    handleTinHit,
    handleOutOfBounds,
  } = useBallCollisionHandlers({
    serveRefs,
    handlePointScored,
  })
  
  // Update hold duration and movement state every frame
  useFrame((_, delta) => {
    const clampedDelta = Math.min(delta, 0.1) // Cap at 100ms to avoid AI teleporting when tab was hidden
    const now = Date.now()
    // Early wind-up: charge while returnable on your turn — not gated on proximity.
    const canCharge =
      (phase === 'serving' || phase === 'rally') &&
      currentStriker === 'player' &&
      canHit
    
    if (isCharging && canCharge) {
      updateHoldDuration()

      // Serve is its own action — do not preview a rally DRIVE while the ball is held.
      if (phase === 'serving') {
        shotPreviewCandidateRef.current = null
        setCurrentShotType(null)
      } else {
        // Aim→yaw (not the lerped mesh yaw) so the ground label matches the charge arc.
        const input = useInputStore.getState()
        const detectedShot = detectShotType({
          playerPosition: playerPositionVec.current,
          ballPosition: ballPosition,
          playerRotation: aimToPlayerRotation(input.aim),
          chargePower: pendingShotPower,
          loft: input.loft,
        })
        if (detectedShot !== shotPreviewCandidateRef.current) {
          shotPreviewCandidateRef.current = detectedShot
          shotPreviewSinceRef.current = now
        } else if (
          now - shotPreviewSinceRef.current >= 80 &&
          currentShotType !== detectedShot
        ) {
          setCurrentShotType(detectedShot)
        }
      }
    } else {
      shotPreviewCandidateRef.current = null
      if (currentShotType !== null) setCurrentShotType(null)
    }
    
    // Chase (Shift) > soft receive assist > recovery. Assist is a capped Dead Cells-style
    // magnet — never a full auto-sprint (see `playerAssist.ts`).
    // Live phase: React `phase` can lag one frame after awardPointTo / startNextRally.
    const livePhase = useGameStore.getState().phase
    const liveServingPlayer = useGameStore.getState().servingPlayer
    const betweenPoints = isBallFrozenBetweenPoints(livePhase)
    const humanHold = humanServeHoldPosition(livePhase, liveServingPlayer, demoMode)

    if (betweenPoints) {
      targetPosRef.current = null
      moveSpeedRef.current = 0
      setMovementPhaseIfChanged('idle')
    } else if (isChasing) {
      const timeSinceChase = chaseStartTime ? Date.now() - chaseStartTime : 0
      
      if (timeSinceChase < MOVEMENT_TIMING.SPLIT_STEP_DURATION) {
        setMovementPhaseIfChanged('splitStep')
      } else {
        const distToBall = Math.sqrt(
          Math.pow(ballPosition.x - playerPosRef.current[0], 2) +
          Math.pow(ballPosition.z - playerPosRef.current[2], 2)
        )
        
        if (distToBall < 1.0) {
          setMovementPhaseIfChanged('approaching')
        } else {
          setMovementPhaseIfChanged('chasing')
        }
      }
      
      targetPosRef.current = playerChaseTarget(ballPosition.x, ballPosition.z)
      moveSpeedRef.current = PLAYER_CHASE_SPEED
    } else if (isRecovering) {
      targetPosRef.current = null
      setMovementPhaseIfChanged('recovering')
    } else if (!demoMode) {
      const assist = computePlayerAssist({
        playerX: playerPosRef.current[0],
        playerZ: playerPosRef.current[2],
        ball: ballPosition,
        ballVelocity: ballVelocity.current,
        isStriker: currentStriker === 'player',
        phase: livePhase,
        servingPlayer: liveServingPlayer,
        serviceBox: serviceBox as 'left' | 'right',
        isChasing: false,
        isRecovering: false,
        isSwinging: useInputStore.getState().swing.active,
        holdPosition: humanHold,
      })
      if (assist) {
        targetPosRef.current = assist.target
        moveSpeedRef.current = assist.speed
      } else {
        targetPosRef.current = null
      }
      setMovementPhaseIfChanged('idle')
    } else {
      targetPosRef.current = null
      setMovementPhaseIfChanged('idle')
    }
    
    // Update player position vector from ref
    playerPositionVec.current.set(
      playerPosRef.current[0],
      playerPosRef.current[1],
      playerPosRef.current[2]
    )
    
    if (DEBUG) {
      const w = window as unknown as { __probe?: Record<string, number[]> }
      const p = w.__probe ?? (w.__probe = { player: [], ai: [] })
      p.player.push(playerPositionVec.current.x, playerPositionVec.current.z)
      p.ai.push(aiPosRef.current[0], aiPosRef.current[2])
    }

    // --- INTERFERENCE (WSF Rule 8) ---
    // Both players cover the whole floor, so obstruction is judged once against whoever
    // is due to strike, rather than as two mirrored half-court checks.
    if (rallyState === 'active') {
      const playerIsStriker = currentStriker === 'player'
      const striker: PlayerSide = playerIsStriker ? 'player' : 'opponent'
      const strikerIsPlaying = playerIsStriker
        ? (demoMode ? playerAIState.current.isMovingToBall : isChasing)
        : aiState.current.isMovingToBall

      const call = judgeInterference({
        strikerPosition: playerIsStriker ? playerPositionVec.current : aiState.current.position,
        nonStrikerPosition: playerIsStriker ? aiState.current.position : playerPositionVec.current,
        ballPosition,
        strikerIsPlaying,
      })

      const { watch, award } = accumulateInterference(
        interferenceWatch.current,
        call,
        striker,
        now
      )
      interferenceWatch.current = watch

      if (award !== 'none') {
        if (DEBUG) console.log(`INTERFERENCE ${award}: striker=${striker}`)

        if (award === 'stroke') {
          // The non-striker is the player who just hit, so they are the last hitter.
          const blocker: PlayerSide = playerIsStriker ? 'opponent' : 'player'
          handlePointScored(determinePointWinner(blocker, striker, 'stroke'), 'stroke')
        } else {
          handleLetCalled()
        }
      }
    } else {
      interferenceWatch.current = createInterferenceWatch()
    }
    
    // --- PROXIMITY-BASED HIT CHECK (PLAYER) ---
    // Read swing from the store (not React `isSwinging`) so the release frame can connect
    // before the next re-render. Use planar range so high balls stay hittable.
    const liveSwing = useInputStore.getState().swing
    if (
      liveSwing.active &&
      canHit &&
      (phase === 'serving' || phase === 'rally') &&
      isInStrikeRange(playerPositionVec.current, ballPosition)
    ) {
      tempVec1Ref.current.copy(playerPositionVec.current)
      tempVec1Ref.current.y += 0.5
      tempVec1Ref.current.z -= 0.5
      handleRacquetHit(tempVec1Ref.current, playerRotationRef.current)
    }
    
    // --- PROXIMITY-BASED HIT CHECK (AI) ---
    if (aiIsSwinging && (phase === 'serving' || phase === 'rally')) {
      aiPosVecRef.current.set(...aiPosRef.current)
      if (isInStrikeRange(aiPosVecRef.current, ballPosition)) {
        tempVec1Ref.current.copy(aiPosVecRef.current)
        tempVec1Ref.current.y += 0.5
        tempVec1Ref.current.z -= 0.5
        handleAIRacquetHit(tempVec1Ref.current, aiRotationRef.current)
      }
    }
    
    // --- AI OPPONENT UPDATE ---
    const ball = ballRef.current
    const isAIServing = phase === 'serving' && servingPlayer === 'opponent'
    
    // Ball velocity for AI prediction: read from the body when available,
    // otherwise fall back to a finite difference across frames.
    if (ball) {
      const vel = ball.linvel()
      ballVelocity.current.set(vel.x, vel.y, vel.z)
    } else {
      ballVelocity.current.copy(ballPosition).sub(lastBallPosition.current).multiplyScalar(60)
    }
    lastBallPosition.current.copy(ballPosition)
    const actualBallVelocity = ballVelocity.current
    
    // Only update AI movement during active rally
    // During serving phase, AI holds receiver position (set by resetBallForServe)
    const shouldUpdateAI = phase === 'rally'
    
    if (shouldUpdateAI) {
      aiState.current = updateAthlete({
        state: aiState.current,
        ballPosition,
        ballVelocity: actualBallVelocity,
        config: aiConfig.current,
        deltaTime: clampedDelta,
        gamePhase: phase,
        isStriker: currentStriker === 'opponent',
        now,
        avoidPosition: demoMode ? playerAIState.current.position : playerPositionVec.current,
      })

      // In demo mode the player is an athlete too, and it has to move before the two are
      // pushed apart — separating against last frame's position lets a striker walk
      // straight into an opponent that has already yielded.
      if (demoMode) {
        playerAIState.current = updateAthlete({
          state: playerAIState.current,
          ballPosition,
          ballVelocity: actualBallVelocity,
          config: playerAIConfig.current,
          deltaTime: clampedDelta,
          gamePhase: phase,
          isStriker: currentStriker === 'player',
          now,
          avoidPosition: aiState.current.position,
        })
      }

      // Two bodies cannot share the same ground now that both cover the whole floor. The
      // non-striker yields, because the striker owns the space they are playing the ball
      // in. Outside demo mode only the opponent can be moved at all — the player's
      // position comes from their input and must not be shoved out from under it.
      if (!demoMode) {
        aiState.current.position = separate(aiState.current.position, playerPositionVec.current)
      } else if (currentStriker === 'player') {
        aiState.current.position = separate(aiState.current.position, playerAIState.current.position)
      } else {
        playerAIState.current.position = separate(
          playerAIState.current.position,
          aiState.current.position
        )
      }

      // Live refs only — no setState (that re-rendered Scene at 60 Hz).
      aiPosRef.current = [
        aiState.current.position.x,
        aiState.current.position.y,
        aiState.current.position.z,
      ]

      if (demoMode) {
        playerPosRef.current = [
          playerAIState.current.position.x,
          playerAIState.current.position.y,
          playerAIState.current.position.z
        ]
        playerPositionVec.current.copy(playerAIState.current.position)
      }
    }
    // During idle/point/serving phases, AI holds position (set by resetBallForServe)
    
    // Check if AI should hit the ball (only when it's AI's turn)
    const isAITurn = currentStriker === 'opponent' || isAIServing
    
    // AI charge time based on difficulty (200-500ms) - reduced for better responsiveness
    const AI_CHARGE_TIME = {
      easy: 500,
      medium: 350,
      hard: 200
    }[aiConfig.current.difficulty]
    
    // AI SWING STATE MACHINE
    // While a swing is active the hit is driven by contact, not by this block.
    if (aiIsSwinging) {
      // Intentionally empty
    }
    // If AI is charging, update charge phases
    else if (aiChargeStartTime.current !== null) {
      const chargeElapsed = now - aiChargeStartTime.current
      const chargeProgress = Math.min(1, chargeElapsed / AI_CHARGE_TIME)
      
      // Update charge phase based on elapsed time
      if (chargeElapsed < MOVEMENT_TIMING.RACQUET_PREP_TIME * 0.5) {
        setAIChargePhase('racquetPrep')
      } else if (chargeElapsed < AI_CHARGE_TIME * 0.7) {
        setAIChargePhase('bodyCoil')
      } else {
        setAIChargePhase('powerLoad')
      }
      
      // Update power level
      setAISwingPower(chargeProgress * 0.8 + 0.2) // 20-100% power
      
      // When charge is complete, trigger swing
      if (chargeElapsed >= AI_CHARGE_TIME) {
        setAIIsSwinging(true)
        setAISwingStartTime(Date.now())
        setAIChargePhase('none')
        
        if (DEBUG) console.log('AI swing started with power:', ((chargeProgress * 0.8 + 0.2) * 100).toFixed(0) + '%')
        
        // End swing after swing duration (if no collision occurs)
        // Use the new animation system's total swing duration
        aiSwingTimeoutRef.current = window.setTimeout(() => {
          setAIIsSwinging(false)
          setAISwingStartTime(null)
          setAISwingPower(0)
          aiChargeStartTime.current = null
          if (DEBUG) console.log('AI swing ended (no contact)')
        }, getTotalSwingDuration())
      }
    }
    // AI SERVE LOGIC: Start charging to serve after a delay
    else if (isAIServing && canHit && now - lastAIHitTime.current > 1000) {
      // Start AI serve charge
      aiChargeStartTime.current = now
      setAIChargePhase('racquetPrep')
      setAISwingPower(0)
      
      if (DEBUG) console.log('AI starting serve charge')
    }
    // Normal AI hit during rally - start charging when in position
    else if (isAITurn && shouldStrike({
      state: aiState.current,
      ballPosition,
      ballVelocity: actualBallVelocity,
      config: aiConfig.current,
      returnable: canHit,
    })) {
      // Debounce AI hits (minimum 300ms between hits)
      if (now - lastAIHitTime.current > 300) {
        // Start AI charge
        aiChargeStartTime.current = now
        setAIChargePhase('racquetPrep')
        setAISwingPower(0)
        
        if (DEBUG) console.log('AI starting rally charge at ball:', {
          ballPos: `(${ballPosition.x.toFixed(2)}, ${ballPosition.y.toFixed(2)}, ${ballPosition.z.toFixed(2)})`
        })
      }
    }
    
    // =====================================================================
    // DEMO MODE: Player AI Control
    // When in demo mode, player is also controlled by AI
    // =====================================================================
    if (demoMode && (phase === 'serving' || phase === 'rally')) {
      const isPlayerServing = phase === 'serving' && servingPlayer === 'player'
      const isPlayerTurn = currentStriker === 'player' || isPlayerServing
      
      // Player AI charge time
      const PLAYER_AI_CHARGE_TIME = {
        easy: 500,
        medium: 350,
        hard: 200
      }[playerAIConfig.current.difficulty]
      
      // Movement and body separation for both athletes happen together, above.

      // PROXIMITY-BASED HIT CHECK (Player AI in demo mode)
      if (playerAIIsSwinging && isInStrikeRange(playerPositionVec.current, ballPosition)) {
        tempVec1Ref.current.copy(playerPositionVec.current)
        tempVec1Ref.current.y += 0.5
        tempVec1Ref.current.z -= 0.5
        handlePlayerAIRacquetHit(tempVec1Ref.current, playerRotationRef.current)
      }
      
      // PLAYER AI SWING STATE MACHINE
      if (playerAIIsSwinging) {
        // Intentionally empty
      }
      else if (playerAIChargeStartTime.current !== null) {
        const chargeElapsed = now - playerAIChargeStartTime.current
        const chargeProgress = Math.min(1, chargeElapsed / PLAYER_AI_CHARGE_TIME)
        
        // Update charge phase
        if (chargeElapsed < MOVEMENT_TIMING.RACQUET_PREP_TIME * 0.5) {
          setPlayerAIChargePhase('racquetPrep')
        } else if (chargeElapsed < PLAYER_AI_CHARGE_TIME * 0.7) {
          setPlayerAIChargePhase('bodyCoil')
        } else {
          setPlayerAIChargePhase('powerLoad')
        }
        
        setPlayerAISwingPower(chargeProgress * 0.8 + 0.2)
        
        // When charge complete, trigger swing
        if (chargeElapsed >= PLAYER_AI_CHARGE_TIME) {
          setPlayerAIIsSwinging(true)
          setPlayerAISwingStartTime(Date.now())
          setPlayerAIChargePhase('none')
          
          if (DEBUG) console.log('Player AI swing started with power:', ((chargeProgress * 0.8 + 0.2) * 100).toFixed(0) + '%')
          
          // End swing after duration
          playerAISwingTimeoutRef.current = window.setTimeout(() => {
            setPlayerAIIsSwinging(false)
            setPlayerAISwingStartTime(null)
            setPlayerAISwingPower(0)
            playerAIChargeStartTime.current = null
            if (DEBUG) console.log('Player AI swing ended (no contact)')
          }, getTotalSwingDuration())
        }
      }
      // Player AI serve logic
      else if (isPlayerServing && canHit && now - lastPlayerAIHitTime.current > 1000) {
        playerAIChargeStartTime.current = now
        setPlayerAIChargePhase('racquetPrep')
        setPlayerAISwingPower(0)
        
        if (DEBUG) console.log('Player AI starting serve charge')
      }
      // Player AI rally hit
      else if (isPlayerTurn && shouldStrike({
        state: playerAIState.current,
        ballPosition,
        ballVelocity: actualBallVelocity,
        config: playerAIConfig.current,
        returnable: canHit,
      })) {
        if (now - lastPlayerAIHitTime.current > 300) {
          playerAIChargeStartTime.current = now
          setPlayerAIChargePhase('racquetPrep')
          setPlayerAISwingPower(0)
          
          if (DEBUG) console.log('Player AI starting rally charge')
        }
      }
    }
  })
  
  /**
   * Trigger recovery movement after shot
   * Player automatically moves back to T-position
   */
  const triggerRecovery = useCallback(() => {
    setIsRecovering(true)
    setMovementPhaseIfChanged('recovering')
    
    // Clear any existing timeout
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current)
    }
    
    // End recovery after follow-through time + recovery duration
    recoveryTimeoutRef.current = window.setTimeout(() => {
      setIsRecovering(false)
      setMovementPhaseIfChanged('idle')
    }, MOVEMENT_TIMING.FOLLOW_THROUGH_TIME + 1500) // Follow-through + time to reach T
  }, [setMovementPhaseIfChanged])

  // Controllable Player writes pose imperatively — keep this callback identity stable.
  const onPlayerPositionFrame = useCallback((x: number, y: number, z: number) => {
    playerPosRef.current = [x, y, z]
    playerPositionVec.current.set(x, y, z)
  }, [])

  const {
    handleRacquetHit,
    handleAIRacquetHit,
    handlePlayerAIRacquetHit,
  } = useHitHandlers({
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
  })

  usePhaseInput({
    resetBallForServe,
    startNextRally,
    startNextGame,
    resetMatch,
    setPhase,
    setRallyState,
    setCurrentStriker,
    setDemoMode,
    setAIIsSwinging,
    setAISwingStartTime,
    setAISwingPower,
    setAIChargePhase,
    setPlayerAIIsSwinging,
    setPlayerAISwingStartTime,
    setPlayerAISwingPower,
    setPlayerAIChargePhase,
    aiChargeStartTime,
    aiSwingTimeoutRef,
    playerAIChargeStartTime,
    playerAISwingTimeoutRef,
  })

  useDemoModeEffects({
    resetBallForServe,
    startNextRally,
    startNextGame,
    resetMatch,
    setPhase,
    setRallyState,
    setCurrentStriker,
  })
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    const recovery = recoveryTimeoutRef
    const aiSwing = aiSwingTimeoutRef
    const playerAISwing = playerAISwingTimeoutRef
    return () => {
      if (recovery.current) clearTimeout(recovery.current)
      if (aiSwing.current) clearTimeout(aiSwing.current)
      if (playerAISwing.current) clearTimeout(playerAISwing.current)
    }
  }, [])

  return (
    <>
      {/* Camera controls */}
      {USE_ORBIT_CONTROLS ? (
        <Suspense fallback={null}>
          <OrbitDebug />
        </Suspense>
      ) : (
        <GameCamera followEnabled={true} smoothing={0.12} />
      )}
      
      {/* Void substrate — tinted near-black from the color system */}
      <color attach="background" args={[HEX.void]} />
      
      {/* Court geometry */}
      <Court />

      {/* Diegetic score / prompts / callouts on the front wall */}
      <WorldHud />
      
      {/* Ball with physics - starts in service box area */}
      <Ball 
        rigidBodyRef={ballRef}
        initialPosition={SERVE_BALL_POSITION}
        onWallHit={handleWallHit}
        onFloorBounce={handleFloorBounce}
        onTinHit={handleTinHit}
        onOutOfBounds={handleOutOfBounds}
      />
      
      {/* Player (cyan) - controllable (or AI in demo mode), starts in service box */}
      <Player 
        position={playerPosRef.current}
        ballPosition={ballPosition}
        isCharging={
          demoMode
            ? playerAIChargePhase !== 'none'
            : isCharging && canHit && currentStriker === 'player'
        }
        // Fill opacity + dial use shot power only while charging (idle = 0 strength).
        chargeLevel={
          demoMode
            ? playerAISwingPower
            : isCharging && canHit && currentStriker === 'player'
              ? pendingShotPower
              : 0
        }
        chargePhase={demoMode ? playerAIChargePhase : chargePhase}
        movementPhase={demoMode ? 'idle' : movementPhase}
        chaseStartTime={demoMode ? null : chaseStartTime}
        isRecovering={demoMode ? false : isRecovering}
        isControllable={!demoMode}
        isSwinging={demoMode ? playerAIIsSwinging : isSwinging}
        swingPower={demoMode ? playerAISwingPower : swingPower}
        onRacquetHit={demoMode ? handlePlayerAIRacquetHit : handleRacquetHit}
        isCurrentStriker={currentStriker === 'player'}
        // Freeze idle / between points / while *you* serve. Receivers stay free to chase.
        holdPosition={humanServeHoldPosition(phase, servingPlayer, demoMode)}
        chargeStartTime={demoMode ? playerAIChargeStartTime.current : chargeStartTime}
        swingStartTime={demoMode ? playerAISwingStartTime : swingStartTime}
        currentShotName={demoMode ? null : currentShotName}
        rotationRef={playerRotationRef}
        onPositionFrame={demoMode ? undefined : onPlayerPositionFrame}
        targetPositionRef={demoMode ? undefined : targetPosRef}
        moveSpeedRef={demoMode ? undefined : moveSpeedRef}
        livePositionRef={playerPosRef}
      />
      
      {/* Opponent (orange) - AI controlled, starts in receiver position */}
      <Player 
        position={aiPosRef.current}
        livePositionRef={aiPosRef}
        ballPosition={ballPosition}
        color={HEX.opponent}
        isControllable={false}
        isCharging={aiChargePhase !== 'none'}
        chargeLevel={aiSwingPower}
        chargePhase={aiChargePhase}
        isSwinging={aiIsSwinging}
        swingPower={aiSwingPower}
        onRacquetHit={handleAIRacquetHit}
        isCurrentStriker={currentStriker === 'opponent'}
        holdPosition={aiServeHoldPosition(phase)}
        chargeStartTime={aiChargeStartTime.current}
        swingStartTime={aiSwingStartTime}
        rotationRef={aiRotationRef}
      />
    </>
  )
}
