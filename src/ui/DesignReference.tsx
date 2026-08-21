import { type CSSProperties, type ReactElement } from 'react'
import { StartLockup } from './StartLockup'
import { HEX, cssVar } from '../theme/colors'
import { FONT_DISPLAY_STACK, FONT_UTILITY_STACK } from '../theme/fonts'
import { APP_VERSION, formatVersionLabel } from '../version'
import logoSvg from '../assets/sq-logo.svg?url'

const page: CSSProperties = {
  minHeight: '100%',
  boxSizing: 'border-box',
  padding: 'clamp(1.25rem, 4vw, 2.5rem)',
  background: cssVar.void,
  color: cssVar.ink,
  fontFamily: FONT_DISPLAY_STACK,
}

const section: CSSProperties = {
  marginTop: '2.5rem',
  maxWidth: '52rem',
}

const h2: CSSProperties = {
  margin: '0 0 0.75rem',
  fontFamily: FONT_UTILITY_STACK,
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: cssVar.inkMuted,
}

const swatchGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(7.5rem, 1fr))',
  gap: '0.75rem',
}

type Swatch = { key: keyof typeof HEX; label: string }

const SWATCHES: Swatch[] = [
  { key: 'void', label: 'void' },
  { key: 'ink', label: 'ink' },
  { key: 'inkMuted', label: 'inkMuted' },
  { key: 'courtLine', label: 'courtLine' },
  { key: 'player', label: 'player' },
  { key: 'opponent', label: 'opponent' },
  { key: 'ball', label: 'ball' },
  { key: 'tinDanger', label: 'tinDanger' },
  { key: 'gamePoint', label: 'gamePoint' },
  { key: 'matchPoint', label: 'matchPoint' },
  { key: 'playerPipOff', label: 'playerPipOff' },
  { key: 'opponentPipOff', label: 'opponentPipOff' },
]

/**
 * Static design reference — same tokens/fonts as the diegetic game.
 * Served at `/design` (no React Router; path branch in `main.tsx`).
 */
export default function DesignReference(): ReactElement {
  const versionLabel = formatVersionLabel(APP_VERSION)

  return (
    <main style={page}>
      <header style={{ maxWidth: '52rem' }}>
        <p style={{
          margin: '0 0 1rem',
          fontFamily: FONT_UTILITY_STACK,
          fontSize: '0.72rem',
          letterSpacing: '0.12em',
          color: cssVar.inkMuted,
        }}>
          <a href="/" style={{ color: cssVar.player, textDecoration: 'none' }}>← game</a>
          {' · '}
          design reference
        </p>
        <h1 style={{
          margin: 0,
          fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
        }}>
          sq_ visual system
        </h1>
        <p style={{
          margin: '0.65rem 0 0',
          maxWidth: '40rem',
          fontFamily: FONT_UTILITY_STACK,
          fontSize: '0.85rem',
          lineHeight: 1.5,
          color: cssVar.inkMuted,
        }}>
          Authored cool/warm identity on a B/W court substrate. Display = Chakra Petch;
          utility = IBM Plex Mono. Accents are off pure spectrum so they read as game neon,
          not template cyan/orange.
        </p>
      </header>

      <section style={section} aria-labelledby="lockup-heading">
        <h2 id="lockup-heading" style={h2}>Idle lockup</h2>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '2.5rem 1rem',
          border: `1px solid color-mix(in oklch, ${HEX.ink} 12%, transparent)`,
          background: HEX.void,
        }}>
          <StartLockup
            versionLabel={versionLabel}
            startLabel="CLICK OR SPACE"
            startA11y="Click or press Space to start"
          />
        </div>
      </section>

      <section style={section} aria-labelledby="mark-heading">
        <h2 id="mark-heading" style={h2}>Mark</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
          <figure style={{ margin: 0 }}>
            <div style={{
              padding: '1rem',
              background: '#0a0c0f',
              border: `1px solid color-mix(in oklch, ${HEX.ink} 12%, transparent)`,
            }}>
              <img src={logoSvg} alt="" width={96} height={96} style={{ display: 'block' }} />
            </div>
            <figcaption style={{
              marginTop: '0.5rem',
              fontFamily: FONT_UTILITY_STACK,
              fontSize: '0.72rem',
              color: cssVar.inkMuted,
            }}>
              wireframe mark · opponent wedge
            </figcaption>
          </figure>
        </div>
      </section>

      <section style={section} aria-labelledby="type-heading">
        <h2 id="type-heading" style={h2}>Typography</h2>
        <p style={{
          margin: '0 0 0.35rem',
          fontSize: 'clamp(2rem, 6vw, 3.25rem)',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>
          sq display
        </p>
        <p style={{
          margin: '0 0 1rem',
          fontFamily: FONT_DISPLAY_STACK,
          fontSize: '1.05rem',
          fontWeight: 400,
          color: cssVar.inkMuted,
        }}>
          Chakra Petch 400 — reading / teach tips
        </p>
        <p style={{
          margin: 0,
          fontFamily: FONT_UTILITY_STACK,
          fontWeight: 700,
          fontSize: '0.95rem',
          letterSpacing: '0.1em',
        }}>
          <span style={{ color: cssVar.opponent }}>CLICK OR SPACE</span>
          <span style={{ color: cssVar.inkMuted }}> · </span>
          <span style={{ color: cssVar.player }}>0</span>
          <span style={{ color: cssVar.inkMuted }}> : </span>
          <span style={{ color: cssVar.opponent }}>0</span>
          <span style={{ color: cssVar.inkMuted }}> · {formatVersionLabel(APP_VERSION)}</span>
        </p>
        <p style={{
          margin: '0.35rem 0 0',
          fontFamily: FONT_UTILITY_STACK,
          fontSize: '0.78rem',
          color: cssVar.inkMuted,
        }}>
          IBM Plex Mono 700 / 400 — scores, CTAs, version
        </p>
      </section>

      <section style={section} aria-labelledby="color-heading">
        <h2 id="color-heading" style={h2}>Color tokens</h2>
        <div style={swatchGrid}>
          {SWATCHES.map(({ key, label }) => (
            <div key={key} style={{ minWidth: 0 }}>
              <div
                aria-hidden="true"
                style={{
                  height: '3.25rem',
                  background: HEX[key],
                  border: key === 'void'
                    ? `1px solid color-mix(in oklch, ${HEX.ink} 18%, transparent)`
                    : '1px solid transparent',
                }}
              />
              <p style={{
                margin: '0.4rem 0 0',
                fontFamily: FONT_UTILITY_STACK,
                fontSize: '0.68rem',
                letterSpacing: '0.04em',
                color: cssVar.ink,
              }}>
                {label}
              </p>
              <p style={{
                margin: '0.1rem 0 0',
                fontFamily: FONT_UTILITY_STACK,
                fontSize: '0.65rem',
                color: cssVar.inkMuted,
              }}>
                {HEX[key]}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{
        ...section,
        marginBottom: '2rem',
        fontFamily: FONT_UTILITY_STACK,
        fontSize: '0.72rem',
        color: cssVar.inkMuted,
      }}>
        Source of truth: <code style={{ color: cssVar.ink }}>src/theme/colors.ts</code>
        {' · '}
        <code style={{ color: cssVar.ink }}>src/theme/fonts.ts</code>
        {' · '}
        <code style={{ color: cssVar.ink }}>.pncore-design.md</code>
      </footer>
    </main>
  )
}
