import type { ReactElement } from 'react'
import { useState } from 'react'
import { cssVar } from '../../theme/colors'
import { CourtFrame } from './components/CourtFrame'
import { RefSection } from './components/RefSection'
import { JOURNEY_MEDIA } from './journey-media'
import { drFontUtility, drHint } from './drStyles'

function JourneyStill({
  imageSrc,
  title,
}: {
  imageSrc: string
  title: string
}): ReactElement {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: drFontUtility,
          fontSize: 12,
          color: cssVar.inkMuted,
          textAlign: 'center',
          padding: 16,
        }}
      >
        Capture missing — run{' '}
        <code style={{ margin: '0 4px' }}>node scripts/capture-design-media.mjs</code>
      </div>
    )
  }
  return (
    <img
      src={imageSrc}
      alt={`${title} — running-build screenshot`}
      width={1600}
      height={1000}
      loading="lazy"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
      }}
      onError={() => setFailed(true)}
    />
  )
}

export function PlaySection(): ReactElement {
  return (
    <RefSection id="dr-play" title="Play" kicker="Every reachable phase">
      <p style={{ ...drHint, marginTop: 0, marginBottom: 24 }}>
        Real WebGL stills and authored journey fixtures — one per phase the state machine can
        reach. PNG captures where the GPU cooperates; SVG fixtures carry the ball at README scale
        when whole-court captures read as empty.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
          gap: 28,
        }}
      >
        {JOURNEY_MEDIA.map((j) => (
          <CourtFrame
            key={j.id}
            title={j.title}
            phase={j.phase}
            notice={j.notice}
            source={j.source}
          >
            <JourneyStill imageSrc={j.imageSrc} title={j.title} />
          </CourtFrame>
        ))}
      </div>
    </RefSection>
  )
}
