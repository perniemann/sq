import { useEffect, useState, type ReactElement } from 'react'
import { useGameStore } from '../stores/gameStore'
import { getShotConfig } from '../systems/shotTypes'
import { getPointReasonDisplay } from '../systems/scoring'
import { hudA11yText, hudPrompts, resolveHudVisibility } from '../systems/hudCopy'
import { useTeachLabel } from '../hooks/useTeachProgress'

/** Touch devices have no Space key, so live-region copy names the right gesture. */
const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const PROMPTS = hudPrompts(IS_TOUCH)

/**
 * Screen-reader live region only — all visible HUD chrome lives in `WorldHud`.
 * Teach progress is driven by `useTeachProgressDriver` inside WorldHud.
 */
export default function HUD(): ReactElement {
  const score = useGameStore(state => state.score)
  const matchState = useGameStore(state => state.matchState)
  const phase = useGameStore(state => state.phase)
  const lastShotType = useGameStore(state => state.lastShotType)
  const lastShotTime = useGameStore(state => state.lastShotTime)
  const pointReason = useGameStore(state => state.pointReason)
  const pointWinner = useGameStore(state => state.pointWinner)
  const gameBallHolder = useGameStore(state => state.gameBallHolder)
  const matchBallHolder = useGameStore(state => state.matchBallHolder)
  const demoMode = useGameStore(state => state.demoMode)
  const letCalled = useGameStore(state => state.letCalled)

  const teachLabel = useTeachLabel(IS_TOUCH)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!lastShotTime) return
    const remaining = 1500 - (Date.now() - lastShotTime)
    if (remaining <= 0) return
    const id = window.setTimeout(() => setTick(t => t + 1), remaining + 16)
    return () => window.clearTimeout(id)
  }, [lastShotTime])

  const showLastShot = Boolean(lastShotTime && Date.now() - lastShotTime < 1500)
  const lastShotName = lastShotType ? getShotConfig(lastShotType).displayName : null
  const pointReasonText = pointReason ? getPointReasonDisplay(pointReason) : null
  const { gamesWon } = matchState

  const vis = resolveHudVisibility({
    phase,
    demoMode,
    letCalled,
    pointReasonText,
    pointWinner,
    lastShotName,
    showLastShot,
    teachLabel,
    gameBallHolder,
    matchBallHolder,
    gamesWonPlayer: gamesWon.player,
    gamesWonOpponent: gamesWon.opponent,
  }, PROMPTS)

  const live = hudA11yText(vis, {
    demoMode,
    score,
    pointWinner,
    phase,
    prompts: PROMPTS,
  })

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
        clipPath: 'inset(50%)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {live}
    </div>
  )
}
