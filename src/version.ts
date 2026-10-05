/**
 * App SemVer — single runtime source.
 * Vite injects `VITE_APP_VERSION` from package.json (see vite.config.ts).
 * Release Please bumps package.json when a `fix:` or `feat:` commit merges.
 * The next build picks that version up. Other commit titles do not bump it.
 */

const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

export function isSemVer(value: string): boolean {
  return SEMVER_RE.test(value)
}

/** Current app version (always mirrors package.json at build/dev time). */
export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION

export function formatVersionLabel(version: string = APP_VERSION): string {
  return `v${version}`
}
