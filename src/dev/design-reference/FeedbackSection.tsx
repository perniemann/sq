import type { ReactElement } from 'react'
import { cssVar, HEX } from '../../theme/colors'
import { EvidenceBadge } from './components/EvidenceBadge'
import { RefSection } from './components/RefSection'
import { LabeledBlock } from './LabeledBlock'
import { drFontDisplay, drFontUtility, drHint } from './drStyles'

const CHARGE_PHASES = [
  { id: 'racquetPrep', note: 'Backswing begins' },
  { id: 'bodyCoil', note: 'Body loads' },
  { id: 'powerLoad', note: 'Full charge window' },
  { id: 'followThrough', note: 'Release follow-through' },
] as const

const FEEDBACK_ROWS = [
  {
    title: 'Charge (button A hold)',
    path: 'hooks/useInput.ts · useChargePhase',
    body: 'Hold duration maps to power / length only. Aim (A·D / drag X) and attack plane (W·S / drag Y) are separate axes while held.',
    source: 'fixture' as const,
  },
  {
    title: 'Chase (button B)',
    path: 'hooks/useChase · pressButtonAction',
    body: 'Burst toward the ball when returnable. Same action path for keyboard and touch.',
    source: 'fixture' as const,
  },
  {
    title: 'Tin / score / turn marks',
    path: 'components/WorldHud.tsx · ui/Scoreboard.tsx',
    body: 'Diegetic tin grammar on the front wall. DOM Scoreboard fixtures mirror the same scores, games-won pips, and turn chevrons.',
    source: 'live-stub' as const,
  },
  {
    title: 'Ball tint · canHit',
    path: 'systems/returnability.ts · gameStore.canHit',
    body: 'Returnability restores on front-wall contact (WSF 6.2), not side/back alone. Ball mesh tints to striker colour when hittable.',
    source: 'fixture' as const,
  },
  {
    title: 'Callouts',
    path: 'ui/TinGameplay.tsx · systems/hudCopy.ts',
    body: 'WIN / FAULT / LET and game/match point labels. Tone follows striker or match result identity.',
    source: 'fixture' as const,
  },
  {
    title: 'Bloom',
    path: 'App.tsx · config.displayAlpha',
    body: 'On by default (?nobloom to compare). Authored opacities go through displayAlpha for the postprocessing composer.',
    source: 'fixture' as const,
  },
  {
    title: 'Reduced motion',
    path: 'ui/StartLockup.tsx',
    body: 'StartReveal respects prefers-reduced-motion. Prefer one-shot reveals over infinite decorative loops.',
    source: 'fixture' as const,
  },
] as const

function Swatch({
  label,
  color,
}: {
  label: string
  color: string
}): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: drFontUtility,
        fontSize: 12,
        color: cssVar.inkMuted,
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 12px color-mix(in oklch, ${color} 55%, transparent)`,
          border: `1px solid color-mix(in oklch, ${cssVar.inkMuted} 40%, transparent)`,
          flexShrink: 0,
        }}
      />
      {label}
    </div>
  )
}

export function FeedbackSection(): ReactElement {
  return (
    <RefSection id="dr-feedback" title="Feedback" kicker="Signals">
      <p style={{ ...drHint, marginTop: 0, marginBottom: 20 }}>
        Inventory of play feedback — charge, chase, tin, returnability, callouts,
        bloom, motion. Specimens that mount live in Kit; WorldHud stays excluded
        from Canvas mounts.
      </p>

      <LabeledBlock
        title="Charge phases"
        path="stores/gameStore.ts ChargePhase · hooks/useInput.ts"
        hint="Hold progresses racquetPrep → bodyCoil → powerLoad; followThrough on release."
      >
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <EvidenceBadge source="fixture" />
        </div>
        <ol
          style={{
            margin: 0,
            paddingLeft: 18,
            fontFamily: drFontUtility,
            fontSize: 13,
            color: cssVar.inkMuted,
            lineHeight: 1.65,
          }}
        >
          {CHARGE_PHASES.map((p) => (
            <li key={p.id} style={{ marginBottom: 4 }}>
              <code style={{ color: cssVar.ink }}>{p.id}</code>
              {' — '}
              {p.note}
            </li>
          ))}
        </ol>
      </LabeledBlock>

      <LabeledBlock
        title="Tin danger flash"
        path="systems/court.ts tinAccentColor · --color-tin-danger"
        hint="After a tin hit, court tin line flashes opponent-warm danger colour for TIN_HIT_FLASH_MS, then returns to court-line white."
      >
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <EvidenceBadge source="fixture" />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          <Swatch label="Tin idle (court line)" color={HEX.courtLine} />
          <Swatch label="Tin danger flash" color={HEX.tinDanger} />
        </div>
      </LabeledBlock>

      <LabeledBlock
        title="Ball striker tint"
        path="components/Ball.tsx · canHit"
        hint="When returnable, ball mesh reads player cyan or opponent orange — not a separate halo."
      >
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <EvidenceBadge source="fixture" />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          <Swatch label="Player returnable" color={HEX.player} />
          <Swatch label="Opponent returnable" color={HEX.opponent} />
          <Swatch label="Ball (hotter)" color={HEX.ball} />
        </div>
      </LabeledBlock>

      {FEEDBACK_ROWS.map((row) => (
        <LabeledBlock
          key={row.title}
          title={row.title}
          path={row.path}
          hint={row.body}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <EvidenceBadge source={row.source} />
            <span
              style={{
                fontFamily: drFontUtility,
                fontSize: 12,
                color: cssVar.inkMuted,
              }}
            >
              Documented signal — see Kit for mountable fixtures
            </span>
          </div>
        </LabeledBlock>
      ))}

      <p
        style={{
          margin: '8px 0 0',
          fontFamily: drFontDisplay,
          fontSize: 12,
          color: cssVar.inkMuted,
        }}
      >
        Pattern: utility mono CTAs on void · cool/warm score pair · tin danger only as a
        timed flash (not a permanent chrome accent).
      </p>
    </RefSection>
  )
}
