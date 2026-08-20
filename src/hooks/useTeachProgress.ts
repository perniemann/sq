import { useEffect, useRef } from 'react'
import { useGameStore } from '../stores/gameStore'
import { useInputStore } from '../hooks/useInput'
import { useTeachStore } from '../stores/teachStore'
import {
  activeTeachTip,
  shouldDismissDoubleBounceTip,
  teachTipLabel,
} from '../systems/teachPrompts'

/**
 * Drives the shared teach store from game/input events.
 * Mount once (from WorldHud). HUD only reads the resulting label.
 */
export function useTeachProgressDriver(touch: boolean): string | null {
  const phase = useGameStore(s => s.phase)
  const demoMode = useGameStore(s => s.demoMode)
  const servingPlayer = useGameStore(s => s.servingPlayer)
  const currentStriker = useGameStore(s => s.currentStriker)
  const pointReason = useGameStore(s => s.pointReason)
  const pointWinner = useGameStore(s => s.pointWinner)
  const chasePressed = useInputStore(s => s.buttonB.pressed)
  const swingActive = useInputStore(s => s.swing.active)

  const progress = useTeachStore(s => s.progress)
  const reset = useTeachStore(s => s.reset)
  const advance = useTeachStore(s => s.advance)

  const prevPhaseRef = useRef(phase)
  const wasDemoRef = useRef(demoMode)
  /** Latched while the chase-after-double tip is (or was) shown this point. */
  const chaseTipShownRef = useRef(false)

  useEffect(() => {
    if (wasDemoRef.current && !demoMode) {
      reset()
      chaseTipShownRef.current = false
    }
    wasDemoRef.current = demoMode
  }, [demoMode, reset])

  const teachId = activeTeachTip({
    demoMode,
    phase,
    servingPlayer,
    currentStriker,
    progress,
    touch,
    pointReason,
    pointWinner,
  })
  if (teachId === 'chaseAfterDouble') chaseTipShownRef.current = true

  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = phase
    if (prev === 'serving' && phase === 'rally') advance('served')
    if (
      prev === 'point'
      && phase !== 'point'
      && shouldDismissDoubleBounceTip(chaseTipShownRef.current, 'leavePoint')
    ) {
      advance('doubleBounceSeen')
      chaseTipShownRef.current = false
    }
  }, [phase, advance])

  useEffect(() => {
    if (!chasePressed) return
    advance('chased')
    if (
      phase === 'point'
      && shouldDismissDoubleBounceTip(chaseTipShownRef.current, 'chaseOnPoint')
    ) {
      advance('doubleBounceSeen')
      chaseTipShownRef.current = false
    }
  }, [chasePressed, advance, phase])

  useEffect(() => {
    if (swingActive && phase === 'rally' && currentStriker === 'player') {
      advance('returned')
    }
  }, [swingActive, phase, currentStriker, advance])

  return teachId ? teachTipLabel(teachId, touch) : null
}

/** Read-only teach label for aria-live (driver must be mounted elsewhere). */
export function useTeachLabel(touch: boolean): string | null {
  const phase = useGameStore(s => s.phase)
  const demoMode = useGameStore(s => s.demoMode)
  const servingPlayer = useGameStore(s => s.servingPlayer)
  const currentStriker = useGameStore(s => s.currentStriker)
  const pointReason = useGameStore(s => s.pointReason)
  const pointWinner = useGameStore(s => s.pointWinner)
  const progress = useTeachStore(s => s.progress)

  const teachId = activeTeachTip({
    demoMode,
    phase,
    servingPlayer,
    currentStriker,
    progress,
    touch,
    pointReason,
    pointWinner,
  })

  return teachId ? teachTipLabel(teachId, touch) : null
}
