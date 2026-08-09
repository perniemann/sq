import { describe, expect, it } from 'vitest'
import { APP_VERSION, formatVersionLabel, isSemVer } from './version'

describe('version', () => {
  it('injects a SemVer string from package.json via Vite', () => {
    expect(typeof APP_VERSION).toBe('string')
    expect(isSemVer(APP_VERSION)).toBe(true)
  })

  it('formats a display label with a v prefix', () => {
    expect(formatVersionLabel('0.1.0')).toBe('v0.1.0')
    expect(formatVersionLabel()).toBe(`v${APP_VERSION}`)
  })

  it('rejects non-SemVer strings', () => {
    expect(isSemVer('1.0')).toBe(false)
    expect(isSemVer('v0.1.0')).toBe(false)
  })
})
