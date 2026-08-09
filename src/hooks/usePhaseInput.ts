import { useRef, useCallback, useEffect } from 'react'
import { useInputStore, registerButtonAActions, chargeDurationToPower } from './useInput'
import { getTotalSwingDuration } from '../systems/swingAnimation'
import type { GamePhase, RallyState } from '../stores/gameStore'
import { DEBUG } from '../config'

/** AI/PlayerAI charge phase (excludes followThrough) */
type SwingChargePhase = 'none' | 'racquetPrep' | 'bodyCoil' | 'powerLoad'

interface UsePhaseInputParams {
  phase: GamePhase
  demoMode: boolean
  canHit: boolean
  currentStriker: 'player' | 'opponent'
  resetBallForServe: () => void
  startNextRally: () => void
  startNextGame: () => void
  resetMatch: () => void
  setPhase: (p: GamePhase) => void
  setRallyState: (s: RallyState) => void
  setCurrentStriker: (s: 'player' | 'opponent') => void
  setDemoMode: (v: boolean) => void
  setAIIsSwinging: (v: boolean) => void
  setAISwingStartTime: (v: number | null) => void
  setAISwingPower: (v: number) => void
  setAIChargePhase: (p: SwingChargePhase) => void
  setPlayerAIIsSwinging: (v: boolean) => void
  setPlayerAISwingStartTime: (v: number | null) => void
  setPlayerAISwingPower: (v: number) => void
  setPlayerAIChargePhase: (p: SwingChargePhase) => void
  aiChargeStartTime: React.MutableRefObject<number | null>
  aiSwingTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  playerAIChargeStartTime: React.MutableRefObject<number | null>
  playerAISwingTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
}

export function usePhaseInput(params: UsePhaseInputParams): void {
  const {
    phase,
    demoMode,
    canHit,
    currentStriker,
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
  } = params

  const phaseTransitionedRef = useRef(false)
  const swingEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startSwing = useInputStore(state => state.startSwing)
  const endSwing = useInputStore(state => state.endSwing)
  const pressButtonA = useInputStore(state => state.pressButtonA)
  const releaseButtonA = useInputStore(state => state.releaseButtonA)

  const handlePhaseTransition = useCallback(() => {
    if (demoMode) {
      setDemoMode(false)
      setPlayerAIIsSwinging(false)
      setPlayerAISwingStartTime(null)
      setPlayerAISwingPower(0)
      setPlayerAIChargePhase('none')
      playerAIChargeStartTime.current = null
      if (playerAISwingTimeoutRef.current) {
        clearTimeout(playerAISwingTimeoutRef.current)
        playerAISwingTimeoutRef.current = null
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
      resetMatch()
      setTimeout(() => {
        resetBallForServe()
        setPhase('serving')
        setRallyState('serving')
        setCurrentStriker('player')
        if (DEBUG) console.log('Exited demo mode - started real game')
      }, 50)
      return true
    }

    if (phase === 'idle') {
      setPhase('serving')
      setRallyState('serving')
      setCurrentStriker('player')
      if (DEBUG) console.log('Started serving - press SPACE to hit')
      return true
    }

    if (phase === 'point') {
      startNextRally()
      return true
    }

    if (phase === 'gameOver') {
      startNextGame()
      resetBallForServe()
      return true
    }

    if (phase === 'matchOver') {
      resetMatch()
      setTimeout(() => {
        resetBallForServe()
        setPhase('serving')
        setRallyState('serving')
      }, 50)
      return true
    }

    return false
  }, [
    demoMode,
    phase,
    setDemoMode,
    setPhase,
    setRallyState,
    setCurrentStriker,
    setAIIsSwinging,
    setAISwingStartTime,
    setAISwingPower,
    setAIChargePhase,
    setPlayerAIIsSwinging,
    setPlayerAISwingStartTime,
    setPlayerAISwingPower,
    setPlayerAIChargePhase,
    startNextRally,
    startNextGame,
    resetMatch,
    resetBallForServe,
    aiChargeStartTime,
    aiSwingTimeoutRef,
    playerAIChargeStartTime,
    playerAISwingTimeoutRef,
  ])

  const handleSwingStart = useCallback(
    (power: number) => {
      if ((phase === 'serving' || phase === 'rally') && currentStriker === 'player') {
        if (!canHit) {
          if (DEBUG) console.log('Cannot hit yet - wait for bounce')
          return
        }
        startSwing(power)
        if (DEBUG) console.log(`Swing started with power: ${(power * 100).toFixed(0)}%`)
        if (swingEndTimeoutRef.current) clearTimeout(swingEndTimeoutRef.current)
        swingEndTimeoutRef.current = setTimeout(() => endSwing(), getTotalSwingDuration())
      }
    },
    [phase, currentStriker, canHit, startSwing, endSwing]
  )

  useEffect(() => {
    const swingEnd = swingEndTimeoutRef
    return () => {
      if (swingEnd.current) clearTimeout(swingEnd.current)
    }
  }, [])

  // Register the button-A behaviour so keyboard and touch share one code path.
  useEffect(() => {
    registerButtonAActions({
      press: () => {
        pressButtonA()
        phaseTransitionedRef.current = handlePhaseTransition()
      },
      release: () => {
        const duration = releaseButtonA()
        // A press that advanced the phase must not also fire a shot.
        if (phaseTransitionedRef.current) {
          phaseTransitionedRef.current = false
          return
        }
        handleSwingStart(chargeDurationToPower(duration))
      },
    })
    return () => registerButtonAActions(null)
  }, [pressButtonA, releaseButtonA, handlePhaseTransition, handleSwingStart])
}
