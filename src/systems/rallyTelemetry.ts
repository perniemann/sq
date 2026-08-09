/**
 * Tracks consecutive strikes per rally for acceptance evidence (Phase 1 gate: 4+ strikes).
 * Pure module — wired from strike / point paths; exposed on `window.__sqRally` in DEV.
 */

export interface RallyTelemetrySnapshot {
  currentStrikes: number
  maxStrikes: number
  rallyCount: number
  /** Most recent finished rally lengths (newest last), capped. */
  recent: number[]
  reachedFourPlus: boolean
}

const RECENT_CAP = 40

let currentStrikes = 0
let maxStrikes = 0
let rallyCount = 0
const recent: number[] = []

export function recordStrike(): void {
  currentStrikes += 1
  if (currentStrikes > maxStrikes) maxStrikes = currentStrikes
}

/** Call when a rally ends (point or let). */
export function endRally(): void {
  if (currentStrikes > 0) {
    recent.push(currentStrikes)
    if (recent.length > RECENT_CAP) recent.shift()
    rallyCount += 1
  }
  currentStrikes = 0
}

export function resetRallyTelemetry(): void {
  currentStrikes = 0
  maxStrikes = 0
  rallyCount = 0
  recent.length = 0
}

export function getRallyTelemetry(): RallyTelemetrySnapshot {
  return {
    currentStrikes,
    maxStrikes,
    rallyCount,
    recent: recent.slice(),
    reachedFourPlus: maxStrikes >= 4,
  }
}

export type SqRallyGlobal = RallyTelemetrySnapshot & {
  reset: () => void
}

declare global {
  interface Window {
    __sqRally?: SqRallyGlobal
  }
}

/** Attach live getters for browser evidence capture (`window.__sqRally`). */
export function installRallyTelemetryGlobal(): void {
  if (typeof window === 'undefined') return
  Object.defineProperty(window, '__sqRally', {
    configurable: true,
    get(): SqRallyGlobal {
      return {
        ...getRallyTelemetry(),
        reset: resetRallyTelemetry,
      }
    },
  })
}
