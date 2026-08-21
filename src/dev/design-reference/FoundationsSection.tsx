import type { ReactElement } from 'react'
import { cssVar } from '../../theme/colors'
import {
  COLOR_CSS_VARS,
  FONT_ROLES,
  GLOW_CSS_VARS,
  HEX_ENTRIES,
} from './designTokenLists'
import { LabeledBlock, Section } from './LabeledBlock'
import {
  drFeatured,
  drFontDisplay,
  drFontUtility,
  drHint,
} from './drStyles'

function SwatchRow({
  name,
  value,
  isCssVar,
}: {
  name: string
  value: string
  isCssVar?: boolean
}): ReactElement {
  const isGlow = name.startsWith('--glow') || name.startsWith('glow')
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
        padding: '8px 0',
        borderBottom: `1px solid color-mix(in oklch, ${cssVar.inkMuted} 20%, transparent)`,
        fontFamily: drFontUtility,
        fontSize: 12,
      }}
    >
      <code
        style={{
          width: 200,
          flexShrink: 0,
          color: cssVar.inkMuted,
          wordBreak: 'break-all',
        }}
      >
        {name}
      </code>
      {isGlow ? (
        <div
          style={{
            width: 48,
            height: 28,
            borderRadius: 2,
            background: cssVar.ink,
            boxShadow: isCssVar ? `var(${name})` : value,
          }}
          title={value}
        />
      ) : (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 2,
            border: `1px solid color-mix(in oklch, ${cssVar.inkMuted} 40%, transparent)`,
            background: isCssVar ? `var(${name})` : value,
            flexShrink: 0,
          }}
          title={value}
        />
      )}
      <span style={{ color: cssVar.inkMuted, wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  )
}

export function FoundationsSection(): ReactElement {
  return (
    <Section id="dr-foundations" title="Foundations: tokens & typography">
      <div style={drFeatured}>
        <LabeledBlock
          title="HEX tokens"
          path="src/theme/colors.ts"
          hint="Gameplay source of truth for Three meshBasicMaterial. Court substrate is black/white; cyan/orange are identity accents only."
        >
          <div>
            {HEX_ENTRIES.map(([key, value]) => (
              <SwatchRow key={key} name={`HEX.${key}`} value={value} />
            ))}
          </div>
        </LabeledBlock>
      </div>

      <LabeledBlock
        title="CSS color variables"
        path="src/theme/tokens.css"
        hint="DOM mirror of HEX; OKLCH where supported with hex fallbacks."
      >
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {COLOR_CSS_VARS.map((name) => (
            <SwatchRow
              key={name}
              name={name}
              value={`var(${name})`}
              isCssVar
            />
          ))}
        </div>
      </LabeledBlock>

      <LabeledBlock title="Glow tokens" path="src/theme/tokens.css">
        <div>
          {GLOW_CSS_VARS.map((name) => (
            <SwatchRow key={name} name={name} value={`var(${name})`} isCssVar />
          ))}
        </div>
      </LabeledBlock>

      <LabeledBlock
        title="Typography"
        path="src/theme/fonts.ts"
        hint="Diegetic WorldHud uses troika Text with these faces. Catalog DOM uses the same families via @fontsource."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {FONT_ROLES.map((row) => (
            <div key={row.role}>
              <p style={{ ...drHint, margin: 0 }}>
                {row.role} — {row.face}: {row.usage}
              </p>
              <p
                style={{
                  margin: '8px 0 0',
                  fontFamily: row.css,
                  fontWeight: row.weight,
                  fontSize: row.role === 'Display' ? 28 : 16,
                  color: cssVar.ink,
                }}
              >
                sq_ · charge · return · PARS-11
              </p>
            </div>
          ))}
          <p
            style={{
              margin: 0,
              fontFamily: drFontDisplay,
              fontSize: 13,
              color: cssVar.inkMuted,
              maxWidth: '65ch',
            }}
          >
            Rhythm: hairline separators, ~65ch prose, no card chrome. Dark-only —
            void substrate is the brand.
          </p>
        </div>
      </LabeledBlock>
    </Section>
  )
}
