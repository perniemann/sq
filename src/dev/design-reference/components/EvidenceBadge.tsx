import type { CSSProperties, ReactElement } from 'react'
import { cssVar } from '../../../theme/colors'
import { drFontUtility } from '../drStyles'

export type EvidenceSource = 'capture' | 'fixture' | 'live-stub' | 'pending'

const BADGE: Record<EvidenceSource, CSSProperties> = {
  capture: {
    background: 'color-mix(in oklch, var(--color-player) 18%, transparent)',
    color: 'var(--color-player)',
  },
  fixture: {
    background: 'color-mix(in oklch, var(--color-ink-muted) 18%, transparent)',
    color: 'var(--color-ink-muted)',
  },
  'live-stub': {
    background: 'color-mix(in oklch, var(--color-game-point) 18%, transparent)',
    color: 'var(--color-game-point)',
  },
  pending: {
    background: 'color-mix(in oklch, var(--color-opponent) 18%, transparent)',
    color: 'var(--color-opponent)',
  },
}

export function EvidenceBadge({
  source,
}: {
  source: EvidenceSource
}): ReactElement {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        border: `1px solid color-mix(in oklch, ${cssVar.inkMuted} 35%, transparent)`,
        fontFamily: drFontUtility,
        fontSize: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        ...BADGE[source],
      }}
    >
      {source}
    </span>
  )
}
