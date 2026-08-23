import type { ReactElement } from 'react'
import { useState } from 'react'
import { cssVar } from '../../../theme/colors'
import { drFontUtility } from '../drStyles'
import type { EvidenceSource } from './EvidenceBadge'
import { EvidenceBadge } from './EvidenceBadge'

function Frame({
  imageSrc,
  label,
  alt,
}: {
  imageSrc: string
  label: string
  alt: string
}): ReactElement {
  const [failed, setFailed] = useState(false)
  return (
    <div style={{ minWidth: 0, flex: '1 1 220px' }}>
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
        {failed ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: drFontUtility,
              fontSize: 11,
              color: cssVar.inkMuted,
              textAlign: 'center',
              padding: 12,
            }}
          >
            Capture missing
          </div>
        ) : (
          <img
            src={imageSrc}
            alt={alt}
            width={1600}
            height={1000}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <p
        style={{
          margin: '6px 0 0',
          fontFamily: drFontUtility,
          fontSize: 11,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: cssVar.inkMuted,
        }}
      >
        {label}
      </p>
    </div>
  )
}

/**
 * Two real stills of the same mechanic in its off/on (or before/trigger) state — the
 * portfolio's "show, don't tell" unit for anything that can't be one screenshot.
 */
export function BeforeAfter({
  before,
  after,
  source = 'capture',
}: {
  before: { imageSrc: string; label: string; alt: string }
  after: { imageSrc: string; label: string; alt: string }
  source?: EvidenceSource
}): ReactElement {
  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <EvidenceBadge source={source} />
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          gap: 16,
        }}
      >
        <Frame {...before} />
        <span
          aria-hidden
          style={{
            alignSelf: 'center',
            fontFamily: drFontUtility,
            fontSize: 20,
            color: cssVar.inkMuted,
            padding: '0 2px',
          }}
        >
          &rarr;
        </span>
        <Frame {...after} />
      </div>
    </div>
  )
}
