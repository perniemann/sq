import { describe, it, expect, beforeEach } from 'vitest'
import {
  getReceiveTelemetry,
  recordReceiveSample,
  resetReceiveTelemetry,
} from './receiveTelemetry'

describe('receiveTelemetry', () => {
  beforeEach(() => {
    resetReceiveTelemetry()
  })

  it('stays insufficient until five chased samples exist', () => {
    for (let i = 0; i < 4; i++) {
      recordReceiveSample({ outcome: 'missed', chased: true })
    }
    const snap = getReceiveTelemetry()
    expect(snap.insufficientChaseEvidence).toBe(true)
    expect(snap.suggestAssistRaise).toBe(false)
  })

  it('suggests assist raise when chased misses dominate', () => {
    for (let i = 0; i < 5; i++) {
      recordReceiveSample({ outcome: 'missed', chased: true })
    }
    const snap = getReceiveTelemetry()
    expect(snap.insufficientChaseEvidence).toBe(false)
    expect(snap.suggestAssistRaise).toBe(true)
  })

  it('does not suggest assist raise when chased returns succeed', () => {
    for (let i = 0; i < 5; i++) {
      recordReceiveSample({ outcome: 'returned', chased: true })
    }
    expect(getReceiveTelemetry().suggestAssistRaise).toBe(false)
  })

  it('ignores unchased misses for the assist decision', () => {
    for (let i = 0; i < 8; i++) {
      recordReceiveSample({ outcome: 'missed', chased: false })
    }
    const snap = getReceiveTelemetry()
    expect(snap.insufficientChaseEvidence).toBe(true)
    expect(snap.suggestAssistRaise).toBe(false)
  })
})
