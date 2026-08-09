import { describe, it, expect } from 'vitest'
import {
  COURT,
  FRONT_WALL_Z,
  ATHLETE_SIZE,
  ATHLETE_INSET,
  MODEL_SIZE,
  COURT_MODEL_SCALE,
  ATHLETE_MODEL_SCALE,
  ATHLETE_MODEL_Z_OFFSET,
  BALL_RADIUS,
  BALL_MODEL_SCALE,
  COURT_LINE_COLOR,
  TIN_DANGER_COLOR,
  TIN_HIT_FLASH_MS,
  tinAccentColor,
  getOutLineHeight,
} from './court'

/**
 * The court dimensions are WSF's, not ours, so these read like trivia — but they are the
 * numbers every rule and every collider is built from, and a typo in one would be very hard to
 * see in play.
 */
describe('COURT', () => {
  it('matches the WSF singles court', () => {
    expect(COURT.length).toBe(9.75)
    expect(COURT.width).toBe(6.4)
    expect(COURT.height).toBe(4.57)
    expect(COURT.backWallHeight).toBe(2.13)
    expect(COURT.tinHeight).toBe(0.48)
    expect(COURT.serviceLineHeight).toBe(1.78)
  })

  it('puts the short line 4.26 m from the back wall', () => {
    expect(COURT.length / 2 - COURT.shortLineZ).toBeCloseTo(4.26, 10)
  })

  it('puts the front wall at the negative end', () => {
    expect(FRONT_WALL_Z).toBe(-4.875)
  })
})

describe('getOutLineHeight', () => {
  it('meets the wall heights at each end', () => {
    expect(getOutLineHeight(FRONT_WALL_Z)).toBeCloseTo(COURT.height, 10)
    expect(getOutLineHeight(COURT.length / 2)).toBeCloseTo(COURT.backWallHeight, 10)
  })

  it('falls monotonically from front to back', () => {
    let previous = Infinity
    for (let z = FRONT_WALL_Z; z <= COURT.length / 2; z += 0.25) {
      const height = getOutLineHeight(z)
      expect(height).toBeLessThan(previous)
      previous = height
    }
  })

  it('clamps beyond the walls rather than extrapolating', () => {
    expect(getOutLineHeight(-100)).toBeCloseTo(COURT.height, 10)
    expect(getOutLineHeight(100)).toBeCloseTo(COURT.backWallHeight, 10)
  })
})

/**
 * Court/tin art is wider than WSF and is scaled onto the colliders. Athlete and ball meshes
 * are authored for in-game use (athlete at scale 1; ball scaled only to the physics diameter).
 */
describe('model scales', () => {
  const applied = (measured: number, scale: number) => measured * scale

  it('puts the court model on the court', () => {
    expect(applied(MODEL_SIZE.court.width, COURT_MODEL_SCALE[0])).toBeCloseTo(COURT.width, 10)
    expect(applied(MODEL_SIZE.court.length, COURT_MODEL_SCALE[2])).toBeCloseTo(COURT.length, 10)
  })

  /**
   * The model's out-lines are already at 2.130 and 4.570; only the wall cap above the front
   * line overshoots. Scaling y to make the bounding box match would move the correct line.
   */
  it('leaves the court height alone, cap and all', () => {
    expect(COURT_MODEL_SCALE[1]).toBe(1)
    expect(MODEL_SIZE.court.height).toBeGreaterThan(COURT.height)
  })

  it('uses the athlete mesh at authored scale 1', () => {
    expect(ATHLETE_MODEL_SCALE).toEqual([1, 1, 1])
    expect(ATHLETE_SIZE.width).toBe(MODEL_SIZE.athlete.width)
    expect(ATHLETE_SIZE.height).toBe(MODEL_SIZE.athlete.height)
    expect(ATHLETE_SIZE.depth).toBe(MODEL_SIZE.athlete.depth)
  })

  it('records athlete z extents that match the measured depth', () => {
    expect(MODEL_SIZE.athlete.zMax - MODEL_SIZE.athlete.zMin)
      .toBeCloseTo(MODEL_SIZE.athlete.depth, 10)
  })

  it('recentres the athlete from the recorded z extents without scaling', () => {
    const authoredCentre = (MODEL_SIZE.athlete.zMax + MODEL_SIZE.athlete.zMin) / 2
    expect(ATHLETE_MODEL_Z_OFFSET).toBeCloseTo(-authoredCentre, 10)
  })

  it('scales the ball mesh to the physics diameter', () => {
    const authored = Math.max(
      MODEL_SIZE.ball.width,
      MODEL_SIZE.ball.height,
      MODEL_SIZE.ball.depth
    )
    expect(applied(authored, BALL_MODEL_SCALE)).toBeCloseTo(BALL_RADIUS * 2, 10)
  })

  it('records that the art court is wider than WSF before X scale', () => {
    expect(MODEL_SIZE.court.width).toBeGreaterThan(COURT.width)
  })
})

describe('ATHLETE_INSET', () => {
  it('is half the body width, so reach follows the model size', () => {
    expect(ATHLETE_INSET).toBe(ATHLETE_SIZE.width / 2)
  })

  /**
   * The inset is subtracted from every wall, so two athletes standing in opposite corners must
   * still leave usable court between them — and a front corner has to be reachable at all.
   */
  it('leaves the corners reachable', () => {
    expect(ATHLETE_INSET).toBeLessThan(COURT.width / 4)
    expect(COURT.width - 2 * ATHLETE_INSET).toBeGreaterThan(COURT.width * 0.8)
  })
})

describe('tinAccentColor', () => {
  it('matches court lines when the tin has not been hit', () => {
    expect(tinAccentColor(null, 1000)).toBe(COURT_LINE_COLOR)
  })

  it('flashes orange only inside the hit window', () => {
    const hitAt = 1000
    expect(tinAccentColor(hitAt, hitAt)).toBe(TIN_DANGER_COLOR)
    expect(tinAccentColor(hitAt, hitAt + TIN_HIT_FLASH_MS - 1)).toBe(TIN_DANGER_COLOR)
    expect(tinAccentColor(hitAt, hitAt + TIN_HIT_FLASH_MS)).toBe(COURT_LINE_COLOR)
  })
})
