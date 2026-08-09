import { describe, it, expect } from 'vitest'
import {
  INITIAL_TEACH_PROGRESS,
  activeTeachTip,
  advanceTeachProgress,
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
      progress: { serveDone: true, returnDone: false },
    }))).toBe('return')
    expect(activeTeachTip(ctx({
      phase: 'rally',
      currentStriker: 'opponent',
      progress: { serveDone: true, returnDone: false },
    }))).toBe('return')
    expect(activeTeachTip(ctx({
      phase: 'rally',
      progress: { serveDone: false, returnDone: false },
    }))).toBeNull()
  })

  it('yields to point / idle advance prompts', () => {
    expect(activeTeachTip(ctx({ phase: 'point' }))).toBeNull()
    expect(activeTeachTip(ctx({ phase: 'idle' }))).toBeNull()
  })

  it('stays silent after both tips are done', () => {
    expect(activeTeachTip(ctx({
      phase: 'rally',
      progress: { serveDone: true, returnDone: true },
    }))).toBeNull()
  })
})

describe('teachTipLabel', () => {
  it('names mouse on desktop and zones on touch', () => {
    expect(teachTipLabel('serve', false)).toContain('LMB')
    expect(teachTipLabel('serve', true)).toContain('RIGHT')
    expect(teachTipLabel('return', false)).toContain('RMB')
    expect(teachTipLabel('return', true)).toContain('LEFT')
  })
})

describe('advanceTeachProgress', () => {
  it('marks serve and return independently', () => {
    const afterServe = advanceTeachProgress(INITIAL_TEACH_PROGRESS, 'served')
    expect(afterServe.serveDone).toBe(true)
    expect(afterServe.returnDone).toBe(false)
    const afterChase = advanceTeachProgress(afterServe, 'chased')
    expect(afterChase.returnDone).toBe(true)
  })
})
