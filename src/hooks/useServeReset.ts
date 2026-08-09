import { useRef, useCallback } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useGameStore } from '../stores/gameStore'
import { createAIState } from '../systems/ai'
import { DEBUG } from '../config'
import { SERVICE_BOX_POSITIONS, RECEIVER_POSITIONS } from '../systems/courtPositions'
import { serveBallWorldPosition } from '../systems/serveRules'

interface UseServeResetParams {
  ballRef: React.RefObject<RapierRigidBody | null>
  playerPosRef: React.MutableRefObject<[number, number, number]>
  playerPositionVec: React.MutableRefObject<THREE.Vector3>
  aiState: React.MutableRefObject<import('../systems/ai').AIState>
  /** Demo mode drives the player from its own athlete state, which has to be re-seeded
   *  at the serve position too or the player snaps back to last rally's spot. */
  playerAIState: React.MutableRefObject<import('../systems/ai').AIState>
  /** Live AI pose — written here on serve reset; Scene updates it each rally frame. */
  aiPosRef: React.MutableRefObject<[number, number, number]>
  setCanHit: (v: boolean) => void
  lastAIHitTime: React.MutableRefObject<number>
}

export interface ServeRefs {
  ballHitFrontWall: React.MutableRefObject<boolean>
  serveHitAboveServiceLine: React.MutableRefObject<boolean>
  currentServeBox: React.MutableRefObject<'left' | 'right'>
  doubleBounceTriggeredRef: React.MutableRefObject<boolean>
  /**
   * True from the serve strike until the serve is fully judged (front-wall height,
   * first bounce quarter, or a fault). GamePhase flips to `rally` on the strike, so
   * serve rules must not key off `phase === 'serving'`.
   */
  serveInFlight: React.MutableRefObject<boolean>
}

export function useServeReset(params: UseServeResetParams): {
  resetBallForServe: () => void
  startNextRally: () => void
  serveRefs: ServeRefs
} {
  const {
    ballRef,
    playerPosRef,
    playerPositionVec,
    aiState,
    playerAIState,
    aiPosRef,
    setCanHit,
    lastAIHitTime,
  } = params

  const ballHitFrontWall = useRef(false)
  const serveHitAboveServiceLine = useRef(false)
  const currentServeBox = useRef<'left' | 'right'>('right')
  const doubleBounceTriggeredRef = useRef(false)
  const serveInFlight = useRef(false)

  const clearPointResult = useGameStore(state => state.clearPointResult)
  const setPhase = useGameStore(state => state.setPhase)
  const setRallyState = useGameStore(state => state.setRallyState)
  const setCurrentStriker = useGameStore(state => state.setCurrentStriker)
  const setLastHitter = useGameStore(state => state.setLastHitter)
  const resetBallForServe = useCallback(() => {
    const ball = ballRef.current
    if (!ball) return

    const currentBox = useGameStore.getState().serviceBox
    const server = useGameStore.getState().servingPlayer
    const boxPos = SERVICE_BOX_POSITIONS[currentBox as keyof typeof SERVICE_BOX_POSITIONS]
    const receiverPos = RECEIVER_POSITIONS[currentBox as keyof typeof RECEIVER_POSITIONS]

    const ballServePos = serveBallWorldPosition(currentBox)

    ball.setTranslation(ballServePos, true)
    ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
    ball.setAngvel({ x: 0, y: 0, z: 0 }, true)

    if (server === 'player') {
      const playerServePos: [number, number, number] = [boxPos.x, 0.01, boxPos.z]
      playerPosRef.current = playerServePos
      playerPositionVec.current.set(playerServePos[0], playerServePos[1], playerServePos[2])
      playerAIState.current = createAIState(playerServePos)

      const aiReceiverPos: [number, number, number] = [receiverPos.x, 0.01, receiverPos.z]
      aiState.current = createAIState(aiReceiverPos)
      aiPosRef.current = aiReceiverPos

      if (DEBUG) console.log(
        `PLAYER serves from ${currentBox.toUpperCase()} box - Player:`,
        playerServePos,
        'AI receiver:',
        aiReceiverPos
      )
    } else {
      const aiServePos: [number, number, number] = [boxPos.x, 0.01, boxPos.z]
      aiState.current = createAIState(aiServePos)
      aiPosRef.current = aiServePos

      const playerReceiverPos: [number, number, number] = [receiverPos.x, 0.01, receiverPos.z]
      playerPosRef.current = playerReceiverPos
      playerPositionVec.current.set(
        playerReceiverPos[0],
        playerReceiverPos[1],
        playerReceiverPos[2]
      )
      playerAIState.current = createAIState(playerReceiverPos)

      if (DEBUG) console.log(
        `OPPONENT serves from ${currentBox.toUpperCase()} box - AI:`,
        aiServePos,
        'Player receiver:',
        playerReceiverPos
      )
    }

    ballHitFrontWall.current = false
    serveHitAboveServiceLine.current = false
    currentServeBox.current = currentBox
    doubleBounceTriggeredRef.current = false
    serveInFlight.current = false
    setCanHit(true)
    lastAIHitTime.current = Date.now()
    useGameStore.getState().registerServeReset()

    if (DEBUG) console.log('Rally reset - double bounce guard cleared')
  }, [
    ballRef,
    playerPosRef,
    playerPositionVec,
    aiState,
    playerAIState,
    aiPosRef,
    setCanHit,
    lastAIHitTime,
  ])

  const startNextRally = useCallback(() => {
    clearPointResult()
    resetBallForServe()
    setPhase('serving')
    setRallyState('serving')
    // Read live, matching resetBallForServe above: it positions the bodies from the store's
    // current server, so taking the striker from a render closure could set the two from
    // different servers on the frame the serve changes hands.
    setCurrentStriker(useGameStore.getState().servingPlayer)
    setLastHitter(null)
  }, [
    clearPointResult,
    resetBallForServe,
    setPhase,
    setRallyState,
    setCurrentStriker,
    setLastHitter,
  ])

  return {
    resetBallForServe,
    startNextRally,
    serveRefs: {
      ballHitFrontWall,
      serveHitAboveServiceLine,
      currentServeBox,
      doubleBounceTriggeredRef,
      serveInFlight,
    },
  }
}
