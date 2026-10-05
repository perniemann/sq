import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { BALL_LINEAR_DAMPING, GRAVITY_Y } from '../config'
import { BALL_RADIUS, COURT, FRONT_WALL_Z } from './court'
import { aimToPlayerRotation } from './aimRotation'
import {
  ballisticPointAt,
  fillPreviewLaunch,
  predictSurfaceContact,
  timeToDampedPlane,
  type BallisticLaunch,
  type SurfaceContact,
} from './predictedContact'
import {
  serveBallWorldPosition,
  serveFrontWallHeight,
  serveHorizontalFromAim,
  serveLoftFromStick,
  serveSpeed,
  serveStrikeDirection,
} from './serveRules'
import {
  analyzeShotContext,
  calculateShot,
  calculateVelocityFromShot,
} from './shotContext'
import { BASE_SHOT_SPEED } from './shotTypes'

function blankContact(): SurfaceContact {
  return { surface: 'front', x: 0, y: 0, z: 0, time: 0, kind: 'play' }
}

function unit(x: number, y: number, z: number): { x: number, y: number, z: number } {
  const len = Math.hypot(x, y, z)
  return { x: x / len, y: y / len, z: z / len }
}

function launch(partial: {
  x: number
  y: number
  z: number
  dx: number
  dy: number
  dz: number
  speed: number
  serve?: boolean
}): BallisticLaunch {
  const direction = unit(partial.dx, partial.dy, partial.dz)
  return {
    origin: { x: partial.x, y: partial.y, z: partial.z },
    direction,
    speed: partial.speed,
    serve: partial.serve ?? false,
  }
}

describe('timeToDampedPlane', () => {
  it('returns the log time to a plane', () => {
    const t = timeToDampedPlane(0, 2, 1)
    expect(t).toBeCloseTo(-Math.log(1 - (BALL_LINEAR_DAMPING * 1) / 2) / BALL_LINEAR_DAMPING, 8)
  })

  it('returns null when the damped asymptote falls short', () => {
    expect(timeToDampedPlane(0, 0.1, 1)).toBeNull()
  })
})

describe('ballisticPointAt', () => {
  it('starts at the origin, ends on the contact, and bows above the chord', () => {
    const pose = serveBallWorldPosition('right')
    const dir = serveStrikeDirection('right', 0.4, 0.7)
    const preview: BallisticLaunch = {
      origin: { x: pose.x, y: pose.y, z: pose.z },
      direction: dir,
      speed: serveSpeed(0.5),
      serve: true,
    }
    const contact = blankContact()
    expect(predictSurfaceContact(preview, contact)).toBe(true)
    expect(contact.surface).toBe('front')

    const point = { x: 0, y: 0, z: 0 }
    ballisticPointAt(preview, 0, point)
    expect(point.x).toBeCloseTo(preview.origin.x, 8)
    expect(point.y).toBeCloseTo(preview.origin.y, 8)
    expect(point.z).toBeCloseTo(preview.origin.z, 8)

    ballisticPointAt(preview, contact.time, point)
    expect(point.x).toBeCloseTo(contact.x, 6)
    expect(point.y).toBeCloseTo(contact.y, 6)
    expect(point.z).toBeCloseTo(contact.z, 6)

    const mid = { x: 0, y: 0, z: 0 }
    ballisticPointAt(preview, contact.time * 0.5, mid)
    const chordY = (preview.origin.y + contact.y) * 0.5
    expect(mid.y).toBeGreaterThan(chordY + 0.05)
  })
})

describe('predictSurfaceContact', () => {
  it('puts a damped serve below the vacuum front-wall height', () => {
    const box = 'right' as const
    const pose = serveBallWorldPosition(box)
    const loft = serveLoftFromStick(0.5)
    const horizontal = serveHorizontalFromAim(box, 0.5)
    const speed = serveSpeed(0.5)
    const preview = launch({
      x: pose.x,
      y: pose.y,
      z: pose.z,
      dx: horizontal,
      dy: loft,
      dz: -1,
      speed,
      serve: true,
    })
    const contact = blankContact()
    expect(predictSurfaceContact(preview, contact)).toBe(true)
    const vacuum = serveFrontWallHeight({
      ballX: pose.x,
      ballY: pose.y,
      ballZ: pose.z,
      horizontalAngle: horizontal,
      loft,
      speed,
    })
    expect(contact.surface).toBe('front')
    expect(contact.y).toBeLessThan(vacuum)
    expect(contact.kind).toBe('play')
    expect(contact.y).toBeGreaterThan(COURT.serviceLineHeight)
  })

  it('marks a soft front-court drop as tin when damping pulls it under the line', () => {
    const preview = launch({
      x: 0,
      y: 0.6,
      z: -1.5,
      dx: 0.08,
      dy: 0.22,
      dz: -1,
      speed: 8.63,
    })
    const contact = blankContact()
    expect(predictSurfaceContact(preview, contact)).toBe(true)
    const dir = unit(0.08, 0.22, -1)
    const time = (FRONT_WALL_Z - (-1.5)) / (dir.z * 8.63)
    const vacuumY = 0.6 + dir.y * 8.63 * time - 0.5 * 9.81 * time * time
    expect(vacuumY).toBeGreaterThan(COURT.tinHeight)
    expect(contact.surface).toBe('front')
    expect(contact.y).toBeLessThan(COURT.tinHeight)
    expect(contact.kind).toBe('fault')
    expect(contact.y).toBeLessThan(vacuumY)
  })

  it('hits the near side wall before the front wall', () => {
    const left = launch({ x: 0, y: 1, z: 0, dx: -0.997, dy: 0.02, dz: -0.08, speed: 14 })
    const right = launch({ x: 0, y: 1, z: 0, dx: 0.997, dy: 0.02, dz: -0.08, speed: 14 })
    const leftHit = blankContact()
    const rightHit = blankContact()
    expect(predictSurfaceContact(left, leftHit)).toBe(true)
    expect(predictSurfaceContact(right, rightHit)).toBe(true)
    expect(leftHit.surface).toBe('left')
    expect(rightHit.surface).toBe('right')
    expect(leftHit.kind).toBe('play')
    expect(rightHit.kind).toBe('play')
  })

  it('hits the floor inside the court when the ball dies', () => {
    const preview = launch({ x: 0, y: 1.2, z: 2.5, dx: 0, dy: 1.2, dz: -6, speed: Math.hypot(1.2, 6) })
    const contact = blankContact()
    expect(predictSurfaceContact(preview, contact)).toBe(true)
    expect(contact.surface).toBe('floor')
    expect(contact.kind).toBe('fault')
    expect(Math.abs(contact.x)).toBeLessThan(COURT.width / 2)
    expect(Math.abs(contact.z)).toBeLessThan(COURT.length / 2)
  })

  it('returns false when the front-wall centre clears the out line', () => {
    const preview = launch({ x: 0, y: 4.2, z: -2, dx: 0, dy: 0.4, dz: -1, speed: 16 })
    expect(predictSurfaceContact(preview, blankContact())).toBe(false)
  })

  it('hits the back wall only while the centre is under the back out line', () => {
    const low = launch({ x: 0, y: 1, z: 2, dx: 0, dy: 0.05, dz: 1, speed: 10 })
    const lowHit = blankContact()
    expect(predictSurfaceContact(low, lowHit)).toBe(true)
    expect(lowHit.surface).toBe('back')
    expect(lowHit.y).toBeLessThan(COURT.backWallHeight)
    expect(lowHit.kind).toBe('play')

    const high = launch({ x: 0, y: 2.4, z: 3, dx: 0, dy: 0.2, dz: 1, speed: 12 })
    const highHit = blankContact()
    const hit = predictSurfaceContact(high, highHit)
    if (hit) expect(highHit.surface).not.toBe('back')
  })

  it('faults a serve that meets the front wall below the service line, and a rally in that band plays', () => {
    const tinServe = launch({
      x: 0, y: 0.4, z: -3, dx: 0, dy: -0.05, dz: -1, speed: 12, serve: true,
    })
    const midServe = launch({
      x: 0, y: 1.1, z: -3.2, dx: 0, dy: 0.02, dz: -1, speed: 14, serve: true,
    })
    const goodServe = launch({
      x: 0, y: 2.2, z: -3, dx: 0, dy: 0.15, dz: -1, speed: 16, serve: true,
    })
    const midRally = launch({
      x: 0, y: 1.1, z: -3.2, dx: 0, dy: 0.02, dz: -1, speed: 14, serve: false,
    })
    const tin = blankContact()
    const mid = blankContact()
    const good = blankContact()
    const rally = blankContact()
    expect(predictSurfaceContact(tinServe, tin)).toBe(true)
    expect(predictSurfaceContact(midServe, mid)).toBe(true)
    expect(predictSurfaceContact(goodServe, good)).toBe(true)
    expect(predictSurfaceContact(midRally, rally)).toBe(true)
    expect(tin.surface).toBe('front')
    expect(tin.y).toBeLessThan(COURT.tinHeight)
    expect(tin.kind).toBe('fault')
    expect(mid.surface).toBe('front')
    expect(mid.y).toBeGreaterThan(COURT.tinHeight)
    expect(mid.y).toBeLessThan(COURT.serviceLineHeight)
    expect(mid.kind).toBe('fault')
    expect(good.surface).toBe('front')
    expect(good.y).toBeGreaterThan(COURT.serviceLineHeight)
    expect(good.kind).toBe('play')
    expect(rally.surface).toBe('front')
    expect(rally.y).toBeGreaterThan(COURT.tinHeight)
    expect(rally.y).toBeLessThan(COURT.serviceLineHeight)
    expect(rally.kind).toBe('play')
  })

  it('faults a serve whose first surface is not the front wall', () => {
    const preview = launch({
      x: 2.6, y: 1.2, z: 0, dx: 1, dy: 0.2, dz: -0.15, speed: 12, serve: true,
    })
    const contact = blankContact()
    expect(predictSurfaceContact(preview, contact)).toBe(true)
    expect(contact.surface).toBe('right')
    expect(contact.kind).toBe('fault')
  })

  it('stays within 8cm of a 1/60 damped stepper on a half-second flight', () => {
    const pose = serveBallWorldPosition('right')
    const dir = serveStrikeDirection('right', 0.5, 0.5)
    const preview: BallisticLaunch = {
      origin: { x: pose.x, y: pose.y, z: pose.z },
      direction: dir,
      speed: serveSpeed(0.6),
      serve: true,
    }
    const contact = blankContact()
    expect(predictSurfaceContact(preview, contact)).toBe(true)
    expect(contact.time).toBeGreaterThan(0.25)
    expect(contact.time).toBeLessThan(0.8)

    const dt = 1 / 60
    const lambda = BALL_LINEAR_DAMPING
    let x = preview.origin.x
    let y = preview.origin.y
    let z = preview.origin.z
    let vx = preview.direction.x * preview.speed
    let vy = preview.direction.y * preview.speed
    let vz = preview.direction.z * preview.speed
    const frontZ = FRONT_WALL_Z + BALL_RADIUS
    let hitX = 0
    let hitY = 0
    let hitZ = 0
    let crossed = false
    for (let i = 0; i < 180 && !crossed; i++) {
      const px = x
      const py = y
      const pz = z
      vx = vx / (1 + lambda * dt)
      vz = vz / (1 + lambda * dt)
      vy = (vy + GRAVITY_Y * dt) / (1 + lambda * dt)
      x += vx * dt
      y += vy * dt
      z += vz * dt
      if (pz > frontZ && z <= frontZ) {
        const u = (pz - frontZ) / (pz - z)
        hitX = px + (x - px) * u
        hitY = py + (y - py) * u
        hitZ = pz + (z - pz) * u
        crossed = true
      }
    }
    expect(crossed).toBe(true)
    const gap = Math.hypot(hitX - contact.x, hitY - contact.y, hitZ - contact.z)
    expect(gap).toBeLessThanOrEqual(0.08)
  })
})

describe('fillPreviewLaunch', () => {
  it('matches the serve strike helpers', () => {
    const out: BallisticLaunch = {
      origin: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 0 },
      speed: 0,
      serve: false,
    }
    expect(fillPreviewLaunch({
      kind: 'serve',
      serviceBox: 'left',
      aim: 0.25,
      loft: 0.8,
      power: 0.4,
    }, out)).toBe(true)
    const pose = serveBallWorldPosition('left')
    const dir = serveStrikeDirection('left', 0.25, 0.8)
    expect(out.origin).toEqual(pose)
    expect(out.direction.x).toBeCloseTo(dir.x, 8)
    expect(out.direction.y).toBeCloseTo(dir.y, 8)
    expect(out.direction.z).toBeCloseTo(dir.z, 8)
    expect(out.speed).toBe(serveSpeed(0.4))
    expect(out.serve).toBe(true)
  })

  it('withholds a rally preview until a shot type is committed', () => {
    const out: BallisticLaunch = {
      origin: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 0 },
      speed: 0,
      serve: false,
    }
    expect(fillPreviewLaunch({
      kind: 'rally',
      playerPosition: { x: 0, y: 0.01, z: 1 },
      ballPosition: { x: 0.2, y: 0.8, z: 0.4 },
      aim: 0.5,
      loft: 0.5,
      power: 0.6,
      shotType: null,
    }, out)).toBe(false)
  })

  it('matches calculateShot for a committed rally type, and repeats', () => {
    const playerPosition = { x: 0.2, y: 0.01, z: 1.2 }
    const ballPosition = { x: 0.1, y: 0.9, z: 0.2 }
    const aim = 0.4
    const loft = 0.55
    const power = 0.7
    const input = {
      kind: 'rally' as const,
      playerPosition,
      ballPosition,
      aim,
      loft,
      power,
      shotType: 'drive' as const,
    }
    const shots = [0, 1, 2, 3, 4].map(() => {
      const out: BallisticLaunch = {
        origin: { x: 0, y: 0, z: 0 },
        direction: { x: 0, y: 0, z: 0 },
        speed: 0,
        serve: false,
      }
      expect(fillPreviewLaunch(input, out)).toBe(true)
      return {
        ox: out.origin.x,
        oy: out.origin.y,
        oz: out.origin.z,
        dx: out.direction.x,
        dy: out.direction.y,
        dz: out.direction.z,
        speed: out.speed,
      }
    })
    for (const shot of shots) expect(shot).toEqual(shots[0])

    const context = analyzeShotContext(
      new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z),
      new THREE.Vector3(ballPosition.x, ballPosition.y, ballPosition.z),
      aimToPlayerRotation(aim),
      power,
      1,
      loft,
    )
    const calculated = calculateShot(context, 'drive')
    const velocity = calculateVelocityFromShot(calculated, BASE_SHOT_SPEED)
    expect(shots[0].dx).toBeCloseTo(velocity.direction.x, 8)
    expect(shots[0].dy).toBeCloseTo(velocity.direction.y, 8)
    expect(shots[0].dz).toBeCloseTo(velocity.direction.z, 8)
    expect(shots[0].speed).toBeCloseTo(velocity.speed, 8)
    expect(shots[0].ox).toBe(ballPosition.x)
  })
})
