import { useEffect } from 'react'
import { useGameStore } from '../stores/gameStore'
import type { GamePhase, RallyState } from '../stores/gameStore'
import { DEBUG } from '../config'

interface UseDemoModeEffectsParams {
  resetBallForServe: () => void
  startNextRally: () => void
  startNextGame: () => void
  resetMatch: () => void
  setPhase: (p: GamePhase) => void
  setRallyState: (s: RallyState) => void
  setCurrentStriker: (s: 'player' | 'opponent') => void
}

export function useDemoModeEffects(params: UseDemoModeEffectsParams): void {
  const {
    resetBallForServe,
    startNextRally,
    startNextGame,
    resetMatch,
    setPhase,
    setRallyState,
    setCurrentStriker,
  } = params

  const demoMode = useGameStore(state => state.demoMode)
  const phase = useGameStore(state => state.phase)
  const servingPlayer = useGameStore(state => state.servingPlayer)

  useEffect(() => {
    if (demoMode && phase === 'idle') {
      const startDelay = setTimeout(() => {
        resetBallForServe()
        setPhase('serving')
        setRallyState('serving')
        setCurrentStriker(servingPlayer)
        if (DEBUG) console.log('Demo mode: Auto-starting match')
      }, 500)
      return () => clearTimeout(startDelay)
    }
  }, [demoMode, phase, resetBallForServe, setPhase, setRallyState, setCurrentStriker, servingPlayer])

  useEffect(() => {
    if (demoMode && phase === 'matchOver') {
      const restartDelay = setTimeout(() => {
        resetMatch()
        if (DEBUG) console.log('Demo mode: Restarting after match end')
      }, 3000)
      return () => clearTimeout(restartDelay)
    }
  }, [demoMode, phase, resetMatch])

  useEffect(() => {
    if (demoMode && (phase === 'point' || phase === 'gameOver')) {
      const continueDelay = setTimeout(() => {
        if (phase === 'point') {
          startNextRally()
        } else if (phase === 'gameOver') {
          startNextGame()
          resetBallForServe()
        }
        if (DEBUG) console.log('Demo mode: Auto-continuing')
      }, 1500)
      return () => clearTimeout(continueDelay)
    }
  }, [demoMode, phase, startNextRally, startNextGame, resetBallForServe])
}
