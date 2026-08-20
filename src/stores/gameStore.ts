import { create } from 'zustand'
import * as THREE from 'three'
import type { ShotType } from '../systems/shotTypes'
import { 
  type PlayerSide, 
  type PointReason, 
  type MatchState,
  type GameScore,
  createMatchState,
  awardPoint,
  awardGame,
  isGameBall,
  isMatchBall,
  DEFAULT_MATCH_CONFIG
} from '../systems/scoring'
import { endRally } from '../systems/rallyTelemetry'
import type { BallHitSide } from '../systems/ballHitFlash'

type GamePhase = 'idle' | 'serving' | 'rally' | 'point' | 'gameOver' | 'matchOver'

/** Rally state tracking */
type RallyState = 'inactive' | 'serving' | 'active' | 'ended'

/**
 * Service box (left or right)
 * 
 * Official WSF rules:
 * - Server chooses box at start of game and when service changes hands
 * - After winning a rally as server, MUST alternate to other box
 * - On a let, serve from same box
 */
type ServiceBox = 'left' | 'right'

/**
 * Player movement phases based on professional squash biomechanics
 * 
 * idle: Standing at T-position, ready
 * splitStep: Brief hop/pause (80-120ms) before explosive movement
 * chasing: Fast acceleration toward ball
 * approaching: Decelerating near ball, preparing shot
 * recovering: Moving back to T-position after shot
 */
type MovementPhase = 'idle' | 'splitStep' | 'chasing' | 'approaching' | 'recovering'

/**
 * Shot charge phases based on squash swing mechanics
 * 
 * none: Not charging
 * racquetPrep: Backswing begins (0-0.3s)
 * bodyCoil: Torso rotation, weight on back foot (0.3-0.8s)
 * powerLoad: Maximum coil, ready to release (0.8s+)
 * followThrough: After release, momentum carries through
 */
type ChargePhase = 'none' | 'racquetPrep' | 'bodyCoil' | 'powerLoad' | 'followThrough'

/**
 * Everything tracked "since the last strike". These have to be cleared together, so every
 * reset spreads this rather than listing the fields and drifting apart.
 */
const STRIKE_TRACKING_RESET = {
  firstWallHitSinceStrike: null,
  frontWallHitSinceStrike: false,
  floorBouncesSinceStrike: 0,
} as const

/** How a rally ended. Set together when one ends, cleared together when the next starts. */
const RALLY_RESULT_RESET = {
  pointWinner: null,
  pointReason: null,
  letCalled: false,
} as const

interface GameState {
  // Game phase
  phase: GamePhase
  setPhase: (phase: GamePhase) => void
  
  // Rally state
  rallyState: RallyState
  setRallyState: (state: RallyState) => void
  
  // Turn tracking
  currentStriker: PlayerSide    // Whose turn to hit the ball
  lastHitter: PlayerSide | null // Who hit the ball last
  setCurrentStriker: (striker: PlayerSide) => void
  setLastHitter: (hitter: PlayerSide | null) => void

  /**
   * True when the prior return has completed on the front wall (or serve is ready).
   * Cleared on strike; restored only by front-wall contact (WSF 6.2).
   */
  canHit: boolean
  setCanHit: (canHit: boolean) => void
  
  // Point scoring with reason
  pointReason: PointReason | null
  pointWinner: PlayerSide | null
  setPointResult: (winner: PlayerSide, reason: PointReason) => void
  clearPointResult: () => void

  /**
   * WSF Rule 8.7: a let ends the rally with no point, no change of server and no change
   * of service box — it is simply replayed. It reuses the `point` phase so the existing
   * "press to continue" and demo auto-continue paths replay it without a special case.
   */
  letCalled: boolean
  callLet: () => void
  
  // Current game score
  score: GameScore
  
  // Match state
  matchState: MatchState
  
  // Scoring actions
  awardPointTo: (winner: PlayerSide, reason: PointReason) => void
  resetGame: () => void         // Reset current game score
  resetMatch: () => void        // Reset entire match
  startNextGame: () => void     // Start next game after game over
  
  // Game ball / Match ball status
  gameBallHolder: PlayerSide | null
  matchBallHolder: PlayerSide | null
  
  // Ball state (for chase targeting)
  ballPosition: THREE.Vector3
  setBallPosition: (pos: THREE.Vector3) => void

  /**
   * Incremented every time the ball is teleported into position for a serve. Anything
   * caching the ball's recent path — the trail, the out-of-bounds latch — has to discard
   * that history on the jump, and a phase change is not a reliable signal because a serve
   * can be re-set without leaving the serving phase.
   */
  serveResetCount: number
  registerServeReset: () => void

  /**
   * `performance.now()` when the ball last struck the tin, or null. Court reads this each
   * frame to flash the tin orange briefly; scoring still lives in the collision handlers.
   */
  tinHitAt: number | null
  signalTinHit: () => void

  /**
   * Last racquet strike flash. Ball paints mesh/trail from these in `useFrame` (no React
   * subscription). Intensity is charge power 0–1; side picks cyan vs hot-orange accent.
   */
  ballHitAt: number | null
  ballHitIntensity: number
  ballHitSide: BallHitSide | null
  signalBallHit: (side: BallHitSide, intensity: number) => void
  
  // Shot type tracking
  currentShotType: ShotType | null    // Detected shot type during charge
  setCurrentShotType: (type: ShotType | null) => void
  lastShotType: ShotType | null       // Last executed shot (for display)
  setLastShotType: (type: ShotType | null) => void
  lastShotTime: number | null         // When last shot was executed
  
  // Serving player (who serves next point)
  servingPlayer: PlayerSide
  
  // Service box (left/right) - alternates when server wins point
  serviceBox: ServiceBox
  
  // Demo mode - AI vs AI playing behind title screen
  demoMode: boolean
  setDemoMode: (mode: boolean) => void

  // Strike-to-wall tracking (NOT UP rule)
  /** The first surface touched since the last strike, or null before any contact. */
  firstWallHitSinceStrike: string | null
  /** Whether the ball has reached the front wall since the last strike. */
  frontWallHitSinceStrike: boolean
  /** Floor bounces since the last strike, which is what the double-bounce rule counts. */
  floorBouncesSinceStrike: number
  resetStrikeWallTracking: () => void
  recordFirstWallHit: (wallName: string) => boolean
  recordFloorBounce: () => number
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'idle',
  setPhase: (phase) => set({ phase }),
  
  // Rally state
  rallyState: 'inactive',
  setRallyState: (rallyState) => set({ rallyState }),
  
  // Turn tracking
  currentStriker: 'player',
  lastHitter: null,
  setCurrentStriker: (currentStriker) => set({ currentStriker }),
  setLastHitter: (lastHitter) => set({ lastHitter }),

  canHit: true,
  setCanHit: (canHit) => {
    if (get().canHit === canHit) return
    set({ canHit })
  },
  
  // Point result tracking
  pointReason: null,
  pointWinner: null,
  setPointResult: (winner, reason) => set({ pointWinner: winner, pointReason: reason }),
  clearPointResult: () => set({ ...RALLY_RESULT_RESET, ...STRIKE_TRACKING_RESET }),

  letCalled: false,
  callLet: () => {
    endRally()
    set({
      phase: 'point',
      rallyState: 'ended',
      letCalled: true,
      pointWinner: null,
      pointReason: null,
      canHit: false,
      ...STRIKE_TRACKING_RESET
    })
  },
  
  // Scores
  score: { player: 0, opponent: 0 },
  matchState: createMatchState(DEFAULT_MATCH_CONFIG),
  
  // Game ball / Match ball
  gameBallHolder: null,
  matchBallHolder: null,
  
  // Award point with full scoring logic
  awardPointTo: (winner, reason) => {
    endRally()
    const state = get()
    const { newScore, gameWinner } = awardPoint(state.score, winner, state.matchState.config)
    
    // Update game ball / match ball status
    const newGameBall = isGameBall(newScore, state.matchState.config)
    const newMatchBall = isMatchBall(newScore, state.matchState)
    
    if (gameWinner) {
      // Game was won - check for match win
      const { newMatchState, matchWinner } = awardGame(state.matchState, gameWinner)
      
      if (matchWinner) {
        // Match over!
        set({
          score: newScore,
          matchState: newMatchState,
          pointWinner: winner,
          pointReason: reason,
          letCalled: false,
          phase: 'matchOver',
          rallyState: 'ended',
          canHit: false,
          gameBallHolder: null,
          matchBallHolder: null,
          ...STRIKE_TRACKING_RESET
        })
      } else {
        // Game over, but match continues
        set({
          score: newScore,
          matchState: newMatchState,
          pointWinner: winner,
          pointReason: reason,
          letCalled: false,
          phase: 'gameOver',
          rallyState: 'ended',
          canHit: false,
          gameBallHolder: null,
          matchBallHolder: null,
          ...STRIKE_TRACKING_RESET
        })
      }
    } else {
      // Point scored, game continues
      const currentServer = state.servingPlayer
      const serverWon = winner === currentServer
      
      // Official WSF rules:
      // - If server wins, they serve again but MUST switch service box
      // - If receiver wins, they become server and may choose either box (we default to right)
      const newServiceBox = serverWon 
        ? (state.serviceBox === 'left' ? 'right' : 'left')  // Alternate box
        : 'right'  // New server starts from right (default choice)
      
        set({
          score: newScore,
          pointWinner: winner,
          pointReason: reason,
          letCalled: false,
          phase: 'point',
          rallyState: 'ended',
          canHit: false,
          servingPlayer: winner,
          serviceBox: newServiceBox,
          gameBallHolder: newGameBall,
          matchBallHolder: newMatchBall,
          ...STRIKE_TRACKING_RESET
        })
    }
  },
  
  // Reset current game (keep match progress)
  resetGame: () => set({
    score: { player: 0, opponent: 0 },
    phase: 'serving',
    rallyState: 'serving',
    currentStriker: 'player',
    lastHitter: null,
    canHit: true,
    gameBallHolder: null,
    matchBallHolder: null,
    serviceBox: 'right',  // Server chooses box at start of game
    ...RALLY_RESULT_RESET,
    ...STRIKE_TRACKING_RESET
  }),
  
  // Reset entire match
  resetMatch: () => {
    // Keep rallyTelemetry max across demo match restarts so a browser capture can
    // accumulate evidence; clear explicitly via `window.__sqRally.reset()`.
    set({
      score: { player: 0, opponent: 0 },
      matchState: createMatchState(DEFAULT_MATCH_CONFIG),
      phase: 'idle',
      rallyState: 'inactive',
      currentStriker: 'player',
      lastHitter: null,
      canHit: true,
      servingPlayer: 'player',
      serviceBox: 'right',  // Start from right box
      gameBallHolder: null,
      matchBallHolder: null,
      ...RALLY_RESULT_RESET,
      ...STRIKE_TRACKING_RESET
    })
  },
  
  // Start next game after game over
  startNextGame: () => {
    const state = get()
    // Official WSF: Loser of last game serves first in next game
    const lastGameWinner = state.score.player > state.score.opponent ? 'player' : 'opponent'
    const nextServer: PlayerSide = lastGameWinner === 'player' ? 'opponent' : 'player'
    
    set({
      score: { player: 0, opponent: 0 },
      phase: 'serving',
      rallyState: 'serving',
      currentStriker: nextServer,
      lastHitter: null,
      canHit: true,
      servingPlayer: nextServer,
      serviceBox: 'right',  // New server chooses box (default right)
      gameBallHolder: null,
      matchBallHolder: null,
      ...RALLY_RESULT_RESET,
      ...STRIKE_TRACKING_RESET
    })
  },
  
  ballPosition: new THREE.Vector3(0, 1, 0),
  // Mutate in place — calling `set` every physics frame re-rendered every subscriber
  // (Scene, GameCamera) at 60 Hz for no React benefit; readers use the same Vector3.
  setBallPosition: (pos) => {
    get().ballPosition.copy(pos)
  },

  serveResetCount: 0,
  registerServeReset: () => set(state => ({ serveResetCount: state.serveResetCount + 1 })),

  tinHitAt: null,
  signalTinHit: () => set({ tinHitAt: performance.now() }),

  ballHitAt: null,
  ballHitIntensity: 0,
  ballHitSide: null,
  signalBallHit: (side, intensity) => set({
    ballHitAt: performance.now(),
    ballHitIntensity: Math.max(0, Math.min(1, intensity)),
    ballHitSide: side,
  }),
  
  // Shot type tracking
  currentShotType: null,
  // No-op when unchanged — charge preview runs every frame and must not notify subscribers.
  setCurrentShotType: (type) => {
    if (get().currentShotType === type) return
    set({ currentShotType: type })
  },
  lastShotType: null,
  setLastShotType: (type) => set({ lastShotType: type, lastShotTime: Date.now() }),
  lastShotTime: null,
  
  servingPlayer: 'player',
  
  // Service box tracking (official WSF rules)
  serviceBox: 'right',
  
  // Demo mode - starts true so AI plays behind title screen
  demoMode: true,
  setDemoMode: (demoMode) => set({ demoMode }),

  // Strike-to-wall tracking (NOT UP rule)
  ...STRIKE_TRACKING_RESET,
  // The ball free-falls onto the floor while the server charges; those bounces predate the
  // strike and must not count toward the double-bounce rule.
  resetStrikeWallTracking: () => set({ ...STRIKE_TRACKING_RESET }),
  /**
   * WSF Rule 6.2.2: a return is good if the ball hits the front wall, either directly or
   * after hitting any other wall(s), without having first bounced on the floor. A side or
   * back wall before the front wall is legal — that is a boast. Any floor contact before
   * the front wall is down (NOT UP), including after a legal wall.
   *
   * @returns true when this contact makes the return down
   */
  recordFirstWallHit: (wallName) => {
    const state = get()
    if (state.firstWallHitSinceStrike === null) {
      set({ firstWallHitSinceStrike: wallName })
    }
    if (wallName === 'frontWall') {
      set({ frontWallHitSinceStrike: true })
      return false
    }
    return wallName === 'floor' && !state.frontWallHitSinceStrike
  },

  /** @returns the number of floor bounces since the last strike, including this one */
  recordFloorBounce: () => {
    const next = get().floorBouncesSinceStrike + 1
    set({ floorBouncesSinceStrike: next })
    return next
  }
}))

export type { MovementPhase, ChargePhase, RallyState, GamePhase, ServiceBox }
