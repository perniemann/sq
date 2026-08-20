/**
 * One-shot arcade teaching cues. Keeps the two-button loop discoverable without a
 * permanent control legend. Pure — HUD owns dismiss progress and rendering.
 */

export type TeachTipId = 'serve' | 'return' | 'chaseAfterDouble'

export type TeachProgress = {
  serveDone: boolean
  returnDone: boolean
  /** First player-lost DOUBLE BOUNCE chase nudge shown (or dismissed). */
  doubleBounceDone: boolean
}

export const INITIAL_TEACH_PROGRESS: TeachProgress = {
  serveDone: false,
  returnDone: false,
  doubleBounceDone: false,
}

export type TeachContext = {
  demoMode: boolean
  phase: 'idle' | 'serving' | 'rally' | 'point' | 'gameOver' | 'matchOver'
  servingPlayer: 'player' | 'opponent'
  currentStriker: 'player' | 'opponent'
  progress: TeachProgress
  touch: boolean
  /** Point-end reason when `phase === 'point'` (e.g. doubleBounce). */
  pointReason?: string | null
  pointWinner?: 'player' | 'opponent' | null
}

/**
 * Short monospace labels. Keyboard/mouse: primary Space / Shift (skeptic-revised);
 * mouse bindings are secondary so keyboard players are not taught LMB/RMB first.
 * Touch keeps half-screen zone wording.
 */
export function teachTipLabel(id: TeachTipId, touch: boolean): string {
  if (id === 'serve') {
    return touch
      ? 'HOLD RIGHT · L/R AIM · FRONT=ABOVE BACK=BELOW · RELEASE'
      : 'HOLD SPACE · L/R AIM · FRONT=ABOVE · BACK=BELOW · RELEASE'
  }
  if (id === 'chaseAfterDouble') {
    return touch
      ? 'HOLD LEFT TO CHASE · RIGHT TO HIT'
      : 'SHIFT TO CHASE · SPACE TO HIT'
  }
  return touch
    ? 'HOLD LEFT TO CHASE · RIGHT TO HIT'
    : 'SHIFT TO CHASE · SPACE TO HIT'
}

/**
 * At most one tip. First serve (player), first return (player to strike), then
 * first player-lost DOUBLE BOUNCE chase nudge on the point screen.
 * Hidden in demo; point tip shares the continue secondary line in WorldHud.
 */
export function activeTeachTip(ctx: TeachContext): TeachTipId | null {
  if (ctx.demoMode) return null

  if (
    ctx.phase === 'point'
    && ctx.pointReason === 'doubleBounce'
    && ctx.pointWinner === 'opponent'
    && !ctx.progress.doubleBounceDone
  ) {
    return 'chaseAfterDouble'
  }

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

/**
 * Dismiss policy for the first player-lost DOUBLE BOUNCE chase tip.
 * Only after the tip was shown — not on every point leave or every chase.
 */
export function shouldDismissDoubleBounceTip(
  tipWasShown: boolean,
  event: 'leavePoint' | 'chaseOnPoint',
): boolean {
  if (!tipWasShown) return false
  return event === 'leavePoint' || event === 'chaseOnPoint'
}

export function advanceTeachProgress(
  progress: TeachProgress,
  event: 'served' | 'returned' | 'chased' | 'doubleBounceSeen',
): TeachProgress {
  if (event === 'served') {
    if (progress.serveDone) return progress
    return { ...progress, serveDone: true }
  }
  if (event === 'returned' || event === 'chased') {
    if (progress.returnDone) return progress
    return { ...progress, returnDone: true }
  }
  if (event === 'doubleBounceSeen') {
    if (progress.doubleBounceDone) return progress
    return { ...progress, doubleBounceDone: true }
  }
  return progress
}
