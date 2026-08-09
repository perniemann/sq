/**
 * App SemVer — single runtime source.
 * Vite injects `VITE_APP_VERSION` from package.json (see vite.config.ts).
 * Release Please bumps package.json on merge; the next build picks it up.
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
