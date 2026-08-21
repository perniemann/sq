import type { ReactElement } from 'react'
import { cssVar } from '../../theme/colors'
import { StartLockup } from '../../ui/StartLockup'
import { Scoreboard, ScoreboardPlayMark } from '../../ui/Scoreboard'
import { TinGameplay } from '../../ui/TinGameplay'
import { LabeledBlock, Section } from './LabeledBlock'
import { drFontUtility, drHint } from './drStyles'

/** Static aria-live stub — does not mount store-bound HUD.tsx. */
function AriaLiveStub(): ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        fontFamily: drFontUtility,
        fontSize: 13,
        color: cssVar.inkMuted,
        maxWidth: '65ch',
        lineHeight: 1.45,
      }}
    >
      Sample live region: Player to serve · 3–2 · chase when ready
    </div>
  )
}

/** ErrorBoundary fallback chrome without throwing (static fixture). */
function ErrorFallbackSpecimen(): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        minHeight: 120,
        background: cssVar.void,
        color: cssVar.opponent,
        fontFamily: drFontUtility,
        fontSize: 14,
        border: `1px solid color-mix(in oklch, ${cssVar.opponent} 35%, transparent)`,
      }}
    >
      <div style={{ marginBottom: 12, fontWeight: 'bold' }}>
        Something went wrong
      </div>
      <div style={{ maxWidth: 480, wordBreak: 'break-word', textAlign: 'center' }}>
        Specimen message — not a live error
      </div>
    </div>
  )
}

export function SpecimensSection(): ReactElement {
  return (
    <Section id="dr-specimens" title="DOM specimens">
      <p style={{ ...drHint, marginTop: 0, marginBottom: 8 }}>
        Static fixtures only. Live HUD binds the game store and is listed under System
        as excluded.
      </p>

      <LabeledBlock
        title="StartLockup"
        path="src/ui/StartLockup.tsx"
        hint="Idle / demo title lockup — Chakra Petch wordmark + version + start prompt."
      >
        <div style={{ padding: '16px 0' }}>
          <StartLockup
            versionLabel="0.1.2"
            startLabel="PRESS SPACE"
            startA11y="Press Space to start"
          />
        </div>
      </LabeledBlock>

      <LabeledBlock
        title="Scoreboard"
        path="src/ui/Scoreboard.tsx"
        hint="Point scores, games-won pips, turn chevrons (player cyan / opponent orange)."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '8px 0' }}>
          <Scoreboard
            score={{ player: 7, opponent: 5 }}
            gamesWon={{ player: 1, opponent: 0 }}
            gamesToWin={2}
            showTurnIndicator
            currentStriker="player"
          />
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <ScoreboardPlayMark />
            <ScoreboardPlayMark tone="opponent" mirror />
            <ScoreboardPlayMark outline cue />
          </div>
        </div>
      </LabeledBlock>

      <LabeledBlock
        title="TinGameplay"
        path="src/ui/TinGameplay.tsx"
        hint="Center column callouts — game/match point, point flash, advance / teach prompts."
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 32,
            padding: '12px 0',
            alignItems: 'flex-start',
          }}
        >
          <TinGameplay
            phase="point"
            gamePointLabel="GAME POINT"
            advancePrompt={null}
            teachLabel={null}
            matchResult={null}
            matchResultPlayerWon={false}
            callout="WIN"
            calloutTone="player"
          />
          <TinGameplay
            phase="idle"
            gamePointLabel={null}
            advancePrompt="PRESS SPACE"
            teachLabel={null}
            matchResult={null}
            matchResultPlayerWon={false}
            callout={null}
            calloutTone={null}
          />
          <TinGameplay
            phase="matchOver"
            gamePointLabel="MATCH POINT"
            advancePrompt={null}
            teachLabel={null}
            matchResult="VICTORY"
            matchResultPlayerWon
            callout={null}
            calloutTone={null}
          />
        </div>
      </LabeledBlock>

      <LabeledBlock
        title="ErrorBoundary fallback"
        path="src/components/ErrorBoundary.tsx"
        hint="Fallback UI chrome only — does not throw inside the catalog."
      >
        <ErrorFallbackSpecimen />
      </LabeledBlock>

      <LabeledBlock
        title="Aria-live stub"
        path="src/ui/HUD.tsx (excluded — stub only)"
        hint="Screen-reader live region pattern. Visible match UI is diegetic WorldHud."
      >
        <AriaLiveStub />
      </LabeledBlock>
    </Section>
  )
}
