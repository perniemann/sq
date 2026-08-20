import { describe, it, expect } from 'vitest'
import { COURT, COURT_MODEL_SCALE, FRONT_WALL_Z } from './court'
import {
  TIN_FACE_Z_AUTHORED,
  TIN_HUD_HEIGHT,
  TIN_HUD_Y,
  WORLD_HUD,
  WORLD_HUD_Z,
  WORLD_HUD_Z_CLEARANCE,
  scoreOpponentX,
  scorePlayerX,
  tinPlateWidth,
  turnMarkOpponentX,
  turnMarkPlayerX,
  worldHudClearsTinFace,
} from './worldHudLayout'

describe('worldHudLayout', () => {
  it('matches measured tin.glb height (0–0.48 m)', () => {
    expect(TIN_HUD_HEIGHT).toBe(COURT.tinHeight)
    expect(TIN_HUD_HEIGHT).toBe(0.48)
    expect(TIN_HUD_Y).toBeCloseTo(0.24, 5)
  })

  it('places the HUD court-side of the scaled tin face with clearance', () => {
    const tinFace = TIN_FACE_Z_AUTHORED * COURT_MODEL_SCALE[2]
    expect(WORLD_HUD_Z).toBeCloseTo(tinFace + WORLD_HUD_Z_CLEARANCE, 5)
    expect(WORLD_HUD_Z).toBeGreaterThan(tinFace)
    expect(WORLD_HUD_Z).toBeGreaterThan(FRONT_WALL_Z)
    expect(worldHudClearsTinFace()).toBe(true)
    // Keep flush-to-tin: do not float mid-court.
    expect(WORLD_HUD_Z - tinFace).toBeLessThanOrEqual(0.15)
  })

  it('keeps the start lockup above the tin on the wall face', () => {
    expect(WORLD_HUD.startY).toBeGreaterThan(TIN_HUD_HEIGHT)
    expect(WORLD_HUD.startY).toBeLessThan(COURT.serviceLineHeight + 1.2)
  })

  it('orders tin columns logo → gameplay → score', () => {
    expect(WORLD_HUD.logoX).toBeLessThan(WORLD_HUD.gameplayX)
    expect(WORLD_HUD.gameplayX).toBeLessThan(WORLD_HUD.scoreX)
  })

  it('keeps score marks ordered and fonts inside the tin band', () => {
    expect(turnMarkPlayerX()).toBeLessThan(scorePlayerX())
    expect(scorePlayerX()).toBeLessThan(scoreOpponentX())
    expect(scoreOpponentX()).toBeLessThan(turnMarkOpponentX())
    expect(WORLD_HUD.fontScore + WORLD_HUD.pipBelow).toBeLessThan(TIN_HUD_HEIGHT)
    // Bold score + outline must still fit the tin band (skeptic lock).
    expect(WORLD_HUD.fontScore + WORLD_HUD.outlineScore * 2).toBeLessThan(TIN_HUD_HEIGHT)
  })

  it('sizes the dark plate within the court width', () => {
    expect(tinPlateWidth()).toBeLessThan(COURT.width)
    expect(tinPlateWidth()).toBeGreaterThan(COURT.width * 0.9)
  })
})
