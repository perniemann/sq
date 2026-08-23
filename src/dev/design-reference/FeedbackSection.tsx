import type { ReactElement } from 'react'
import { cssVar } from '../../theme/colors'
import { BeforeAfter } from './components/BeforeAfter'
import { EvidenceBadge } from './components/EvidenceBadge'
import { RefSection } from './components/RefSection'
import { LabeledBlock } from './LabeledBlock'
import { drFontDisplay, drFontUtility, drHint } from './drStyles'

export function FeedbackSection(): ReactElement {
  return (
    <RefSection id="dr-feedback" title="Feedback" kicker="Triggered / before-after">
      <p style={{ ...drHint, marginTop: 0, marginBottom: 24 }}>
        Every mechanic below is two real captures of the same camera position, one state
        apart — not a description standing alone.
      </p>

      <LabeledBlock
        title="Charge (button A hold)"
        path="hooks/useInput.ts · useChargePhase"
        hint="Hold duration maps to power / length only. Aim (A·D / drag X) and attack plane (W·S / drag Y) are separate axes while held — visible here as the racquet swinging further back and the aim readout appearing."
      >
        <BeforeAfter
          before={{
            imageSrc: '/design-media/capture-charge-prep.png',
            label: '0.15s held',
            alt: 'Player winding up a shot, racquet just starting to draw back',
          }}
          after={{
            imageSrc: '/design-media/capture-charge-power.png',
            label: '0.6s held',
            alt: 'Player at full charge, racquet drawn back further with an aim readout visible',
          }}
        />
      </LabeledBlock>

      <LabeledBlock
        title="Tin fault flash"
        path="components/Court.tsx tinHitAt · components/WorldHud.tsx"
        hint="The scoreboard band sits directly on the tin (systems/court.ts tinHeight) — the same wall panel that just took the fault flashes opponent-warm, then returns to court-line white. This is the diegetic-HUD claim made literal: score and fault indicator share one surface."
      >
        <BeforeAfter
          before={{
            imageSrc: '/design-media/capture-tin-idle.png',
            label: 'idle',
            alt: 'Close view of the tin band showing the scoreboard at rest',
          }}
          after={{
            imageSrc: '/design-media/capture-tin-flash.png',
            label: 'on tin fault',
            alt: 'Same tin band flashing orange after a tin fault',
          }}
        />
      </LabeledBlock>

      <LabeledBlock
        title="Returnability (canHit) & turn"
        path="systems/returnability.ts · gameStore.canHit"
        hint="Returnability restores on front-wall contact (WSF 6.2), not side/back alone. When it's your turn: the aim line and turn chevron switch to your identity colour, and the ball itself carries a brief tint pulse toward that colour."
      >
        <BeforeAfter
          before={{
            imageSrc: '/design-media/capture-ball-off.png',
            label: "opponent's turn, not returnable",
            alt: 'Serve position with the opponent turn marker and a dim aim line',
          }}
          after={{
            imageSrc: '/design-media/capture-ball-on.png',
            label: 'your turn, returnable',
            alt: 'Same serve position with the player turn marker and a bright cyan aim line',
          }}
        />
      </LabeledBlock>

      <LabeledBlock
        title="Bloom"
        path="App.tsx · config.displayAlpha"
        hint="On by default — ACES tone mapping after an intensity-1.0 bloom pass. ?nobloom removes the postprocessing composer outright for comparison; every other value in the scene is unchanged between these two frames."
      >
        <BeforeAfter
          before={{
            imageSrc: '/design-media/capture-rally.png',
            label: 'bloom on (default)',
            alt: 'Rally frame with soft glow around the court lines and HUD',
          }}
          after={{
            imageSrc: '/design-media/capture-bloom-off.png',
            label: '?nobloom',
            alt: 'Same rally frame with the glow removed, lines crisp',
          }}
        />
      </LabeledBlock>

      <LabeledBlock
        title="Callouts"
        path="ui/TinGameplay.tsx · systems/hudCopy.ts"
        hint={
          'WIN / FAULT / DOUBLE BOUNCE / VICTORY — tone follows striker or match-result identity. Already visible across the point, tin, gameOver, and matchOver frames in Play above; not repeated here.'
        }
      >
        <EvidenceBadge source="capture" />
      </LabeledBlock>

      <LabeledBlock
        title="Chase (button B)"
        path="components/Scene.tsx isChasing · components/Player.tsx"
        hint="Burst toward the ball when it's returnable. This is a movement-speed change over time, not a shape or colour change a single frame can show — two stills a moment apart look almost identical because the difference is how fast the player closes, not how they look. The two-button diagram in Map documents the mechanic; no before/after pair is shown here for that reason."
      >
        <EvidenceBadge source="fixture" />
      </LabeledBlock>

      <LabeledBlock
        title="Reduced motion"
        path="ui/StartLockup.tsx · ui/TinGameplay.tsx · components/Ball.tsx"
        hint="prefers-reduced-motion suppresses reveal animations, the ball trail, hit pulses, and impact markers — the visible result is an absence of motion, which a still image can't demonstrate either way. Verified by reading the media query in each file listed."
      >
        <EvidenceBadge source="live-stub" />
      </LabeledBlock>

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
      <p
        style={{
          margin: '6px 0 0',
          fontFamily: drFontUtility,
          fontSize: 11,
          color: cssVar.inkMuted,
        }}
      >
        Captured with <code>scripts/capture-design-media.mjs</code> by driving the
        Zustand stores directly, not by playing — see that script for the one
        environment constraint on capture timing.
      </p>
    </RefSection>
  )
}
