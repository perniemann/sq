import { HEX } from '../../theme/colors'
import { FONT_DISPLAY_STACK, FONT_UTILITY_STACK } from '../../theme/fonts'

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
    face: 'Chakra Petch 700',
    usage: 'Titles, lockup wordmark, section headings',
    css: FONT_DISPLAY_STACK,
    weight: 700,
  },
  {
    role: 'Reading',
    face: 'Chakra Petch 400',
    usage: 'Diegetic teach tips (troika Text)',
    css: FONT_DISPLAY_STACK,
    weight: 400,
  },
  {
    role: 'Utility',
    face: 'IBM Plex Mono 700',
    usage: 'Score digits, CTAs, paths, labels',
    css: FONT_UTILITY_STACK,
    weight: 700,
  },
  {
    role: 'Utility regular',
    face: 'IBM Plex Mono 400',
    usage: 'Version string, muted labels',
    css: FONT_UTILITY_STACK,
    weight: 400,
  },
] as const
