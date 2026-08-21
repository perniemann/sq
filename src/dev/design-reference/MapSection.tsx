/** Map: routes, phase machine, input, PARS-11, principles. */
import type { ReactElement } from 'react'
import { cssVar } from '../../theme/colors'
import { RefSection } from './components/RefSection'
import { drFontDisplay, drFontUtility, drHint } from './drStyles'

const PRINCIPLES = [
  {
    title: 'Court is the composition',
    body: 'Diegetic WorldHud lives on the front wall. DOM is aria-live + invisible touch zones — never a second HUD competing with the court.',
  },
  {
    title: 'Two buttons, many meanings',
    body: 'Space (A) and Shift (B) remap by phase via usePhaseInput. Never bind game logic to raw key events or touch is skipped.',
  },
  {
    title: 'Identity accents, not rainbow UI',
    body: 'Void substrate + near-white lines. Player cyan / opponent orange / ball hotter orange. Magenta only for match point.',
  },
  {
    title: 'Motion for feedback, not noise',
    body: 'Charge, chase, callouts, bloom. Prefer reduced-motion respect; avoid infinite decorative loops on start.',
  },
] as const

const PHASES = [
  { id: 'idle', note: 'Title lockup · Space starts' },
  { id: 'serving', note: 'Service · charge / aim / release' },
  { id: 'rally', note: 'Exchange · Space shot · Shift chase' },
  { id: 'point', note: 'Callout · advance to next' },
  { id: 'gameOver', note: 'Game won · next game' },
  { id: 'matchOver', note: 'Match result · restart' },
] as const

export function MapSection(): ReactElement {
  return (
    <RefSection id="dr-map" title="Map" kicker="Orientation">
      <p style={{ ...drHint, marginTop: 0, marginBottom: 24 }}>
        Public surface for sq_ — browser-only WSF court, Rapier physics, PARS-11
        best-of-3. This catalog is the design system; the game at{' '}
        <a href="/" style={{ color: cssVar.player }}>
          /
        </a>{' '}
        is play.
      </p>

      <h3
        style={{
          margin: '0 0 10px',
          fontFamily: drFontDisplay,
          fontSize: 15,
          fontWeight: 700,
          color: cssVar.player,
        }}
      >
        Routes
      </h3>
      <ul
        style={{
          margin: '0 0 28px',
          paddingLeft: 18,
          fontFamily: drFontUtility,
          fontSize: 13,
          color: cssVar.inkMuted,
          lineHeight: 1.65,
        }}
      >
        <li>
          <code style={{ color: cssVar.ink }}>/</code> — full game (Canvas + Rapier)
        </li>
        <li>
          <code style={{ color: cssVar.ink }}>/design</code> — this catalog (no physics)
        </li>
      </ul>

      <h3
        style={{
          margin: '0 0 10px',
          fontFamily: drFontDisplay,
          fontSize: 15,
          fontWeight: 700,
          color: cssVar.player,
        }}
      >
        Phase machine
      </h3>
      <p style={{ ...drHint, marginTop: 0, marginBottom: 12 }}>
        Zustand string-union in <code>src/stores/gameStore.ts</code>. Button A
        semantics live in <code>usePhaseInput</code>.
      </p>
      <ol
        style={{
          margin: '0 0 28px',
          paddingLeft: 18,
          fontFamily: drFontUtility,
          fontSize: 13,
          color: cssVar.inkMuted,
          lineHeight: 1.7,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {PHASES.map((p, i) => (
          <li
            key={p.id}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'baseline',
            }}
          >
            <span style={{ color: cssVar.inkMuted, width: 18 }}>{i + 1}.</span>
            <code style={{ color: cssVar.ink }}>{p.id}</code>
            <span>{p.note}</span>
          </li>
        ))}
      </ol>

      <h3
        style={{
          margin: '0 0 10px',
          fontFamily: drFontDisplay,
          fontSize: 15,
          fontWeight: 700,
          color: cssVar.player,
        }}
      >
        Two-button input
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            padding: '12px 0',
            borderTop: `1px solid color-mix(in oklch, ${cssVar.inkMuted} 28%, transparent)`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: drFontDisplay,
              fontWeight: 700,
              color: cssVar.ink,
              fontSize: 14,
            }}
          >
            A · Space / right touch
          </p>
          <p style={{ ...drHint, margin: '6px 0 0' }}>
            Charge-and-release shot (serve & rally). While held: aim X, attack
            plane Y. Idle / advance / restart by phase.
          </p>
        </div>
        <div
          style={{
            padding: '12px 0',
            borderTop: `1px solid color-mix(in oklch, ${cssVar.inkMuted} 28%, transparent)`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: drFontDisplay,
              fontWeight: 700,
              color: cssVar.ink,
              fontSize: 14,
            }}
          >
            B · Shift / left touch
          </p>
          <p style={{ ...drHint, margin: '6px 0 0' }}>
            Chase — burst toward the ball when returnable. Same registration path as
            keyboard via <code>pressButtonAction</code>.
          </p>
        </div>
      </div>

      <h3
        style={{
          margin: '0 0 10px',
          fontFamily: drFontDisplay,
          fontSize: 15,
          fontWeight: 700,
          color: cssVar.player,
        }}
      >
        PARS-11
      </h3>
      <p style={{ ...drHint, marginTop: 0, marginBottom: 28, maxWidth: '65ch' }}>
        Point-a-Rally Scoring to 11, best of 3 games (first to 2). Must win by 2
        from 10–10. Rules logic follows WSF/PARS — verify before changing scoring
        or serve behaviour.
      </p>

      <h3
        style={{
          margin: '0 0 14px',
          fontFamily: drFontDisplay,
          fontSize: 15,
          fontWeight: 700,
          color: cssVar.player,
        }}
      >
        Principles
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 20,
        }}
      >
        {PRINCIPLES.map((p) => (
          <article key={p.title}>
            <h4
              style={{
                margin: 0,
                fontFamily: drFontDisplay,
                fontSize: 14,
                fontWeight: 700,
                color: cssVar.ink,
              }}
            >
              {p.title}
            </h4>
            <p style={{ ...drHint, margin: '8px 0 0' }}>{p.body}</p>
          </article>
        ))}
      </div>
    </RefSection>
  )
}
