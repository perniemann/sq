import type { EvidenceSource } from './components/EvidenceBadge'

export type JourneyMedia = {
  id: string
  title: string
  phase: string
  notice: string
  source: EvidenceSource
  /** Path under public/design-media/ — capture PNG or authored journey fixture SVG. */
  imageSrc: string
}

/**
 * Play-section evidence — authored `journey-*.svg` fixtures where the ball must read at
 * catalog scale (serve, rally, point, match-over); WebGL `capture-*.png` for the rest.
 * Re-capture via `node scripts/capture-design-media.mjs` when harness or wide frames change.
 */
export const JOURNEY_MEDIA: readonly JourneyMedia[] = [
  {
    id: 'idle',
    title: 'Idle',
    phase: 'phase: idle',
    notice: 'Title lockup on the front wall. Space or click starts a match.',
    source: 'capture',
    imageSrc: '/design-media/capture-hero.png',
  },
  {
    id: 'serve',
    title: 'Serving',
    phase: 'phase: serving',
    notice: 'Service box, cyan aim line, hold-to-charge prompt on the tin band.',
    source: 'fixture',
    imageSrc: '/design-media/journey-serve.svg',
  },
  {
    id: 'rally',
    title: 'Rally',
    phase: 'phase: rally',
    notice: 'Live exchange. Score and turn marks stay diegetic on the front wall.',
    source: 'fixture',
    imageSrc: '/design-media/journey-rally.svg',
  },
  {
    id: 'point',
    title: 'Point callout',
    phase: 'phase: point',
    notice: 'DOUBLE BOUNCE — centre callout in the losing side\u2019s colour.',
    source: 'fixture',
    imageSrc: '/design-media/journey-point.svg',
  },
  {
    id: 'tin',
    title: 'Tin fault',
    phase: "phase: point · reason: 'tin'",
    notice: 'Tin callout band flashes opponent-warm; same grammar as any other fault.',
    source: 'capture',
    imageSrc: '/design-media/capture-tin.png',
  },
  {
    id: 'game-over',
    title: 'Game over',
    phase: 'phase: gameOver',
    notice: 'Game score settles; prompt advances to the next game.',
    source: 'capture',
    imageSrc: '/design-media/capture-game-over.png',
  },
  {
    id: 'match-over',
    title: 'Match over',
    phase: 'phase: matchOver',
    notice: 'VICTORY in winner colour. Magenta is reserved for match point, not shown here.',
    source: 'fixture',
    imageSrc: '/design-media/journey-match-over.svg',
  },
] as const

export const TOC = [
  { href: '#dr-map', label: 'Map' },
  { href: '#dr-play', label: 'Play' },
  { href: '#dr-feedback', label: 'Feedback' },
  { href: '#dr-system', label: 'System' },
  { href: '#dr-kit', label: 'Kit' },
] as const
