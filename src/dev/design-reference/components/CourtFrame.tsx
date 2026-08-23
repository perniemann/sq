import type { ReactElement, ReactNode } from 'react'
import { cssVar } from '../../../theme/colors'
import { drFontUtility } from '../drStyles'
import { EvidenceBadge, type EvidenceSource } from './EvidenceBadge'

/**
 * Evidence frame — landscape “court plate” (prior-art frame adapted for a 3D game).
 */
export function CourtFrame({
  children,
  title,
  phase,
  notice,
  source = 'fixture',
}: {
  children?: ReactNode
  title: string
  phase?: string
  notice?: string
  source?: EvidenceSource
}): ReactElement {
  return (
    <article style={{ minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontFamily: drFontUtility,
            fontSize: 13,
            fontWeight: 700,
            color: cssVar.ink,
          }}
        >
          {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <EvidenceBadge source={source} />
          {phase ? (
            <code
              style={{
                fontFamily: drFontUtility,
                fontSize: 11,
                color: cssVar.inkMuted,
              }}
            >
              {phase}
            </code>
          ) : null}
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 10',
          overflow: 'hidden',
          background: cssVar.void,
          border: `1px solid color-mix(in oklch, ${cssVar.inkMuted} 35%, transparent)`,
        }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
      </div>
      {notice ? (
        <p
          style={{
            margin: '8px 0 0',
            fontFamily: drFontUtility,
            fontSize: 12,
            lineHeight: 1.45,
            color: cssVar.inkMuted,
            maxWidth: '42ch',
          }}
        >
          {notice}
        </p>
      ) : null}
    </article>
  )
}
