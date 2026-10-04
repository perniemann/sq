import { describe, it, expect } from 'vitest'
import { COURT } from './court'
import {
  SERVE_BALL_HEIGHT,
  SERVE_HORIZONTAL,
  SERVE_HORIZONTAL_AIM,
  SERVE_LOFT_HIGH,
  SERVE_LOFT_LOW,
  AI_SERVE_VS_HUMAN_SPEED_SCALE,
  isBallFrozenBetweenPoints,
  isAthleteHeldBetweenPoints,
  humanServeHoldPosition,
  aiServeHoldPosition,
  isServeBallHeld,
  judgeServeFrontWall,
  serveBallWorldPosition,
  serveFrontWallHeight,
  serveFrontWallInCourtX,
  serveFrontWallX,
  serveHorizontalAngle,
  serveHorizontalFromAim,
  serveLoftFromStick,
  serveLoftForOpponent,
  serveSpeed,
  serveSpeedForOpponent,
  serveStrikeDirection,
} from './serveRules'
import { firstVerticalWallAlongRay } from './aimRotation'

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
    expect(isServeBallHeld('point')).toBe(false)
    expect(SERVE_BALL_HEIGHT).toBe(1)
  })
})

describe('isBallFrozenBetweenPoints', () => {
  it('freezes the ball while waiting to continue after a rally', () => {
    expect(isBallFrozenBetweenPoints('point')).toBe(true)
    expect(isBallFrozenBetweenPoints('gameOver')).toBe(true)
    expect(isBallFrozenBetweenPoints('matchOver')).toBe(true)
    expect(isBallFrozenBetweenPoints('serving')).toBe(false)
    expect(isBallFrozenBetweenPoints('rally')).toBe(false)
  })
})

describe('athlete hold after a won point', () => {
  it('mirrors the ball freeze window for both athletes', () => {
    expect(isAthleteHeldBetweenPoints('point')).toBe(true)
    expect(isAthleteHeldBetweenPoints('gameOver')).toBe(true)
    expect(isAthleteHeldBetweenPoints('matchOver')).toBe(true)
    expect(isAthleteHeldBetweenPoints('idle')).toBe(false)
    expect(isAthleteHeldBetweenPoints('rally')).toBe(false)
    expect(aiServeHoldPosition('point')).toBe(true)
    expect(aiServeHoldPosition('gameOver')).toBe(true)
    expect(aiServeHoldPosition('serving')).toBe(true)
    expect(aiServeHoldPosition('idle')).toBe(true)
    expect(aiServeHoldPosition('rally')).toBe(false)
  })

  it('plants the human server in the box but leaves the receiver free', () => {
    expect(humanServeHoldPosition('idle', 'player', false)).toBe(true)
    expect(humanServeHoldPosition('point', 'player', false)).toBe(true)
    expect(humanServeHoldPosition('gameOver', 'player', false)).toBe(true)
    expect(humanServeHoldPosition('matchOver', 'opponent', false)).toBe(true)
    expect(humanServeHoldPosition('serving', 'player', false)).toBe(true)
    expect(humanServeHoldPosition('serving', 'opponent', false)).toBe(false)
    expect(humanServeHoldPosition('rally', 'player', false)).toBe(false)
    expect(humanServeHoldPosition('serving', 'player', true)).toBe(false)
  })
})

describe('serveLoftFromStick / serveSpeed / serveHorizontalFromAim', () => {
  it('maps loft stick independently of power', () => {
    expect(serveLoftFromStick(0)).toBe(SERVE_LOFT_LOW)
    expect(serveLoftFromStick(1)).toBe(SERVE_LOFT_HIGH)
    expect(serveLoftFromStick(0.5)).toBeCloseTo(
      (SERVE_LOFT_LOW + SERVE_LOFT_HIGH) / 2,
      5,
    )
    expect(serveLoftFromStick(1)).toBeGreaterThan(serveLoftFromStick(0))
  })

  it('scales speed with power for short vs long', () => {
    expect(serveSpeed(1)).toBeGreaterThan(serveSpeed(0))
    expect(serveSpeed(1) - serveSpeed(0)).toBeGreaterThanOrEqual(6)
  })

  it('aims toward the opposite side from each box', () => {
    expect(serveHorizontalAngle('right')).toBe(-SERVE_HORIZONTAL)
    expect(serveHorizontalAngle('left')).toBe(SERVE_HORIZONTAL)
    expect(serveHorizontalFromAim('right', 0)).toBe(-SERVE_HORIZONTAL)
    expect(serveHorizontalFromAim('right', 1)).toBe(
      -(SERVE_HORIZONTAL + SERVE_HORIZONTAL_AIM),
    )
  })

  it('keeps lateral aim bounded so serves do not jam the far corner', () => {
    expect(SERVE_HORIZONTAL + SERVE_HORIZONTAL_AIM).toBeLessThanOrEqual(0.24)
  })
})

describe('serveStrikeDirection', () => {
  it('matches the normalized serve components and stays upward at loft 0', () => {
    for (const box of ['left', 'right'] as const) {
      for (const aim of [0, 0.5, 1]) {
        for (const loft of [0, 0.5, 1]) {
          const dir = serveStrikeDirection(box, aim, loft)
          expect(Math.hypot(dir.x, dir.y, dir.z)).toBeCloseTo(1, 8)
          expect(dir.y).toBeGreaterThan(0)
          const x = serveHorizontalFromAim(box, aim)
          const y = serveLoftFromStick(loft)
          const n = Math.hypot(x, y, 1)
          expect(dir.x).toBeCloseTo(x / n, 8)
          expect(dir.y).toBeCloseTo(y / n, 8)
          expect(dir.z).toBeCloseTo(-1 / n, 8)
        }
      }
    }
  })

  it('raises y with loft and widens x with aim, keeping the box sign', () => {
    const low = serveStrikeDirection('right', 0.5, 0)
    const high = serveStrikeDirection('right', 0.5, 1)
    expect(high.y).toBeGreaterThan(low.y)
    const narrow = serveStrikeDirection('right', 0, 0.5)
    const wide = serveStrikeDirection('right', 1, 0.5)
    expect(Math.abs(wide.x)).toBeGreaterThan(Math.abs(narrow.x))
    expect(wide.x).toBeLessThan(0)
    expect(serveStrikeDirection('left', 1, 0.5).x).toBeGreaterThan(0)
  })

  it('meets the front wall first from the held ball at both aim ends', () => {
    for (const box of ['left', 'right'] as const) {
      for (const aim of [0, 1]) {
        const pose = serveBallWorldPosition(box)
        const dir = serveStrikeDirection(box, aim, 0.5)
        expect(firstVerticalWallAlongRay(pose.x, pose.z, dir.x, dir.z)).toBe('front')
      }
    }
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

describe('serve power×loft matrix', () => {
  const powers = [0, 0.5, 1] as const
  const lofts = [0, 0.5, 1] as const
  const aims = [0, 0.5, 1] as const

  it('clears the service line and stays in court for all corners', () => {
    for (const box of ['right', 'left'] as const) {
      const pose = serveBallWorldPosition(box)
      for (const power of powers) {
        for (const loftStick of lofts) {
          for (const aim of aims) {
            const loft = serveLoftFromStick(loftStick)
            const speed = serveSpeed(power)
            const horizontalAngle = serveHorizontalFromAim(box, aim)
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
            const label = `${box} p=${power} loft=${loftStick} aim=${aim}`
            expect(
              wallY,
              `${label} wallY=${wallY.toFixed(2)}`,
            ).toBeGreaterThan(COURT.serviceLineHeight + 0.1)
            expect(wallY).toBeLessThan(COURT.height)
            expect(
              serveFrontWallInCourtX(wallX),
              `${label} wallX=${wallX.toFixed(2)}`,
            ).toBe(true)
            expect(
              judgeServeFrontWall(wallY, COURT.tinHeight, COURT.serviceLineHeight),
            ).toBe('valid')
            if (box === 'right') {
              expect(wallX).toBeGreaterThan(0.5)
            } else {
              expect(wallX).toBeLessThan(-0.5)
            }
          }
        }
      }
    }
  })

  it('raises front-wall contact when loft stick increases at fixed power', () => {
    const pose = serveBallWorldPosition('right')
    const speed = serveSpeed(0.5)
    const horizontalAngle = serveHorizontalFromAim('right', 0)
    const lowY = serveFrontWallHeight({
      ballY: pose.y,
      ballZ: pose.z,
      horizontalAngle,
      loft: serveLoftFromStick(0),
      speed,
    })
    const highY = serveFrontWallHeight({
      ballY: pose.y,
      ballZ: pose.z,
      horizontalAngle,
      loft: serveLoftFromStick(1),
      speed,
    })
    expect(highY).toBeGreaterThan(lowY + 0.25)
  })

  it('gives hard serves more pace than soft at fixed loft', () => {
    expect(serveSpeed(1)).toBeGreaterThan(serveSpeed(0) * 1.25)
  })

  it('softens opponent serves vs human without changing demo pace', () => {
    const full = serveSpeedForOpponent(0.8, { softVsHuman: false })
    const soft = serveSpeedForOpponent(0.8, { softVsHuman: true })
    expect(soft).toBeCloseTo(full * AI_SERVE_VS_HUMAN_SPEED_SCALE, 5)
    expect(serveLoftForOpponent(0.8, { softVsHuman: true }))
      .toBeGreaterThan(serveLoftForOpponent(0.8, { softVsHuman: false }))
    expect(serveLoftForOpponent(1, { softVsHuman: true })).toBeLessThanOrEqual(SERVE_LOFT_HIGH)
  })
})
