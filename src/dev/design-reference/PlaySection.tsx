import type { ReactElement } from 'react'
import { useState } from 'react'
import { cssVar } from '../../theme/colors'
import { CourtFrame } from './components/CourtFrame'
import { RefSection } from './components/RefSection'
import { JOURNEY_MEDIA } from './journey-media'
import { drFontDisplay, drFontUtility, drHint } from './drStyles'

const ACCENT: Record<string, string> = {
  player: cssVar.player,
  opponent: cssVar.opponent,
  ink: cssVar.ink,
  gamePoint: cssVar.gamePoint,
  matchPoint: cssVar.matchPoint,
}

function JourneyDiagram({
  label,
  accent,
}: {
  label: string
  accent: string
}): ReactElement {
  const color = ACCENT[accent] ?? cssVar.player
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: `
          linear-gradient(180deg, transparent 0%, color-mix(in oklch, ${color} 8%, transparent) 100%),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 47px,
            color-mix(in oklch, ${cssVar.inkMuted} 12%, transparent) 47px,
            color-mix(in oklch, ${cssVar.inkMuted} 12%, transparent) 48px
          )
        `,
      }}
      aria-hidden
    >
      <div
        style={{
          width: '72%',
          height: '58%',
          border: `1px solid color-mix(in oklch, ${cssVar.ink} 55%, transparent)`,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '8%',
            right: '8%',
            top: '18%',
            height: 1,
            background: color,
            opacity: 0.85,
            boxShadow: `0 0 12px ${color}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '40%',
            width: 10,
            height: 10,
            marginLeft: -5,
            borderRadius: '50%',
            background: cssVar.ball,
            boxShadow: `0 0 10px ${cssVar.ball}`,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: drFontDisplay,
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: '0.08em',
          color,
          textShadow: `0 0 18px color-mix(in oklch, ${color} 50%, transparent)`,
        }}
      >
        {label}
      </span>
    </div>
  )
}

function JourneyStill({
  imageSrc,
  label,
  accent,
}: {
  imageSrc?: string
  label: string
  accent: string
}): ReactElement {
  const [failed, setFailed] = useState(false)
  if (!imageSrc || failed) {
    return <JourneyDiagram label={label} accent={accent} />
  }
  return (
    <img
      src={imageSrc}
      alt=""
      width={960}
      height={600}
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
    <RefSection id="dr-play" title="Play" kicker="Match journey">
      <p style={{ ...drHint, marginTop: 0, marginBottom: 24 }}>
        Evidence frames for each phase. Prefer captures under{' '}
        <code>public/design-media/</code>; diagrams fill in when a still is missing.
        No live Rapier / WorldHud in this catalog (v1).
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
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
            <JourneyStill
              imageSrc={j.imageSrc}
              label={j.diagramLabel}
              accent={j.accent}
            />
          </CourtFrame>
        ))}
      </div>
      <p
        style={{
          margin: '24px 0 0',
          fontFamily: drFontUtility,
          fontSize: 12,
          color: cssVar.inkMuted,
        }}
      >
        Capture tip: authored SVG plates ship under <code>public/design-media/</code>.
        Live WebGL PNGs need a GPU-capable capture (
        <code>node scripts/capture-design-media.mjs</code> with <code>?nobloom</code>) —
        then set <code>source: 'capture'</code>.
      </p>
    </RefSection>
  )
}
