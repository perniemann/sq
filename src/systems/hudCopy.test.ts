import { describe, it, expect } from 'vitest'
import {
  hudA11yText,
  hudPrompts,
  phaseAdvancePrompt,
  resolveHudVisibility,
} from './hudCopy'

const prompts = hudPrompts(false)

describe('hudCopy', () => {
  it('names touch vs keyboard start prompts', () => {
    expect(hudPrompts(false).start).toMatch(/SPACE/)
    expect(hudPrompts(true).start).toMatch(/TAP/)
  })

  it('maps phase advance prompts', () => {
    expect(phaseAdvancePrompt('idle', prompts)).toBe(prompts.start)
    expect(phaseAdvancePrompt('point', prompts)).toBe(prompts.continue)
    expect(phaseAdvancePrompt('gameOver', prompts)).toBe(prompts.nextGame)
    expect(phaseAdvancePrompt('matchOver', prompts)).toBe(prompts.replay)
    expect(phaseAdvancePrompt('rally', prompts)).toBeNull()
  })

  it('shows LET on point with letCalled', () => {
    const v = resolveHudVisibility({
      phase: 'point',
      demoMode: false,
      letCalled: true,
      pointReasonText: 'TIN',
      pointWinner: 'player',
      lastShotName: null,
      showLastShot: false,
      teachLabel: null,
      gameBallHolder: null,
      matchBallHolder: null,
      gamesWonPlayer: 0,
      gamesWonOpponent: 0,
    }, prompts)
    expect(v.callout).toBe('LET')
    expect(v.advancePrompt).toBe(prompts.continue)
  })

  it('hides advance/teach/callouts in demo and shows lockup', () => {
    const v = resolveHudVisibility({
      phase: 'idle',
      demoMode: true,
      letCalled: false,
      pointReasonText: null,
      pointWinner: null,
      lastShotName: null,
      showLastShot: false,
      teachLabel: 'HOLD SPACE',
      gameBallHolder: null,
      matchBallHolder: null,
      gamesWonPlayer: 0,
      gamesWonOpponent: 0,
    }, prompts)
    expect(v.demoLockup).toBe(true)
    expect(v.advancePrompt).toBeNull()
    expect(v.teachLabel).toBeNull()
    expect(v.callout).toBeNull()
  })

  it('resolves victory from games won and shows replay cue', () => {
    const v = resolveHudVisibility({
      phase: 'matchOver',
      demoMode: false,
      letCalled: false,
      pointReasonText: null,
      pointWinner: null,
      lastShotName: null,
      showLastShot: false,
      teachLabel: null,
      gameBallHolder: null,
      matchBallHolder: null,
      gamesWonPlayer: 2,
      gamesWonOpponent: 0,
    }, prompts)
    expect(v.matchResult).toBe('VICTORY')
    expect(v.advancePrompt).toBe(prompts.replay)
  })

  it('resolves defeat and match point label', () => {
    const v = resolveHudVisibility({
      phase: 'matchOver',
      demoMode: false,
      letCalled: false,
      pointReasonText: null,
      pointWinner: null,
      lastShotName: null,
      showLastShot: false,
      teachLabel: null,
      gameBallHolder: null,
      matchBallHolder: 'opponent',
      gamesWonPlayer: 0,
      gamesWonOpponent: 2,
    }, prompts)
    expect(v.matchResult).toBe('DEFEAT')
    expect(v.gamePointLabel).toBe('MATCH POINT')
    expect(v.advancePrompt).toBe(prompts.replay)
  })

  it('shows GAME POINT when only game ball is held', () => {
    const v = resolveHudVisibility({
      phase: 'rally',
      demoMode: false,
      letCalled: false,
      pointReasonText: null,
      pointWinner: null,
      lastShotName: null,
      showLastShot: false,
      teachLabel: null,
      gameBallHolder: 'player',
      matchBallHolder: null,
      gamesWonPlayer: 0,
      gamesWonOpponent: 0,
    }, prompts)
    expect(v.gamePointLabel).toBe('GAME POINT')
  })

  it('echoes last shot only while showLastShot is true', () => {
    const base = {
      phase: 'rally',
      demoMode: false,
      letCalled: false,
      pointReasonText: null,
      pointWinner: null,
      lastShotName: 'Drive',
      teachLabel: null,
      gameBallHolder: null,
      matchBallHolder: null,
      gamesWonPlayer: 0,
      gamesWonOpponent: 0,
    }
    expect(resolveHudVisibility({ ...base, showLastShot: true }, prompts).callout).toBe('DRIVE')
    expect(resolveHudVisibility({ ...base, showLastShot: false }, prompts).callout).toBeNull()
  })

  it('suppresses teach when an advance prompt is showing', () => {
    const v = resolveHudVisibility({
      phase: 'idle',
      demoMode: false,
      letCalled: false,
      pointReasonText: null,
      pointWinner: null,
      lastShotName: null,
      showLastShot: false,
      teachLabel: 'HOLD SPACE TO SERVE',
      gameBallHolder: null,
      matchBallHolder: null,
      gamesWonPlayer: 0,
      gamesWonOpponent: 0,
    }, prompts)
    expect(v.advancePrompt).toBe(prompts.start)
    expect(v.teachLabel).toBeNull()
  })

  it('keeps continue cue alongside a point callout (a11y + visibility)', () => {
    const v = resolveHudVisibility({
      phase: 'point',
      demoMode: false,
      letCalled: false,
      pointReasonText: 'DOUBLE BOUNCE',
      pointWinner: 'player',
      lastShotName: null,
      showLastShot: false,
      teachLabel: null,
      gameBallHolder: null,
      matchBallHolder: null,
      gamesWonPlayer: 0,
      gamesWonOpponent: 0,
    }, prompts)
    expect(v.callout).toBe('DOUBLE BOUNCE')
    expect(v.advancePrompt).toBe(prompts.continue)
    const a11y = hudA11yText(v, {
      demoMode: false,
      score: { player: 1, opponent: 0 },
      pointWinner: 'player',
      phase: 'point',
      prompts,
    })
    expect(a11y).toMatch(/DOUBLE BOUNCE/i)
    expect(a11y).toMatch(/CONTINUE/i)
  })

  it('keeps first player-lost DOUBLE BOUNCE chase tip alongside continue', () => {
    const tip = 'SHIFT TO CHASE · SPACE TO HIT'
    const v = resolveHudVisibility({
      phase: 'point',
      demoMode: false,
      letCalled: false,
      pointReasonText: 'DOUBLE BOUNCE',
      pointWinner: 'opponent',
      lastShotName: null,
      showLastShot: false,
      teachLabel: tip,
      gameBallHolder: null,
      matchBallHolder: null,
      gamesWonPlayer: 0,
      gamesWonOpponent: 0,
    }, prompts)
    expect(v.callout).toBe('DOUBLE BOUNCE')
    expect(v.advancePrompt).toBe(prompts.continue)
    expect(v.teachLabel).toBe(tip)
  })
})
