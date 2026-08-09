/**
 * One-shot arcade teaching cues. Keeps the two-button loop discoverable without a
 * permanent control legend. Pure — HUD owns dismiss progress and rendering.
 */

export type TeachTipId = 'serve' | 'return'

export type TeachProgress = {
  serveDone: boolean
  returnDone: boolean
}

export const INITIAL_TEACH_PROGRESS: TeachProgress = {
  serveDone: false,
  returnDone: false,
}

export type TeachContext = {
  demoMode: boolean
  phase: 'idle' | 'serving' | 'rally' | 'point' | 'gameOver' | 'matchOver'
  servingPlayer: 'player' | 'opponent'
  currentStriker: 'player' | 'opponent'
  progress: TeachProgress
  touch: boolean
}

/** Short monospace labels — mouse/keyboard vs touch wording. */
export function teachTipLabel(id: TeachTipId, touch: boolean): string {
  if (id === 'serve') {
    return touch ? 'HOLD RIGHT · DRAG AIM · RELEASE' : 'HOLD LMB · MOVE AIM · RELEASE'
  }
  return touch ? 'HOLD LEFT TO CHASE · RIGHT TO HIT' : 'RMB TO CHASE · LMB TO HIT'
}

/**
 * At most one tip. First serve (player) then first return (player to strike).
 * Hidden in demo and whenever phase advance prompts own the scoreboard slot.
 */
export function activeTeachTip(ctx: TeachContext): TeachTipId | null {
  if (ctx.demoMode) return null
  if (ctx.phase === 'idle' || ctx.phase === 'point' || ctx.phase === 'gameOver' || ctx.phase === 'matchOver') {
    return null
  }

  if (
    ctx.phase === 'serving'
    && ctx.servingPlayer === 'player'
    && !ctx.progress.serveDone
  ) {
    return 'serve'
  }

  // Whole first rally — visible while the ball comes back, not only on your strike frame.
  if (ctx.phase === 'rally' && ctx.progress.serveDone && !ctx.progress.returnDone) {
    return 'return'
  }

  return null
}

export function advanceTeachProgress(
  progress: TeachProgress,
  event: 'served' | 'returned' | 'chased',
): TeachProgress {
  if (event === 'served') {
    if (progress.serveDone) return progress
    return { ...progress, serveDone: true }
  }
  if (event === 'returned' || event === 'chased') {
    if (progress.returnDone) return progress
    return { ...progress, returnDone: true }
  }
  return progress
}
