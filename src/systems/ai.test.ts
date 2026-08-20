import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  createAIConfig,
  createAIState,
  updateAthlete,
  predictInterceptPosition,
  calculateAIShot,
  aiRallyAim,
  shouldPlayDrop,
  shouldStrike,
  yieldTarget,
  nextYieldSide,
  AI_DROP_SPEED,
  type AIConfig,
  type YieldSide,
} from './ai'
import { COURT, FRONT_WALL_Z, ATHLETE_INSET } from './court'
import { T_POSITION } from './courtPositions'
import { INTERFERENCE_RADIUS, MIN_SEPARATION, planarDistance } from './interference'
import { HIT_ZONE_CONFIG } from './hitAccuracy'
import { seededRandom } from '../test/random'

const GRAVITY = 9.81
const FRAME = 1 / 60

/**
 * Corners of the court, named as a player would name them, each with the partition an
 * athlete has to cross to get there.
 *
 * Task 18 removed two clamps: the opponent was held to `z <= 0.5` and the player to
 * `z >= -0.5`. So the front corners are the ones the old player code could not reach and the
 * back corners are the ones the old opponent code could not. `pastPartition` is the assertion
 * that actually fails against those clamps — checking the sign of z does not, because an
 * athlete pinned at the clamp still has the same sign as the corner it was heading for.
 */
const CORNERS = {
  'front left': { ball: new THREE.Vector3(-2.9, 0.7, -4.5), pastPartition: (z: number) => z < -0.5 },
  'front right': { ball: new THREE.Vector3(2.9, 0.7, -4.5), pastPartition: (z: number) => z < -0.5 },
  'back left': { ball: new THREE.Vector3(-2.9, 0.7, 4.5), pastPartition: (z: number) => z > 0.5 },
  'back right': { ball: new THREE.Vector3(2.9, 0.7, 4.5), pastPartition: (z: number) => z > 0.5 },
}

/**
 * Run an athlete at a stationary ball from the T until it can play the ball, and report
 * where it got to. A still ball is used deliberately: it takes the trajectory predictor
 * out of the picture so this measures movement and court bounds only.
 */
function chaseFromT(ball: THREE.Vector3, config: AIConfig, frames = 400) {
  let state = createAIState([T_POSITION.x, 0.01, T_POSITION.z])
  const still = new THREE.Vector3()

  for (let frame = 0; frame < frames; frame++) {
    state = updateAthlete({
      state,
      ballPosition: ball,
      ballVelocity: still,
      config,
      deltaTime: FRAME,
      gamePhase: 'rally',
      isStriker: true,
      now: 1000 + frame * (1000 / 60),
    })
    // Arrival is measured against the athlete's own chosen standing position, not against the
    // ball: it deliberately stops `forwardOffset` short of the ball to swing at it.
    const arrived = state.isMovingToBall
      && state.targetPosition !== null
      && state.position.distanceTo(state.targetPosition) < 0.06
    if (arrived) return { state, frame, reached: true }
  }
  return { state, frame: frames, reached: false }
}

/**
 * Phase 6 gate: "both players reach all four corners."
 *
 * This is what Task 18 was for. The old code clamped the opponent to `z <= 0.5` and the
 * player to `z >= -0.5`, so each side could only ever reach two of these four. One
 * implementation now serves both athletes, so covering all four corners from it covers
 * both players.
 */
describe('court coverage', () => {
  for (const [name, { ball, pastPartition }] of Object.entries(CORNERS)) {
    it(`crosses the old partition to reach the ${name} corner`, () => {
      const config = createAIConfig('hard')
      const { state } = chaseFromT(ball, config)

      expect(pastPartition(state.position.z)).toBe(true)
      expect(Math.sign(state.position.x)).toBe(Math.sign(ball.x))

      // Arrived at the position it chose, rather than still walking when frames ran out.
      expect(state.targetPosition).not.toBeNull()
      expect(state.position.distanceTo(state.targetPosition!)).toBeLessThan(0.06)

      // In position to play the ball. An athlete deliberately stands `forwardOffset` behind
      // the ball rather than on it, so that standoff is part of the reach.
      const planar = Math.hypot(state.position.x - ball.x, state.position.z - ball.z)
      expect(planar).toBeLessThan(config.hitRange + HIT_ZONE_CONFIG.forwardOffset)
    })
  }

  it('stays inside the athlete inset while doing it', () => {
    for (const { ball } of Object.values(CORNERS)) {
      const { state } = chaseFromT(ball, createAIConfig('hard'))
      // The inset, not the wall: asserting against the wall would still pass if the inset
      // were lost, which is the regression this exists to catch.
      expect(Math.abs(state.position.x)).toBeLessThanOrEqual(COURT.width / 2 - ATHLETE_INSET)
      expect(Math.abs(state.position.z)).toBeLessThanOrEqual(COURT.length / 2 - ATHLETE_INSET)
    }
  })

  it('takes longer to reach a corner on the slowest difficulty', () => {
    const corner = CORNERS['front left'].ball
    const hard = chaseFromT(corner, createAIConfig('hard'))
    const easy = chaseFromT(corner, createAIConfig('easy'))
    expect(hard.reached).toBe(true)
    expect(easy.frame).toBeGreaterThan(hard.frame)
  })
})

describe('predictInterceptPosition', () => {
  it('walks to a dead ball rather than extrapolating it', () => {
    const ball = new THREE.Vector3(1, 0.2, 2)
    const target = predictInterceptPosition(ball, new THREE.Vector3(0, 0, 0))
    expect(target.x).toBeCloseTo(ball.x, 6)
    expect(target.z).toBeCloseTo(ball.z, 6)
  })

  it('leads a moving ball down the court', () => {
    const ball = new THREE.Vector3(0, 1.5, 3)
    const target = predictInterceptPosition(ball, new THREE.Vector3(0, 0, -8))
    expect(target.z).toBeLessThan(ball.z)
  })

  it('keeps the intercept inside the athlete inset for any ball and velocity', () => {
    const random = seededRandom(424242)
    const spread = (range: number) => (random() - 0.5) * 2 * range

    for (let i = 0; i < 2000; i++) {
      const ball = new THREE.Vector3(spread(COURT.width / 2), random() * 5, spread(COURT.length / 2))
      const velocity = new THREE.Vector3(spread(30), spread(20), spread(30))
      const target = predictInterceptPosition(ball, velocity)

      expect(Math.abs(target.x)).toBeLessThanOrEqual(COURT.width / 2 - ATHLETE_INSET)
      expect(Math.abs(target.z)).toBeLessThanOrEqual(COURT.length / 2 - ATHLETE_INSET)
      expect(Number.isFinite(target.x)).toBe(true)
      expect(Number.isFinite(target.z)).toBe(true)
    }
  })
})

/**
 * Where a shot crosses the front wall plane, under gravity alone.
 *
 * Drag is ignored here for the same reason `calculateAIShot` ignores it when solving the
 * launch angle: the point is to check the aim solver against its own model. Drag makes the
 * real ball arrive slightly lower, which eats into the clearance above the tin, so treat
 * the margins below as the optimistic case.
 */
function flightToFrontWall(ballPosition: THREE.Vector3, direction: THREE.Vector3, speed: number) {
  const velocity = direction.clone().multiplyScalar(speed)
  const time = (FRONT_WALL_Z - ballPosition.z) / velocity.z
  return {
    time,
    x: ballPosition.x + velocity.x * time,
    y: ballPosition.y + velocity.y * time - 0.5 * GRAVITY * time * time,
  }
}

/** Ball positions spread over the floor, at the heights a rally ball is actually struck at. */
function sampleBallPositions(): THREE.Vector3[] {
  const positions: THREE.Vector3[] = []
  for (const x of [-2.8, -1.4, 0, 1.4, 2.8]) {
    for (const z of [-4, -2, 0, 2, 4.4]) {
      for (const y of [0.2, 0.7, 1.5]) {
        positions.push(new THREE.Vector3(x, y, z))
      }
    }
  }
  return positions
}

describe('aiRallyAim', () => {
  it('aims left of centre when the opponent is on the right', () => {
    expect(aiRallyAim(1.5, 0)).toBeCloseTo(-0.2, 8)
    expect(aiRallyAim(1.5, 1)).toBeCloseTo(-0.7, 8)
  })

  it('aims right of centre when the opponent is on the left', () => {
    expect(aiRallyAim(-1.5, 0)).toBeCloseTo(0.2, 8)
    expect(aiRallyAim(-1.5, 1)).toBeCloseTo(0.7, 8)
  })

  it('does not key off the striker — same opponent X, same aim', () => {
    // Regression: the old helper used the striker's X, so an AI standing left while the
    // human held the right box always fired into the left wall.
    expect(aiRallyAim(2.0, 0.5)).toBeLessThan(0)
  })
})

describe('calculateAIShot', () => {
  /**
   * The regression this replaces: firing at a fixed elevation made the arc depend on
   * where the ball happened to be, so a shot from the back of the court sailed over the
   * 5.64 m clear height and the rally ended OUT on the first return.
   */
  it('puts a well-struck shot on the front wall above the tin and under the clear height', () => {
    for (const ballPosition of sampleBallPositions()) {
      for (const power of [0, 0.5, 1]) {
        for (const lateralAim of [-1, 0, 1]) {
          for (const heightAim of [0, 0.5, 1]) {
            const shot = calculateAIShot({
              ballPosition,
              power,
              lateralAim,
              heightAim,
              accuracy: 1,
              lateralMiss: 0,
              heightMiss: 0,
              drop: false,
            })
            const hit = flightToFrontWall(ballPosition, shot.direction, shot.speed)
            const where = `from ${ballPosition.toArray()} power ${power} aim ${lateralAim}/${heightAim}`

            expect(hit.time, where).toBeGreaterThan(0)
            expect(hit.y, `${where} cleared the tin`).toBeGreaterThan(COURT.tinHeight)
            expect(hit.y, `${where} stayed under the clear height`).toBeLessThan(COURT.clearHeight)
            expect(Math.abs(hit.x), `${where} stayed on the front wall`).toBeLessThan(COURT.width / 2)
          }
        }
      }
    }
  })

  it('sends the ball toward the front wall, never away from it', () => {
    for (const ballPosition of sampleBallPositions()) {
      const shot = calculateAIShot({
        ballPosition,
        power: 0.5,
        lateralAim: 0,
        heightAim: 0.5,
        accuracy: 1,
        lateralMiss: 0,
        heightMiss: 0,
        drop: false,
      })
      expect(shot.direction.z).toBeLessThan(0)
      expect(shot.direction.length()).toBeCloseTo(1, 6)
    }
  })

  it('aims a drop lower and slower than a drive from the same place', () => {
    const ballPosition = new THREE.Vector3(0, 0.7, 3)
    const common = {
      ballPosition,
      power: 0.5,
      lateralAim: 0,
      heightAim: 0.5,
      accuracy: 1,
      lateralMiss: 0,
      heightMiss: 0,
    }
    const drive = calculateAIShot({ ...common, drop: false })
    const drop = calculateAIShot({ ...common, drop: true })

    expect(drop.speed).toBeLessThan(drive.speed)
    const driveHit = flightToFrontWall(ballPosition, drive.direction, drive.speed)
    const dropHit = flightToFrontWall(ballPosition, drop.direction, drop.speed)
    expect(dropHit.y).toBeLessThan(driveHit.y)
    // Still a legal shot, not a tin.
    expect(dropHit.y).toBeGreaterThan(COURT.tinHeight)
  })

  it('raises the shot on the wall as the height aim goes up', () => {
    const ballPosition = new THREE.Vector3(0, 0.7, 2)
    const heights = [0, 0.5, 1].map(heightAim => {
      const shot = calculateAIShot({
        ballPosition,
        power: 0.5,
        lateralAim: 0,
        heightAim,
        accuracy: 1,
        lateralMiss: 0,
        heightMiss: 0,
        drop: false,
      })
      return flightToFrontWall(ballPosition, shot.direction, shot.speed).y
    })
    expect(heights[0]).toBeLessThan(heights[1])
    expect(heights[1]).toBeLessThan(heights[2])
  })

  it('steers the shot across the wall with the lateral aim', () => {
    const ballPosition = new THREE.Vector3(0, 0.7, 2)
    const xs = [-1, 0, 1].map(lateralAim => {
      const shot = calculateAIShot({
        ballPosition,
        power: 0.5,
        lateralAim,
        heightAim: 0.5,
        accuracy: 1,
        lateralMiss: 0,
        heightMiss: 0,
        drop: false,
      })
      return flightToFrontWall(ballPosition, shot.direction, shot.speed).x
    })
    expect(xs[0]).toBeLessThan(xs[1])
    expect(xs[1]).toBeLessThan(xs[2])
  })

  /**
   * How wild the widest possible mis-hit is. On a clean aim the shot has to arrive on the front
   * wall; a big lateral miss is allowed to send it into a side wall first, which is a boast, but
   * it should not be flying at something absurd. The bound is documented on `AI_MISS_WIDTH`;
   * this pins it so a change to the miss scale cannot quietly widen it.
   */
  it('keeps even the worst mis-hit aimed near the front wall', () => {
    const easiest = createAIConfig('easy').accuracy
    let worst = 0

    for (const z of [-4.4, 0, 4.4]) {
      for (const lateralAim of [-1, 1]) {
        for (const lateralMiss of [-1, 1]) {
          const ballPosition = new THREE.Vector3(0, 0.7, z)
          const shot = calculateAIShot({
            ballPosition,
            power: 0.5,
            lateralAim,
            heightAim: 0.5,
            accuracy: easiest,
            lateralMiss,
            heightMiss: 0,
            drop: false,
          })
          // Where the shot is pointed, projected onto the front wall plane.
          const t = (FRONT_WALL_Z - ballPosition.z) / shot.direction.z
          worst = Math.max(worst, Math.abs(ballPosition.x + shot.direction.x * t))
        }
      }
    }

    // Within one metre of the wall's edge, never off into the gallery.
    expect(worst).toBeGreaterThan(COURT.width / 2)
    expect(worst).toBeLessThan(COURT.width / 2 + 1)
  })

  /**
   * Inaccuracy is what ends rallies. With a perfect aim every shot clears the tin and
   * lands in court, so an AI-vs-AI rally never finishes — which is exactly the bug behind
   * F5 ("demo mode never completes a game"). This asserts the mechanism still bites.
   */
  it('lets a poor player hit the tin', () => {
    const ballPosition = new THREE.Vector3(0, 0.7, 2)
    const intoTheTin = calculateAIShot({
      ballPosition,
      power: 0.5,
      lateralAim: 0,
      heightAim: 0,
      accuracy: createAIConfig('easy').accuracy,
      lateralMiss: 0,
      heightMiss: -1,
      drop: false,
    })
    const hit = flightToFrontWall(ballPosition, intoTheTin.direction, intoTheTin.speed)
    expect(hit.y).toBeLessThan(COURT.tinHeight)
  })

  /**
   * The bug this covers: soft `AI_DROP_SPEED` and a projectile's range is v²/g, so a
   * drop can only carry 6.5 m — less than the 7.9 m from the back of the court. Every
   * "drop" chosen from deep landed on the floor before the front wall, which is NOT UP.
   * In play it read as a random unforced error.
   */
  it('hits a reachable shot even when asked for a drop from the back court', () => {
    const deep = new THREE.Vector3(0, 0.7, 4.4)
    const shot = calculateAIShot({
      ballPosition: deep,
      power: 0,
      lateralAim: 0,
      heightAim: 0.5,
      accuracy: 1,
      lateralMiss: 0,
      heightMiss: 0,
      drop: true,
    })
    const hit = flightToFrontWall(deep, shot.direction, shot.speed)
    expect(hit.y).toBeGreaterThan(COURT.tinHeight)
  })

  it('leaves a drop from the front at drop pace', () => {
    // Close enough to the wall that the drop speed carries, so raising it is unnecessary
    // and the softness that makes it a drop survives.
    const short = new THREE.Vector3(0, 0.7, -3)
    const common = {
      ballPosition: short,
      power: 1,
      lateralAim: 0,
      heightAim: 0.5,
      accuracy: 1,
      lateralMiss: 0,
      heightMiss: 0,
    }
    const drop = calculateAIShot({ ...common, drop: true })
    const drive = calculateAIShot({ ...common, drop: false })
    expect(drop.speed).toBeLessThan(drive.speed / 2)
  })

  it('ignores the miss samples entirely when accuracy is perfect', () => {
    const ballPosition = new THREE.Vector3(0, 0.7, 2)
    const common = {
      ballPosition,
      power: 0.5,
      lateralAim: 0,
      heightAim: 0.5,
      accuracy: 1,
      drop: false,
    }
    const clean = calculateAIShot({ ...common, lateralMiss: 0, heightMiss: 0 })
    const missed = calculateAIShot({ ...common, lateralMiss: 1, heightMiss: -1 })
    expect(missed.direction.toArray()).toEqual(clean.direction.toArray())
  })
})

describe('shouldPlayDrop', () => {
  const always = 0
  const never = 0.99

  it('plays a drop off a short ball', () => {
    expect(shouldPlayDrop(new THREE.Vector3(0, 0.7, -3), 0, always)).toBe(true)
  })

  it('never plays one from the back of the court, however the dice fall', () => {
    for (const z of [1, 2, 4.4]) {
      expect(shouldPlayDrop(new THREE.Vector3(0, 0.7, z), 0, always)).toBe(false)
    }
  })

  it('goes short only some of the time', () => {
    expect(shouldPlayDrop(new THREE.Vector3(0, 0.7, -3), 0, never)).toBe(false)
  })

  /**
   * The gate is on the distance the shot has to carry, not on where the athlete stands.
   * Gating on z alone let through drops that needed a raised speed, because lateral aim adds
   * up to 2.4 m to the distance: a wide aim from the same spot is a longer shot.
   */
  it('refuses a wide aim it would allow straight, from the same ball', () => {
    // Just in front of the short line: straight to the front wall is 5.2 m and carries at drop
    // pace, but aiming into a corner makes the same shot 5.7 m, which does not.
    const ball = new THREE.Vector3(0, 0.7, 0.3)
    expect(shouldPlayDrop(ball, 0, always)).toBe(true)
    expect(shouldPlayDrop(ball, 1, always)).toBe(false)
  })

  /**
   * The invariant that makes the gate mean something: whenever a drop is allowed, the shot
   * that comes out is actually played at drop pace. Without this, `calculateAIShot`'s speed
   * floor can quietly turn a drop into a drive or a lob and nothing notices.
   */
  it('only allows drops that come out at drop pace', () => {
    let allowed = 0

    for (const x of [-2.8, -1.4, 0, 1.4, 2.8]) {
      for (const z of [-4.4, -3, -2, -1, 0, 1, 2, 4.4]) {
        for (const y of [0.2, 0.7, 1.5]) {
          for (const lateralAim of [-1, -0.5, 0, 0.5, 1]) {
            const ballPosition = new THREE.Vector3(x, y, z)
            if (!shouldPlayDrop(ballPosition, lateralAim, 0)) continue
            allowed++

            for (const heightAim of [0, 0.5, 1]) {
              const shot = calculateAIShot({
                ballPosition,
                power: 1,
                lateralAim,
                heightAim,
                accuracy: 1,
                lateralMiss: 0,
                heightMiss: 0,
                drop: true,
              })
              expect(shot.speed, `drop from ${ballPosition.toArray()} aim ${lateralAim}/${heightAim}`)
                .toBe(AI_DROP_SPEED)
            }
          }
        }
      }
    }

    // The gate has to still allow drops, or the invariant is satisfied vacuously.
    expect(allowed).toBeGreaterThan(20)
  })
})

describe('shouldStrike', () => {
  const config = createAIConfig('medium')
  const state = createAIState([0, 0.01, 1])

  it('ignores a dead ball', () => {
    expect(shouldStrike({
      state,
      ballPosition: new THREE.Vector3(0, 0.5, 1),
      ballVelocity: new THREE.Vector3(0, 0, 0),
      config,
      returnable: true,
    })).toBe(false)
  })

  it('ignores a ball above racquet reach', () => {
    expect(shouldStrike({
      state,
      ballPosition: new THREE.Vector3(0, 2.5, 0.6),
      ballVelocity: new THREE.Vector3(0, 0, 5),
      config,
      returnable: true,
    })).toBe(false)
  })

  it('ignores a ball rolling on the floor', () => {
    expect(shouldStrike({
      state,
      ballPosition: new THREE.Vector3(0, 0.05, 0.6),
      ballVelocity: new THREE.Vector3(0, 0, 5),
      config,
      returnable: true,
    })).toBe(false)
  })

  it('swings at a ball closing on the athlete when returnable', () => {
    expect(shouldStrike({
      state,
      ballPosition: new THREE.Vector3(0, 0.5, -0.5),
      ballVelocity: new THREE.Vector3(0, 0, 5),
      config,
      returnable: true,
    })).toBe(true)
  })

  it('does not charge when the prior return has not hit the front wall', () => {
    expect(shouldStrike({
      state,
      ballPosition: new THREE.Vector3(0, 0.5, -0.5),
      ballVelocity: new THREE.Vector3(0, 0, 5),
      config,
      returnable: false,
    })).toBe(false)
  })

  /**
   * The old test read the sign of `velocity.z`, which only meant "approaching" while each
   * player owned one end of the court. On a shared court an athlete in front of the ball
   * must not swing at a ball travelling away from them.
   */
  it('does not swing at a ball travelling away, whatever its z direction', () => {
    expect(shouldStrike({
      state,
      ballPosition: new THREE.Vector3(0, 0.5, 0.5),
      ballVelocity: new THREE.Vector3(0, 0, -12),
      config,
      returnable: true,
    })).toBe(false)
  })
})

describe('yieldTarget', () => {
  /**
   * The yield spot has to sit further from the T than `INTERFERENCE_RADIUS`, or a non-striker
   * that has correctly vacated the T is still close enough to be judged as blocking. Note
   * what this does *not* establish: the radius is measured from the striker, not from the T,
   * so this is a floor on how far the athlete steps aside, not a guarantee about the distance
   * to a striker who has chased a ball to that same spot.
   */
  it('steps further off the T than the interference radius', () => {
    for (const side of [-1, 1] as YieldSide[]) {
      expect(Math.abs(yieldTarget(side).x - T_POSITION.x)).toBeGreaterThan(INTERFERENCE_RADIUS)
    }
  })

  it('puts the two sides on opposite sides of the T', () => {
    expect(yieldTarget(1).x).toBeGreaterThan(0)
    expect(yieldTarget(-1).x).toBeLessThan(0)
  })

  it('stays inside the athlete inset', () => {
    for (const side of [-1, 1] as YieldSide[]) {
      expect(Math.abs(yieldTarget(side).x)).toBeLessThanOrEqual(COURT.width / 2 - ATHLETE_INSET)
    }
  })
})

describe('nextYieldSide', () => {
  it('holds its side while the ball is down the middle', () => {
    expect(nextYieldSide(1, new THREE.Vector3(0, 0.5, -2))).toBe(1)
    expect(nextYieldSide(-1, new THREE.Vector3(0, 0.5, -2))).toBe(-1)
  })

  it('holds its side against a ball on the other side', () => {
    expect(nextYieldSide(1, new THREE.Vector3(-2.5, 0.5, -2))).toBe(1)
  })

  it('gives up its side when the ball comes decisively to it', () => {
    expect(nextYieldSide(1, new THREE.Vector3(2.5, 0.5, -2))).toBe(-1)
    expect(nextYieldSide(-1, new THREE.Vector3(-2.5, 0.5, -2))).toBe(1)
  })

  /**
   * The dead band used to be 0.3 m, narrower than a ball's ordinary lateral wander, so a
   * straight length crossed it constantly and each crossing walked the non-striker the full
   * 2.6 m between yield spots — through the T and through the striker. A sweep is the only
   * way to catch this: a single test at x = 0 sits inside any dead band and cannot fail.
   */
  it('does not thrash as the ball wanders across the middle', () => {
    let side: YieldSide = 1
    let changes = 0

    // A length down the middle, drifting a metre either side of the centre line.
    for (let frame = 0; frame < 600; frame++) {
      const ballX = Math.sin(frame / 12) * 1.0
      const next = nextYieldSide(side, new THREE.Vector3(ballX, 0.5, -2))
      if (next !== side) changes++
      side = next
    }

    expect(changes).toBe(0)
  })

  it('still switches for a ball played genuinely wide, and settles there', () => {
    let side: YieldSide = 1
    let changes = 0

    for (let frame = 0; frame < 600; frame++) {
      const next = nextYieldSide(side, new THREE.Vector3(2.6, 0.5, -2))
      if (next !== side) changes++
      side = next
    }

    // Switches once off its own side, then stays: the ball is now on the other side.
    expect(changes).toBe(1)
    expect(side).toBe(-1)
  })
})

describe('updateAthlete', () => {
  const config = createAIConfig('medium')

  it('holds position during serve setup', () => {
    const state = createAIState([1, 0.01, 2])
    const next = updateAthlete({
      state,
      ballPosition: new THREE.Vector3(0, 0.5, -3),
      ballVelocity: new THREE.Vector3(0, 0, 5),
      config,
      deltaTime: FRAME,
      gamePhase: 'serving',
      isStriker: true,
      now: 1000,
    })
    expect(next.position.toArray()).toEqual(state.position.toArray())
  })

  it('recovers toward the T between rallies', () => {
    let state = createAIState([2.5, 0.01, 4])
    const startDistance = state.position.distanceTo(T_POSITION)
    for (let frame = 0; frame < 120; frame++) {
      state = updateAthlete({
        state,
        ballPosition: new THREE.Vector3(0, 0.5, 0),
        ballVelocity: new THREE.Vector3(0, 0, 0),
        config,
        deltaTime: FRAME,
        gamePhase: 'point',
        isStriker: false,
        now: 1000 + frame * (1000 / 60),
      })
    }
    expect(state.position.distanceTo(T_POSITION)).toBeLessThan(startDistance)
    expect(state.position.distanceTo(T_POSITION)).toBeLessThan(0.1)
  })

  /**
   * `separate` is also applied to the resulting position by the caller, so a target that sits
   * inside the other athlete produced a frame-rate vibration: the athlete walked in and was
   * pushed straight back out, every frame, which also pinned the pair inside
   * `INTERFERENCE_RADIUS` and fed the obstruction timer.
   */
  it('stops clear of the other athlete instead of vibrating against them', () => {
    const other = T_POSITION.clone()
    let state = createAIState([2.5, 0.01, 3])
    const positions: THREE.Vector3[] = []

    for (let frame = 0; frame < 240; frame++) {
      state = updateAthlete({
        state,
        ballPosition: new THREE.Vector3(0, 0.5, -2),
        ballVelocity: new THREE.Vector3(0, 0, 0),
        config,
        deltaTime: FRAME,
        gamePhase: 'rally',
        isStriker: false,
        now: 1000 + frame * (1000 / 60),
        avoidPosition: other,
      })
      positions.push(state.position.clone())
    }

    // Never ends up inside the other athlete.
    for (const position of positions) {
      expect(planarDistance(position, other)).toBeGreaterThanOrEqual(MIN_SEPARATION - 1e-6)
    }

    // And settles rather than oscillating: the last second of travel is negligible.
    const settled = positions.slice(-60)
    const spread = Math.max(...settled.map(p => p.distanceTo(settled[settled.length - 1])))
    expect(spread).toBeLessThan(0.02)
  })

  it('does not push a striker off the ball to avoid the other athlete', () => {
    // The striker has right of way; it is the non-striker's job to clear.
    const ball = new THREE.Vector3(0, 0.5, 1)
    let state = createAIState([2.5, 0.01, 3])
    for (let frame = 0; frame < 240; frame++) {
      state = updateAthlete({
        state,
        ballPosition: ball,
        ballVelocity: new THREE.Vector3(0, 0, 0),
        config,
        deltaTime: FRAME,
        gamePhase: 'rally',
        isStriker: true,
        now: 1000 + frame * (1000 / 60),
        avoidPosition: ball.clone().setY(0.01),
      })
    }
    expect(Math.hypot(state.position.x - ball.x, state.position.z - ball.z))
      .toBeLessThan(config.hitRange + HIT_ZONE_CONFIG.forwardOffset)
  })

  it('does not chase the ball when it is not the striker', () => {
    const ball = new THREE.Vector3(-2.8, 0.7, -4.4)
    let state = createAIState([T_POSITION.x, 0.01, T_POSITION.z])
    for (let frame = 0; frame < 120; frame++) {
      state = updateAthlete({
        state,
        ballPosition: ball,
        ballVelocity: new THREE.Vector3(0, 0, 0),
        config,
        deltaTime: FRAME,
        gamePhase: 'rally',
        isStriker: false,
        now: 1000 + frame * (1000 / 60),
      })
    }
    // Went to its yield spot near the T, not into the front corner after the ball.
    expect(state.position.z).toBeGreaterThan(0)
    expect(state.isMovingToBall).toBe(false)
  })

  it('waits out the reaction delay before setting off', () => {
    const slow = createAIConfig('easy')
    const ball = new THREE.Vector3(-2.8, 0.7, -4.4)
    const start = createAIState([T_POSITION.x, 0.01, T_POSITION.z])
    start.lastReactionTime = 1000

    const next = updateAthlete({
      state: start,
      ballPosition: ball,
      ballVelocity: new THREE.Vector3(0, 0, 0),
      config: slow,
      deltaTime: FRAME,
      gamePhase: 'rally',
      isStriker: true,
      now: 1000 + slow.reactionDelay / 2,
    })
    expect(next.isMovingToBall).toBe(false)
    expect(next.position.toArray()).toEqual(start.position.toArray())
  })
})
