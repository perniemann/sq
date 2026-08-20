/**
 * Shared HUD copy + visibility matrix for diegetic WorldHud and DOM aria-live.
 * Pure — no React. Touch wording is injected by the caller.
 */

export type HudPromptSet = {
  start: string
  startA11y: string
  continue: string
  nextGame: string
  replay: string
}

export function hudPrompts(touch: boolean): HudPromptSet {
  return {
    start: touch ? 'TAP RIGHT SIDE' : 'CLICK OR SPACE',
    startA11y: touch ? 'Tap right side to start' : 'Click or press space to start',
    continue: touch ? 'TAP TO CONTINUE' : 'CLICK OR SPACE TO CONTINUE',
    nextGame: touch ? 'TAP FOR NEXT GAME' : 'CLICK OR SPACE FOR NEXT GAME',
    replay: touch ? 'TAP TO REPLAY' : 'CLICK OR SPACE TO REPLAY',
  }
}

export function phaseAdvancePrompt(
  phase: string,
  prompts: HudPromptSet,
): string | null {
  if (phase === 'idle') return prompts.start
  if (phase === 'point') return prompts.continue
  if (phase === 'gameOver') return prompts.nextGame
  if (phase === 'matchOver') return prompts.replay
  return null
}

export type HudVisibilityInput = {
  phase: string
  demoMode: boolean
  letCalled: boolean
  pointReasonText: string | null
  pointWinner: 'player' | 'opponent' | null
  lastShotName: string | null
  showLastShot: boolean
  teachLabel: string | null
  gameBallHolder: 'player' | 'opponent' | null
  matchBallHolder: 'player' | 'opponent' | null
  gamesWonPlayer: number
  gamesWonOpponent: number
}

export type HudVisibility = {
  scoreboard: boolean
  turnMarks: boolean
  gamePointLabel: 'GAME POINT' | 'MATCH POINT' | null
  advancePrompt: string | null
  teachLabel: string | null
  matchResult: 'VICTORY' | 'DEFEAT' | null
  /** Mid callout: LET, point reason, or last shot name. */
  callout: string | null
  calloutTone: 'ink' | 'player' | 'opponent' | null
  demoLockup: boolean
}

export function resolveHudVisibility(
  input: HudVisibilityInput,
  prompts: HudPromptSet,
): HudVisibility {
  const {
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
    gamesWonPlayer,
    gamesWonOpponent,
  } = input

  const advance = demoMode ? null : phaseAdvancePrompt(phase, prompts)
  const turnMarks = phase === 'rally' || phase === 'serving'

  let callout: string | null = null
  let calloutTone: HudVisibility['calloutTone'] = null
  if (!demoMode) {
    if (phase === 'point' && letCalled) {
      callout = 'LET'
      calloutTone = 'ink'
    } else if (phase === 'point' && !letCalled && pointReasonText) {
      callout = pointReasonText
      calloutTone = pointWinner === 'player' ? 'player' : 'opponent'
    } else if (showLastShot && lastShotName && phase === 'rally') {
      callout = lastShotName.toUpperCase()
      calloutTone = 'opponent'
    }
  }

  let matchResult: HudVisibility['matchResult'] = null
  if (!demoMode && phase === 'matchOver') {
    matchResult = gamesWonPlayer > gamesWonOpponent ? 'VICTORY' : 'DEFEAT'
  }

  let gamePointLabel: HudVisibility['gamePointLabel'] = null
  if (matchBallHolder) gamePointLabel = 'MATCH POINT'
  else if (gameBallHolder) gamePointLabel = 'GAME POINT'

  // Point DOUBLE BOUNCE chase tip may ride alongside the continue cue (secondary line).
  const showTeachWithAdvance =
    Boolean(teachLabel)
    && phase === 'point'
    && pointReasonText === 'DOUBLE BOUNCE'
    && pointWinner === 'opponent'

  return {
    scoreboard: true,
    turnMarks,
    gamePointLabel,
    advancePrompt: advance,
    teachLabel: !demoMode && (!advance || showTeachWithAdvance) ? teachLabel : null,
    matchResult,
    callout,
    calloutTone,
    demoLockup: demoMode,
  }
}

export type HudA11yInput = {
  demoMode: boolean
  score: { player: number; opponent: number }
  pointWinner: 'player' | 'opponent' | null
  phase: string
  prompts: HudPromptSet
}

/** Screen-reader wording from the same visibility matrix as WorldHud. */
export function hudA11yText(vis: HudVisibility, input: HudA11yInput): string {
  if (input.demoMode) {
    return `Demo mode. ${input.prompts.startA11y}.`
  }

  const parts: string[] = [`${input.score.player} to ${input.score.opponent}.`]

  if (vis.gamePointLabel === 'MATCH POINT') parts.push('Match point.')
  else if (vis.gamePointLabel === 'GAME POINT') parts.push('Game point.')

  if (vis.callout === 'LET') {
    parts.push('Let. Rally replayed.')
  } else if (vis.callout && input.phase === 'point' && input.pointWinner) {
    const who = input.pointWinner === 'player' ? 'you' : 'opponent'
    parts.push(`Point to ${who}: ${vis.callout}.`)
  } else if (vis.callout) {
    parts.push(`${vis.callout}.`)
  }

  if (vis.matchResult) parts.push(`${vis.matchResult}.`)
  if (vis.teachLabel) parts.push(`${vis.teachLabel}.`)
  if (vis.advancePrompt) parts.push(`${vis.advancePrompt}.`)

  return parts.join(' ')
}
