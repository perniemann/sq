import { describe, it, expect } from 'vitest'
import { COURT } from './court'
import {
  SERVE_BALL_HEIGHT,
  SERVE_HORIZONTAL,
  SERVE_LOFT_MIN,
  isServeBallHeld,
  judgeServeFrontWall,
  serveBallWorldPosition,
  serveFrontWallHeight,
  serveFrontWallInCourtX,
  serveFrontWallX,
  serveHorizontalAngle,
  serveLoft,
  serveSpeed,
} from './serveRules'

describe('judgeServeFrontWall', () => {
  const tin = COURT.tinHeight
  const service = COURT.serviceLineHeight

  it('is tin below the tin', () => {
    expect(judgeServeFrontWall(0.2, tin, service)).toBe('tin')
    expect(judgeServeFrontWall(tin - 0.001, tin, service)).toBe('tin')
  })

  it('is a serve fault between the tin and the service line', () => {
    expect(judgeServeFrontWall(tin, tin, service)).toBe('serveFault')
    expect(judgeServeFrontWall(1.0, tin, service)).toBe('serveFault')
    expect(judgeServeFrontWall(service - 0.001, tin, service)).toBe('serveFault')
  })

  it('is valid at or above the service line', () => {
    expect(judgeServeFrontWall(service, tin, service)).toBe('valid')
    expect(judgeServeFrontWall(3.0, tin, service)).toBe('valid')
  })
})

describe('isServeBallHeld', () => {
  it('holds only during the serving phase', () => {
    expect(isServeBallHeld('serving')).toBe(true)
    expect(isServeBallHeld('rally')).toBe(false)
    expect(isServeBallHeld('idle')).toBe(false)
    expect(SERVE_BALL_HEIGHT).toBe(1)
  })
})

describe('serveLoft / serveSpeed / serveHorizontalAngle', () => {
  it('raises loft with power from a clearance-safe minimum', () => {
    expect(serveLoft(0)).toBe(SERVE_LOFT_MIN)
    expect(serveLoft(1)).toBeGreaterThan(serveLoft(0))
    expect(serveLoft(0)).toBeGreaterThan(0.3)
  })

  it('scales speed with power', () => {
    expect(serveSpeed(1)).toBeGreaterThan(serveSpeed(0))
  })

  it('aims toward the opposite side from each box', () => {
    expect(serveHorizontalAngle('right')).toBe(-SERVE_HORIZONTAL)
    expect(serveHorizontalAngle('left')).toBe(SERVE_HORIZONTAL)
  })

  it('keeps lateral aim modest so full-charge serves do not jam the far corner', () => {
    expect(SERVE_HORIZONTAL).toBeLessThanOrEqual(0.18)
  })
})

describe('serveBallWorldPosition', () => {
  it('places the ball in the chosen box at hold height', () => {
    const right = serveBallWorldPosition('right')
    const left = serveBallWorldPosition('left')
    expect(right.y).toBe(SERVE_BALL_HEIGHT)
    expect(left.y).toBe(SERVE_BALL_HEIGHT)
    expect(right.x).toBeGreaterThan(0)
    expect(left.x).toBeLessThan(0)
  })
})

describe('serve front-wall landing', () => {
  it('clears the service line and stays inside the court for both boxes', () => {
    for (const box of ['right', 'left'] as const) {
      const pose = serveBallWorldPosition(box)
      for (const power of [0, 0.5, 1]) {
        const loft = serveLoft(power)
        const speed = serveSpeed(power)
        const horizontalAngle = serveHorizontalAngle(box)
        const wallY = serveFrontWallHeight({
          ballX: pose.x,
          ballY: pose.y,
          ballZ: pose.z,
          horizontalAngle,
          loft,
          speed,
        })
        const wallX = serveFrontWallX({
          ballX: pose.x,
          ballY: pose.y,
          ballZ: pose.z,
          horizontalAngle,
          loft,
          speed,
        })
        expect(
          wallY,
          `${box} power=${power} wallY=${wallY.toFixed(2)}`,
        ).toBeGreaterThan(COURT.serviceLineHeight + 0.15)
        expect(wallY).toBeLessThan(COURT.height)
        expect(
          serveFrontWallInCourtX(wallX),
          `${box} power=${power} wallX=${wallX.toFixed(2)}`,
        ).toBe(true)
        // Hit the front wall on the server's half, crossing toward centre — not already
        // near the opposite side wall (that path becomes a back-corner pinball).
        if (box === 'right') {
          expect(wallX).toBeGreaterThan(0.8)
          expect(wallX).toBeLessThan(pose.x)
        } else {
          expect(wallX).toBeLessThan(-0.8)
          expect(wallX).toBeGreaterThan(pose.x)
        }
      }
    }
  })

  it('is judged valid at the computed wall height', () => {
    const pose = serveBallWorldPosition('right')
    const wallY = serveFrontWallHeight({
      ballY: pose.y,
      ballZ: pose.z,
      horizontalAngle: serveHorizontalAngle('right'),
      loft: serveLoft(0),
      speed: serveSpeed(0),
    })
    expect(judgeServeFrontWall(wallY, COURT.tinHeight, COURT.serviceLineHeight)).toBe('valid')
  })
})
