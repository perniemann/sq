import type { EvidenceSource } from './components/EvidenceBadge'

export type JourneyMedia = {
  id: string
  title: string
  phase: string
  notice: string
  source: EvidenceSource
  /** Still under public/design-media/, captured from the running build. */
  imageSrc: string
}

/**
 * Play-section evidence — real WebGL stills captured from the running dev build via
 * `node scripts/capture-design-media.mjs`, one per reachable phase. See that script's
 * header comment for the capture harness's WebGL context-loss constraint (this sandbox
 * only, not the shipped game).
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
    source: 'capture',
    imageSrc: '/design-media/capture-serving.png',
  },
  {
    id: 'rally',
    title: 'Rally',
    phase: 'phase: rally',
    notice: 'Live exchange. Score and turn marks stay diegetic on the front wall.',
    source: 'capture',
    imageSrc: '/design-media/capture-rally.png',
  },
  {
    id: 'point',
    title: 'Point callout',
    phase: 'phase: point',
    notice: 'DOUBLE BOUNCE — centre callout in the losing side\u2019s colour.',
    source: 'capture',
    imageSrc: '/design-media/capture-point.png',
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
    source: 'capture',
    imageSrc: '/design-media/capture-match-over.png',
  },
] as const

export const TOC = [
  { href: '#dr-map', label: 'Map' },
  { href: '#dr-play', label: 'Play' },
  { href: '#dr-feedback', label: 'Feedback' },
  { href: '#dr-system', label: 'System' },
  { href: '#dr-kit', label: 'Kit' },
] as const
