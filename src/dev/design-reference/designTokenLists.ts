import { HEX } from '../../theme/colors'

/** CSS custom properties from `src/theme/tokens.css` (color + glow). */
export const COLOR_CSS_VARS = [
  '--color-void',
  '--color-ink',
  '--color-ink-muted',
  '--color-player',
  '--color-opponent',
  '--color-ball',
  '--color-tin-danger',
  '--color-court-line',
  '--color-game-point',
  '--color-match-point',
  '--color-player-pip-off',
  '--color-opponent-pip-off',
] as const

export const GLOW_CSS_VARS = [
  '--glow-player',
  '--glow-opponent',
  '--glow-ink',
  '--glow-match',
  '--glow-game',
] as const

export const HEX_ENTRIES = Object.entries(HEX) as ReadonlyArray<
  readonly [keyof typeof HEX, string]
>

export const FONT_ROLES = [
  {
    role: 'Display',
    face: 'Outfit 800',
    usage: 'Titles, lockup wordmark, section headings',
    css: 'Outfit, Bahnschrift, "Segoe UI", system-ui, sans-serif',
    weight: 800,
  },
  {
    role: 'Reading',
    face: 'Outfit 400',
    usage: 'Diegetic teach tips (troika Text)',
    css: 'Outfit, Bahnschrift, "Segoe UI", system-ui, sans-serif',
    weight: 400,
  },
  {
    role: 'Utility',
    face: 'IBM Plex Mono 700',
    usage: 'Score digits, CTAs, paths, labels',
    css: '"IBM Plex Mono", ui-monospace, monospace',
    weight: 700,
  },
  {
    role: 'Utility regular',
    face: 'IBM Plex Mono 400',
    usage: 'Version string, muted labels',
    css: '"IBM Plex Mono", ui-monospace, monospace',
    weight: 400,
  },
] as const
