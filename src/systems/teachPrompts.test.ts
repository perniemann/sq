import { describe, it, expect } from 'vitest'
import {
  INITIAL_TEACH_PROGRESS,
  activeTeachTip,
  advanceTeachProgress,
  shouldDismissDoubleBounceTip,
  teachTipLabel,
  type TeachContext,
} from './teachPrompts'

function ctx(overrides: Partial<TeachContext> = {}): TeachContext {
  return {
    demoMode: false,
    phase: 'serving',
    servingPlayer: 'player',
    currentStriker: 'player',
    progress: { ...INITIAL_TEACH_PROGRESS },
    touch: false,
    pointReason: null,
    pointWinner: null,
    ...overrides,
  }
}

describe('activeTeachTip', () => {
  it('stays quiet in demo mode', () => {
    expect(activeTeachTip(ctx({ demoMode: true }))).toBeNull()
  })

  it('teaches the first player serve', () => {
    expect(activeTeachTip(ctx())).toBe('serve')
    expect(activeTeachTip(ctx({ servingPlayer: 'opponent' }))).toBeNull()
  })

  it('teaches chase/hit across the first rally', () => {
    expect(activeTeachTip(ctx({
      phase: 'rally',
      progress: { serveDone: true, returnDone: false, doubleBounceDone: false },
    }))).toBe('return')
    expect(activeTeachTip(ctx({
      phase: 'rally',
      currentStriker: 'opponent',
      progress: { serveDone: true, returnDone: false, doubleBounceDone: false },
    }))).toBe('return')
    expect(activeTeachTip(ctx({
      phase: 'rally',
      progress: { serveDone: false, returnDone: false, doubleBounceDone: false },
    }))).toBeNull()
  })

  it('yields to point / idle advance prompts except first double-bounce chase', () => {
    expect(activeTeachTip(ctx({ phase: 'point' }))).toBeNull()
    expect(activeTeachTip(ctx({ phase: 'idle' }))).toBeNull()
  })

  it('nudges chase after the first player-lost DOUBLE BOUNCE', () => {
    expect(activeTeachTip(ctx({
      phase: 'point',
      pointReason: 'doubleBounce',
      pointWinner: 'opponent',
    }))).toBe('chaseAfterDouble')
    expect(activeTeachTip(ctx({
      phase: 'point',
      pointReason: 'doubleBounce',
      pointWinner: 'player',
    }))).toBeNull()
    expect(activeTeachTip(ctx({
      phase: 'point',
      pointReason: 'doubleBounce',
      pointWinner: 'opponent',
      progress: { serveDone: true, returnDone: true, doubleBounceDone: true },
    }))).toBeNull()
  })

  it('stays silent after serve and return tips are done', () => {
    expect(activeTeachTip(ctx({
      phase: 'rally',
      progress: { serveDone: true, returnDone: true, doubleBounceDone: false },
    }))).toBeNull()
  })
})

describe('teachTipLabel', () => {
  it('leads with Space/Shift on desktop and zones on touch', () => {
    expect(teachTipLabel('serve', false)).toContain('SPACE')
    expect(teachTipLabel('serve', false)).toContain('FRONT=ABOVE')
    expect(teachTipLabel('serve', false)).toContain('BACK=BELOW')
    expect(teachTipLabel('serve', false)).not.toContain('LMB')
    expect(teachTipLabel('serve', true)).toContain('RIGHT')
    expect(teachTipLabel('serve', true)).toContain('FRONT=ABOVE')
    expect(teachTipLabel('return', false)).toContain('SHIFT')
    expect(teachTipLabel('return', false)).toContain('SPACE')
    expect(teachTipLabel('return', false)).not.toContain('RMB')
    expect(teachTipLabel('return', true)).toContain('LEFT')
    expect(teachTipLabel('chaseAfterDouble', false)).toContain('SHIFT')
    expect(teachTipLabel('chaseAfterDouble', true)).toContain('LEFT')
  })
})

describe('advanceTeachProgress', () => {
  it('marks serve, return, and double-bounce independently', () => {
    const afterServe = advanceTeachProgress(INITIAL_TEACH_PROGRESS, 'served')
    expect(afterServe.serveDone).toBe(true)
    expect(afterServe.returnDone).toBe(false)
    const afterChase = advanceTeachProgress(afterServe, 'chased')
    expect(afterChase.returnDone).toBe(true)
    const afterBounce = advanceTeachProgress(afterChase, 'doubleBounceSeen')
    expect(afterBounce.doubleBounceDone).toBe(true)
  })
})

describe('shouldDismissDoubleBounceTip', () => {
  it('ignores leave/chase until the tip was shown', () => {
    expect(shouldDismissDoubleBounceTip(false, 'leavePoint')).toBe(false)
    expect(shouldDismissDoubleBounceTip(false, 'chaseOnPoint')).toBe(false)
  })

  it('dismisses after the tip was shown on leave or chase-on-point', () => {
    expect(shouldDismissDoubleBounceTip(true, 'leavePoint')).toBe(true)
    expect(shouldDismissDoubleBounceTip(true, 'chaseOnPoint')).toBe(true)
  })
})
