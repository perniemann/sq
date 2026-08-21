import type { ReactElement } from 'react'
import { BOUNCE_PROFILES } from '../../config'
import { COMPONENT_MANIFEST } from './component-manifest'
import { FoundationsSection } from './FoundationsSection'
import { LabeledBlock } from './LabeledBlock'
import { RefSection } from './components/RefSection'
import { drFontUtility, drHint } from './drStyles'
import { cssVar } from '../../theme/colors'

export function SystemSection(): ReactElement {
  const excluded = COMPONENT_MANIFEST.filter((e) => e.kind === 'excluded')

  return (
    <RefSection id="dr-system" title="System" kicker="Tokens · anatomy · exclusions">
      <p style={{ ...drHint, marginTop: 0, marginBottom: 24 }}>
        Foundations (HEX, CSS, type) plus WorldHud anatomy and modules that cannot
        mount here without Canvas / Physics.
      </p>

      <FoundationsSection nested />

      <LabeledBlock
        title="WorldHud anatomy"
        path="src/components/WorldHud.tsx · systems/worldHudLayout.ts · systems/hudCopy.ts"
        hint="Diegetic match UI on the front wall (troika Text). Layout helpers + copy stay pure; colors from HEX / fonts from theme/fonts.ts."
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
          <li>Left / right score columns with games-won pips and turn chevrons</li>
          <li>Centre tin: callouts, game/match point, advance / teach prompts</li>
          <li>DOM Scoreboard + TinGameplay fixtures in Kit mirror this grammar</li>
          <li>
            <code>ui/HUD.tsx</code> is aria-live only;{' '}
            <code>TouchControls</code> is an invisible input layer
          </li>
        </ul>
      </LabeledBlock>

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
    </RefSection>
  )
}
