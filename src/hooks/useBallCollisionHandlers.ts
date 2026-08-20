import { useCallback } from 'react'
import { COURT } from '../systems/court'
import { useGameStore } from '../stores/gameStore'
import { determinePointWinner, type PointReason } from '../systems/scoring'
import { judgeServeFrontWall } from '../systems/serveRules'
import { wallRestoresCanHit } from '../systems/returnability'
import { recordReceiveSample } from '../systems/receiveTelemetry'
import { useInputStore } from './useInput'
import type { ServeRefs } from './useServeReset'
import { DEBUG } from '../config'

interface UseBallCollisionHandlersParams {
  serveRefs: ServeRefs
  handlePointScored: (winner: 'player' | 'opponent', reason: PointReason) => void
}

export function useBallCollisionHandlers(
  params: UseBallCollisionHandlersParams
): {
  handleWallHit: (wallName: string, ballPos: { x: number; y: number; z: number }) => void
  handleFloorBounce: (bounceCount: number, ballPos: { x: number; y: number; z: number }) => void
  handleTinHit: () => void
  handleOutOfBounds: () => void
} {
  const { serveRefs, handlePointScored } = params

  const handleWallHit = useCallback(
    (wallName: string, ballPos: { x: number; y: number; z: number }) => {
      const store = useGameStore.getState()
      const livePhase = store.phase
      const liveLastHitter = store.lastHitter
      const liveServer = store.servingPlayer
      const isFirstContactSinceStrike = store.firstWallHitSinceStrike === null
      // Down means the floor before the front wall. A side or back wall first is a boast.
      const isDown = store.recordFirstWallHit(wallName)
      const isInPlay = livePhase === 'rally' || livePhase === 'serving'

      if (isDown && isInPlay && liveLastHitter !== null) {
        serveRefs.serveInFlight.current = false
        const currentStriker = liveLastHitter === 'player' ? 'opponent' : 'player'
        const winner = determinePointWinner(liveLastHitter, currentStriker, 'noFrontWall')
        handlePointScored(winner, 'noFrontWall')
        return
      }

      // WSF Rule 5.7.3: a serve must be struck *directly* to the front wall. Side or back
      // wall first is legal in a rally (a boast) but faults a serve, and Rule 5.8 gives
      // the rally to the receiver. Key off `serveInFlight` — GamePhase is already `rally`
      // by the time the ball reaches the wall.
      if (
        serveRefs.serveInFlight.current &&
        isFirstContactSinceStrike &&
        wallName !== 'frontWall' &&
        liveLastHitter !== null
      ) {
        if (DEBUG) console.log(`SERVE FAULT: first contact was ${wallName}, not the front wall`)
        serveRefs.serveInFlight.current = false
        const receiver = liveServer === 'player' ? 'opponent' : 'player'
        handlePointScored(determinePointWinner(liveServer, receiver, 'serveFault'), 'serveFault')
        return
      }

      if (DEBUG) console.log(
        'Ball hit:',
        wallName,
        'Phase:',
        livePhase,
        'ServeInFlight:',
        serveRefs.serveInFlight.current,
        'LastHitter:',
        liveLastHitter,
        'Height:',
        ballPos.y.toFixed(2)
      )

      if (wallName === 'frontWall') {
        serveRefs.ballHitFrontWall.current = true

        if (serveRefs.serveInFlight.current) {
          const judgement = judgeServeFrontWall(
            ballPos.y,
            COURT.tinHeight,
            COURT.serviceLineHeight
          )
          if (judgement === 'valid') {
            serveRefs.serveHitAboveServiceLine.current = true
            if (DEBUG) console.log(
              'Valid serve height:',
              ballPos.y.toFixed(2),
              '>= service line',
              COURT.serviceLineHeight
            )
          } else if (judgement === 'serveFault') {
            serveRefs.serveHitAboveServiceLine.current = false
            serveRefs.serveInFlight.current = false
            if (DEBUG) console.log('SERVE FAULT: Ball hit below service line at y:', ballPos.y.toFixed(2))
            const receiver = liveServer === 'player' ? 'opponent' : 'player'
            handlePointScored(determinePointWinner(liveServer, receiver, 'serveFault'), 'serveFault')
            return
          }
          // `tin` is awarded by handleTinHit; leave serveInFlight until that path clears it.
        }
      }

      // Next strike only after the prior return completes on the front wall (WSF 6.2).
      if (wallRestoresCanHit(wallName)) {
        useGameStore.getState().setCanHit(true)
      }
    },
    [handlePointScored, serveRefs]
  )

  const handleFloorBounce = useCallback(
    (bounceCount: number, ballPos: { x: number; y: number; z: number }) => {
      const store = useGameStore.getState()

      if (
        serveRefs.serveInFlight.current &&
        bounceCount === 1 &&
        serveRefs.serveHitAboveServiceLine.current
      ) {
        const isInBackHalf = ballPos.z > COURT.shortLineZ
        const serveBox = serveRefs.currentServeBox.current

        let isCorrectQuarter = false
        if (serveBox === 'right') {
          isCorrectQuarter = isInBackHalf && ballPos.x < 0
        } else {
          isCorrectQuarter = isInBackHalf && ballPos.x > 0
        }

        serveRefs.serveInFlight.current = false

        if (!isCorrectQuarter) {
          if (DEBUG) console.log(
            `SERVE FAULT: Ball landed at (${ballPos.x.toFixed(2)}, ${ballPos.z.toFixed(2)}) - must be behind short line (z > ${COURT.shortLineZ.toFixed(2)}) in ${serveBox === 'right' ? 'left' : 'right'} quarter`
          )
          const server = store.servingPlayer
          const receiver = server === 'player' ? 'opponent' : 'player'
          handlePointScored(determinePointWinner(server, receiver, 'serveFault'), 'serveFault')
          return
        }
        if (DEBUG) console.log(
          `Valid serve landing: (${ballPos.x.toFixed(2)}, ${ballPos.z.toFixed(2)}) in correct quarter for ${serveBox} box`
        )
      }

      const livePhase = store.phase
      const liveLastHitter = store.lastHitter
      if (
        (livePhase === 'rally' || livePhase === 'serving') &&
        bounceCount >= 2 &&
        liveLastHitter !== null
      ) {
        if (!serveRefs.doubleBounceTriggeredRef.current) {
          serveRefs.doubleBounceTriggeredRef.current = true
          const currentStriker = liveLastHitter === 'player' ? 'opponent' : 'player'
          const winner = determinePointWinner(liveLastHitter, currentStriker, 'doubleBounce')
          // Phase 0: player was due to return (opponent last hit) and failed.
          if (liveLastHitter === 'opponent' && !store.demoMode) {
            recordReceiveSample({
              outcome: 'missed',
              chased: useInputStore.getState().buttonB.pressed,
              now: Date.now(),
            })
          }
          if (DEBUG) console.log(
            `DOUBLE BOUNCE triggered at bounce #${bounceCount} - awarding point to ${winner}`
          )
          handlePointScored(winner, 'doubleBounce')
        } else if (DEBUG) console.log(`DOUBLE BOUNCE ignored (already triggered this rally)`)
      }
    },
    [handlePointScored, serveRefs]
  )

  const handleTinHit = useCallback(() => {
    const store = useGameStore.getState()
    store.signalTinHit()
    serveRefs.serveInFlight.current = false
    if ((store.phase === 'rally' || store.phase === 'serving') && store.lastHitter !== null) {
      const currentStriker = store.lastHitter === 'player' ? 'opponent' : 'player'
      handlePointScored(
        determinePointWinner(store.lastHitter, currentStriker, 'tin'),
        'tin'
      )
    }
  }, [handlePointScored, serveRefs])

  const handleOutOfBounds = useCallback(() => {
    const store = useGameStore.getState()
    serveRefs.serveInFlight.current = false
    if ((store.phase === 'rally' || store.phase === 'serving') && store.lastHitter !== null) {
      const currentStriker = store.lastHitter === 'player' ? 'opponent' : 'player'
      handlePointScored(
        determinePointWinner(store.lastHitter, currentStriker, 'out'),
        'out'
      )
    }
  }, [handlePointScored, serveRefs])

  return {
    handleWallHit,
    handleFloorBounce,
    handleTinHit,
    handleOutOfBounds,
  }
}
