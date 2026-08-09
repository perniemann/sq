import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  judgeInterference,
  separate,
  planarDistance,
  accumulateInterference,
  createInterferenceWatch,
  INTERFERENCE_RADIUS,
  INTERFERENCE_HOLD_MS,
  MIN_SEPARATION,
  PLAYING_DISTANCE,
} from './interference'
import { seededRandom } from '../test/random'

/**
 * Phase 6 gate: "a let replays the rally without scoring; a blocked winner awards a
 * stroke; no two-body overlap". The first is the store's job (see gameStore.test.ts);
 * the judgement itself and the separation invariant are covered here.
 *
 * Court z runs front (negative) to back (positive), so a blocker nearer the front wall
 * than the ball is standing in the line of the shot.
 */

function at(x: number, z: number, y = 0.01): THREE.Vector3 {
  return new THREE.Vector3(x, y, z)
}

/** A striker in the back court playing a ball just in front of them. */
const striker = at(0, 1.0)
const ball = at(0, 0.6)

function judge(overrides: Partial<Parameters<typeof judgeInterference>[0]> = {}) {
  return judgeInterference({
    strikerPosition: striker,
    nonStrikerPosition: at(0, 0.4),
    ballPosition: ball,
    strikerIsPlaying: true,
    ...overrides,
  })
}

describe('judgeInterference', () => {
  it('awards a stroke when the blocker stands in the ball\'s line to the front wall', () => {
    // Blocker between ball and front wall: the ball hit straight would have struck them.
    expect(judge({ nonStrikerPosition: at(0, 0.4) })).toBe('stroke')
  })

  it('gives only a let when the blocker crowds the striker from behind the ball', () => {
    // Same crowding, but on the far side of the ball, so no winning shot was denied.
    expect(judge({ nonStrikerPosition: at(0, 0.85) })).toBe('let')
  })

  it('judges the same way anywhere across the court', () => {
    // The straight drive runs parallel to the side walls, so the geometry does not depend on
    // which side of the court the rally is on.
    for (const x of [-2.5, 0, 2.5]) {
      expect(judgeInterference({
        strikerPosition: at(x, 1.0),
        nonStrikerPosition: at(x, 0.4),
        ballPosition: at(x, 0.6),
        strikerIsPlaying: true,
      })).toBe('stroke')
    }
  })

  /**
   * The stroke cone is deliberately tighter than the access cone: obstructing the striker's
   * route to the ball is a let, standing in the line the ball would have taken is a stroke.
   * A blocker off to the side, down-court of the ball, has to fall between the two.
   */
  it('downgrades to a let when the blocker is down-court but off the shot line', () => {
    expect(judgeInterference({
      strikerPosition: at(0, 1.0),
      nonStrikerPosition: at(0.45, 0.55),
      ballPosition: at(0, 0.7),
      strikerIsPlaying: true,
    })).toBe('let')
  })

  it('is silent when the blocker is beside the striker rather than in the way', () => {
    expect(judge({ nonStrikerPosition: at(0.5, 1.05) })).toBe('none')
  })

  it('is silent once the players are further apart than the interference radius', () => {
    const clear = at(0, 1.0 - (INTERFERENCE_RADIUS + 0.2))
    expect(planarDistance(striker, clear)).toBeGreaterThan(INTERFERENCE_RADIUS)
    expect(judge({ nonStrikerPosition: clear })).toBe('none')
  })

  it('is silent while the ball is too far away for the striker to be playing it', () => {
    // Two players brushing past in mid-court with the ball up at the front wall are not
    // interfering — nothing is being denied yet.
    const distantBall = at(0, 1.0 - (PLAYING_DISTANCE + 0.5))
    expect(planarDistance(striker, distantBall)).toBeGreaterThan(PLAYING_DISTANCE)
    expect(judge({ ballPosition: distantBall })).toBe('none')
  })

  it('is silent when the striker is not going for the ball', () => {
    expect(judge({ strikerIsPlaying: false })).toBe('none')
  })

  it('is silent when the striker and blocker are on the same spot', () => {
    // Degenerate: no direction to compare, so no judgement rather than a divide by zero.
    expect(judge({ nonStrikerPosition: striker.clone() })).toBe('none')
  })
})

/**
 * The judgement-to-award path. `judgeInterference` is pure geometry and is only a small part
 * of the behaviour a player sees; the timer that decides *whether and to whom* a call is
 * awarded used to live in `Scene.tsx`'s `useFrame`, where it had no coverage at all — and
 * that is exactly where the scoring bug below was found.
 */
describe('accumulateInterference', () => {
  const start = 1000

  function hold(call: 'let' | 'stroke', striker: 'player' | 'opponent', elapsed: number) {
    const first = accumulateInterference(createInterferenceWatch(), call, striker, start)
    return accumulateInterference(first.watch, call, striker, start + elapsed)
  }

  it('awards nothing on the frame an obstruction appears', () => {
    const { award } = accumulateInterference(createInterferenceWatch(), 'stroke', 'player', start)
    expect(award).toBe('none')
  })

  it('awards nothing while the obstruction is younger than the hold', () => {
    expect(hold('stroke', 'player', INTERFERENCE_HOLD_MS - 1).award).toBe('none')
  })

  it('awards the call once the obstruction has persisted', () => {
    expect(hold('stroke', 'player', INTERFERENCE_HOLD_MS).award).toBe('stroke')
    expect(hold('let', 'player', INTERFERENCE_HOLD_MS).award).toBe('let')
  })

  it('awards one call per obstruction, not one per frame', () => {
    const { watch, award } = hold('stroke', 'player', INTERFERENCE_HOLD_MS)
    expect(award).toBe('stroke')
    const next = accumulateInterference(watch, 'stroke', 'player', start + INTERFERENCE_HOLD_MS + 16)
    expect(next.award).toBe('none')
  })

  it('restarts the clock when the obstruction clears', () => {
    const first = accumulateInterference(createInterferenceWatch(), 'stroke', 'player', start)
    const cleared = accumulateInterference(first.watch, 'none', 'player', start + 100)
    expect(cleared.award).toBe('none')

    const again = accumulateInterference(cleared.watch, 'stroke', 'player', start + 110)
    const soon = accumulateInterference(again.watch, 'stroke', 'player', start + 110 + INTERFERENCE_HOLD_MS - 1)
    expect(soon.award).toBe('none')
  })

  it('restarts the clock when a let becomes a stroke', () => {
    const first = accumulateInterference(createInterferenceWatch(), 'let', 'player', start)
    const escalated = accumulateInterference(first.watch, 'stroke', 'player', start + 200)
    expect(escalated.award).toBe('none')
    expect(escalated.watch.since).toBe(start + 200)
  })

  /**
   * The bug this function was extracted to fix. The timer used to key only on the call value,
   * so an obstruction that persisted across a strike kept running: the striker flips the
   * moment the ball is hit, the geometry does not change with it, and the call fired against
   * the *new* striker — awarding the stroke to the player who had caused the obstruction. The
   * 250 ms hold made it more likely rather than less, because the window straddles the strike.
   */
  it('does not carry a stroke earned by one player over to the other', () => {
    const first = accumulateInterference(createInterferenceWatch(), 'stroke', 'player', start)
    // The player strikes; the striker changes while the bodies stay where they are.
    const handover = accumulateInterference(first.watch, 'stroke', 'opponent', start + 240)
    expect(handover.award).toBe('none')
    expect(handover.watch.striker).toBe('opponent')

    // And the opponent now has to be obstructed for the full hold in their own right.
    const tooSoon = accumulateInterference(handover.watch, 'stroke', 'opponent', start + 240 + INTERFERENCE_HOLD_MS - 1)
    expect(tooSoon.award).toBe('none')
    const earned = accumulateInterference(handover.watch, 'stroke', 'opponent', start + 240 + INTERFERENCE_HOLD_MS)
    expect(earned.award).toBe('stroke')
  })

  it('holds each striker to their own clock in a rally of alternating strikes', () => {
    // A whole rally's worth of handovers, none of which should ever award a call, because no
    // single striker is obstructed for long enough.
    let watch = createInterferenceWatch()
    let now = start
    for (let strike = 0; strike < 20; strike++) {
      const striker = strike % 2 === 0 ? 'player' : 'opponent'
      for (let frame = 0; frame < 10; frame++) {
        now += 16
        const result = accumulateInterference(watch, 'stroke', striker, now)
        watch = result.watch
        expect(result.award).toBe('none')
      }
    }
  })
})

describe('separate', () => {
  it('leaves a body that is already clear where it stands', () => {
    const position = at(2, 2)
    const other = at(-2, -2)
    expect(separate(position, other).toArray()).toEqual(position.toArray())
  })

  it('pushes an overlapping body out to exactly the minimum separation', () => {
    const other = at(0, 0)
    const result = separate(at(0.1, 0), other)
    expect(planarDistance(result, other)).toBeCloseTo(MIN_SEPARATION, 6)
    // Pushed along the axis it was already offset on, not some arbitrary direction.
    expect(result.x).toBeCloseTo(MIN_SEPARATION, 6)
  })

  it('picks a direction for two exactly coincident bodies', () => {
    const other = at(0, 0)
    const result = separate(other.clone(), other)
    expect(planarDistance(result, other)).toBeCloseTo(MIN_SEPARATION, 6)
  })

  it('preserves the moved body\'s height and never moves the other body', () => {
    const position = new THREE.Vector3(0.1, 0.42, 0)
    const other = at(0, 0)
    const otherBefore = other.toArray()
    const result = separate(position, other)
    expect(result.y).toBe(0.42)
    expect(other.toArray()).toEqual(otherBefore)
  })

  it('does not mutate the position it is given', () => {
    const position = at(0.1, 0)
    const before = position.toArray()
    separate(position, at(0, 0))
    expect(position.toArray()).toEqual(before)
  })

  // The Phase 6 "no two-body overlap" gate. Both players can now reach every part of the
  // floor, so this has to hold for any pair of positions rather than the few I could
  // manufacture by crowding them in a browser.
  it('leaves no overlap for any starting pair', () => {
    const random = seededRandom(20260808)
    const spread = () => (random() - 0.5) * 2 * MIN_SEPARATION

    for (let i = 0; i < 2000; i++) {
      const other = at(spread(), spread())
      const position = at(other.x + spread(), other.z + spread())
      const result = separate(position, other)
      expect(planarDistance(result, other)).toBeGreaterThanOrEqual(MIN_SEPARATION - 1e-9)
    }
  })
})
