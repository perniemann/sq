/** Map: routes, phase machine, input, PARS-11, principles. */
import type { ReactElement } from 'react'
import { cssVar } from '../../theme/colors'
import { InputDiagram } from './components/InputDiagram'
import { PhaseDiagram } from './components/PhaseDiagram'
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

function H3({ children }: { children: ReactElement | string }): ReactElement {
  return (
    <h3
      style={{
        margin: '0 0 10px',
        fontFamily: drFontDisplay,
        fontSize: 15,
        fontWeight: 700,
        color: cssVar.player,
      }}
    >
      {children}
    </h3>
  )
}

export function MapSection(): ReactElement {
  return (
    <RefSection id="dr-map" title="Map" kicker="Orientation">
      <p style={{ ...drHint, marginTop: 0, marginBottom: 28, maxWidth: '65ch' }}>
        Browser-only WSF court, Rapier physics, PARS-11 best-of-3. Two routes:{' '}
        <code style={{ color: cssVar.ink }}>/</code> is the game (Canvas + Rapier),{' '}
        <code style={{ color: cssVar.ink }}>/design</code> is this catalog — no physics,
        real screenshots instead.
      </p>

      <H3>Phase machine</H3>
      <p style={{ ...drHint, marginTop: 0, marginBottom: 16 }}>
        The state machine driving every screen in Play. String union in{' '}
        <code>src/stores/gameStore.ts</code>; transitions wired in{' '}
        <code>usePhaseInput</code> and <code>awardPointTo</code>.
      </p>
      <div style={{ marginBottom: 32 }}>
        <PhaseDiagram />
      </div>

      <H3>Two-button input</H3>
      <p style={{ ...drHint, marginTop: 0, marginBottom: 16 }}>
        The entire control surface. No third button, no combo inputs, no mouse aim —
        keyboard and touch both call the same <code>pressButtonAction</code> /{' '}
        <code>releaseButtonAction</code> handlers.
      </p>
      <div style={{ marginBottom: 32 }}>
        <InputDiagram />
      </div>

      <H3>PARS-11</H3>
      <p style={{ ...drHint, marginTop: 0, marginBottom: 32, maxWidth: '65ch' }}>
        Point-a-Rally Scoring to 11, best of 3 games (first to 2). Must win by 2 from
        10–10. Rules logic follows WSF/PARS references — verified before changing scoring
        or serve behaviour.
      </p>

      <H3>Principles</H3>
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

      <p
        style={{
          margin: '28px 0 0',
          fontFamily: drFontUtility,
          fontSize: 12,
          color: cssVar.inkMuted,
        }}
      >
        No secrets in this catalog — every claim above cites the file that backs it.
      </p>
    </RefSection>
  )
}
