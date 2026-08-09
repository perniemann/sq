import { describe, it, expect, beforeEach } from 'vitest'
import {
  recordStrike,
  endRally,
  resetRallyTelemetry,
  getRallyTelemetry,
} from './rallyTelemetry'

describe('rallyTelemetry', () => {
  beforeEach(() => {
    resetRallyTelemetry()
  })

  it('tracks max consecutive strikes across rallies', () => {
    recordStrike()
    recordStrike()
    recordStrike()
    recordStrike()
    endRally()
    recordStrike()
    endRally()

    const snap = getRallyTelemetry()
    expect(snap.maxStrikes).toBe(4)
    expect(snap.reachedFourPlus).toBe(true)
    expect(snap.recent).toEqual([4, 1])
    expect(snap.currentStrikes).toBe(0)
  })
})
