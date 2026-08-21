import type { ReactElement } from 'react'
import { BOUNCE_PROFILES } from '../../config'
import { COMPONENT_MANIFEST } from './component-manifest'
import { LabeledBlock, Section } from './LabeledBlock'
import { drFontUtility, drHint } from './drStyles'
import { cssVar } from '../../theme/colors'

export function SystemSection(): ReactElement {
  const excluded = COMPONENT_MANIFEST.filter((e) => e.kind === 'excluded')

  return (
    <Section id="dr-system" title="System & excluded modules">
      <LabeledBlock
        title="Bloom & display alpha"
        path="src/App.tsx · src/config.ts"
        hint="Bloom is on by default; append ?nobloom to compare. Authored opacities go through displayAlpha for the postprocessing composer."
      >
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontFamily: drFontUtility,
            fontSize: 13,
            color: cssVar.inkMuted,
            lineHeight: 1.6,
            maxWidth: '65ch',
          }}
        >
          <li>
            Bloom: intensity 1.0, luminanceThreshold 0.45, LARGE kernel; ACES tone mapping
            after bloom.
          </li>
          <li>
            <code>displayAlpha(a)</code> converts sRGB-authored opacity to linear space for
            the composer.
          </li>
        </ul>
      </LabeledBlock>

      <LabeledBlock
        title="Bounce profiles"
        path="src/config.ts"
        hint="Override at runtime with ?bounce=arcade or ?bounce=realistic."
      >
        <div style={{ fontFamily: drFontUtility, fontSize: 12, color: cssVar.inkMuted }}>
          {Object.entries(BOUNCE_PROFILES).map(([name, coeffs]) => (
            <div key={name} style={{ padding: '6px 0' }}>
              <strong style={{ color: cssVar.player }}>{name}</strong>
              {': '}
              ball {coeffs.ball} · floor {coeffs.floor} · wall {coeffs.wall}
            </div>
          ))}
        </div>
      </LabeledBlock>

      <LabeledBlock
        title="Diegetic WorldHud"
        path="src/components/WorldHud.tsx"
        hint="Match UI lives on the front wall (troika Text). DOM HUD is aria-live only; TouchControls is an invisible input layer."
      >
        <p style={{ ...drHint, margin: 0 }}>
          Layout helpers: <code>systems/worldHudLayout.ts</code>. Copy:{' '}
          <code>systems/hudCopy.ts</code>. Colors from HEX / fonts from{' '}
          <code>theme/fonts.ts</code>.
        </p>
      </LabeledBlock>

      <LabeledBlock
        title="Excluded from live specimens"
        path="src/dev/design-reference/component-manifest.ts"
        hint="These modules need Canvas, Physics, or are intentionally invisible."
      >
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontFamily: drFontUtility,
            fontSize: 12,
            color: cssVar.inkMuted,
            lineHeight: 1.55,
          }}
        >
          {excluded.map((e) => (
            <li key={e.file} style={{ marginBottom: 8 }}>
              <code style={{ color: cssVar.ink }}>{e.file}</code>
              {e.reason ? ` — ${e.reason}` : null}
            </li>
          ))}
        </ul>
      </LabeledBlock>
    </Section>
  )
}
