/**
 * Phase 0 evidence: did the player chase when a receive failed?
 * Pure-ish module with mutable evidence state (same pattern as rallyTelemetry).
 * Exposed on `window.__sqReceive` in DEV for assist go/no-go.
 */

export type ReceiveOutcome = 'returned' | 'missed'

export type ReceiveSample = {
  outcome: ReceiveOutcome
  /** Button B (Shift / left zone) held at sample time. */
  chased: boolean
  at: number
}

export type ReceiveTelemetrySnapshot = {
  samples: ReceiveSample[]
  chasedMisses: number
  chasedReturns: number
  chasedTotal: number
  /** True when enough chased samples exist and most still miss — unlock assist raise. */
  suggestAssistRaise: boolean
  insufficientChaseEvidence: boolean
}

const MIN_CHASED_SAMPLES = 5
const ASSIST_RAISE_MISS_RATIO = 0.5

let samples: ReceiveSample[] = []

export function recordReceiveSample(input: {
  outcome: ReceiveOutcome
  chased: boolean
  now?: number
}): void {
  samples.push({
    outcome: input.outcome,
    chased: input.chased,
    at: input.now ?? 0,
  })
  if (samples.length > 40) samples = samples.slice(-40)
}

export function resetReceiveTelemetry(): void {
  samples = []
}

export function getReceiveTelemetry(): ReceiveTelemetrySnapshot {
  const chased = samples.filter(s => s.chased)
  const chasedMisses = chased.filter(s => s.outcome === 'missed').length
  const chasedReturns = chased.filter(s => s.outcome === 'returned').length
  const chasedTotal = chased.length
  const insufficientChaseEvidence = chasedTotal < MIN_CHASED_SAMPLES
  const suggestAssistRaise =
    !insufficientChaseEvidence
    && chasedMisses / chasedTotal >= ASSIST_RAISE_MISS_RATIO

  return {
    samples: samples.slice(),
    chasedMisses,
    chasedReturns,
    chasedTotal,
    suggestAssistRaise,
    insufficientChaseEvidence,
  }
}

export type SqReceiveGlobal = ReceiveTelemetrySnapshot & {
  reset: () => void
}

declare global {
  interface Window {
    __sqReceive?: SqReceiveGlobal
  }
}

/** Attach live getters for browser evidence capture (`window.__sqReceive`). */
export function installReceiveTelemetryGlobal(): void {
  if (typeof window === 'undefined') return
  Object.defineProperty(window, '__sqReceive', {
    configurable: true,
    get(): SqReceiveGlobal {
      return {
        ...getReceiveTelemetry(),
        reset: resetReceiveTelemetry,
      }
    },
  })
}
