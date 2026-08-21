import type { EvidenceSource } from './components/EvidenceBadge'

export type JourneyMedia = {
  id: string
  title: string
  phase: string
  notice: string
  source: EvidenceSource
  /** Still under public/design-media/ */
  imageSrc?: string
  /** Diagram label when no image */
  diagramLabel: string
  accent: 'player' | 'opponent' | 'ink' | 'gamePoint' | 'matchPoint'
}

/** Play-section evidence — authored SVG plates (fixtures); swap to PNG captures when GPU capture works. */
export const JOURNEY_MEDIA: readonly JourneyMedia[] = [
  {
    id: 'idle',
    title: 'Idle lockup',
    phase: 'phase: idle',
    notice: 'Brand + version + opponent-tone CTA on the front wall. Court is the composition.',
    source: 'fixture',
    imageSrc: '/design-media/journey-idle.svg',
    diagramLabel: 'IDLE',
    accent: 'opponent',
  },
  {
    id: 'serve',
    title: 'Serve',
    phase: 'phase: serving',
    notice: 'Service box + ready cue. Space charges; aim axes while held.',
    source: 'fixture',
    imageSrc: '/design-media/journey-serve.svg',
    diagramLabel: 'SERVE',
    accent: 'player',
  },
  {
    id: 'rally',
    title: 'Rally',
    phase: 'phase: rally',
    notice: 'Diegetic tin scores, turn marks, live ball tint when returnable (canHit).',
    source: 'fixture',
    imageSrc: '/design-media/journey-rally.svg',
    diagramLabel: 'RALLY',
    accent: 'player',
  },
  {
    id: 'point',
    title: 'Point callout',
    phase: 'phase: point',
    notice: 'Centre callout in striker colour; advance cue stays available.',
    source: 'fixture',
    imageSrc: '/design-media/journey-point.svg',
    diagramLabel: 'POINT',
    accent: 'player',
  },
  {
    id: 'match-over',
    title: 'Match over',
    phase: 'phase: matchOver',
    notice: 'Result tone uses winner identity; magenta reserved for match point.',
    source: 'fixture',
    imageSrc: '/design-media/journey-match-over.svg',
    diagramLabel: 'MATCH',
    accent: 'matchPoint',
  },
] as const

export const TOC = [
  { href: '#dr-map', label: 'Map' },
  { href: '#dr-play', label: 'Play' },
  { href: '#dr-feedback', label: 'Feedback' },
  { href: '#dr-system', label: 'System' },
  { href: '#dr-kit', label: 'Kit' },
] as const
