import type { ReactElement } from 'react'
import { cssVar } from '../theme/colors'
import { ScoreboardPlayMark } from './Scoreboard'

export type TinGameplayProps = {
  phase: string
  gamePointLabel: 'GAME POINT' | 'MATCH POINT' | null
  advancePrompt: string | null
  teachLabel: string | null
  matchResult: 'VICTORY' | 'DEFEAT' | null
  matchResultPlayerWon: boolean
  callout: string | null
  calloutTone: 'ink' | 'player' | 'opponent' | null
}

/**
 * Former center / under-scoreboard gameplay chrome — tin centre column only.
 * Styles match the pre-diegetic HUD (moved, not redesigned).
 */
export function TinGameplay({
  phase,
  gamePointLabel,
  advancePrompt,
  teachLabel,
  matchResult,
  matchResultPlayerWon,
  callout,
  calloutTone,
}: TinGameplayProps): ReactElement {
  const calloutColor =
    calloutTone === 'player'
      ? cssVar.player
      : calloutTone === 'opponent'
        ? cssVar.opponent
        : cssVar.ink
  const calloutGlow =
    calloutTone === 'player'
      ? cssVar.glowPlayer
      : calloutTone === 'opponent'
        ? cssVar.glowOpponent
        : cssVar.glowInk

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      fontFamily: 'monospace',
      pointerEvents: 'none',
      minWidth: '12rem',
    }}>
      {gamePointLabel && (
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 'bold',
          color: gamePointLabel === 'MATCH POINT' ? cssVar.matchPoint : cssVar.gamePoint,
          textShadow: gamePointLabel === 'MATCH POINT' ? cssVar.glowMatch : cssVar.glowGame,
          animation: 'pulse 0.8s ease-in-out infinite',
          letterSpacing: '0.15em',
          marginBottom: '6px',
        }}>
          {gamePointLabel}
        </div>
      )}

      {callout && (
        <div style={{
          fontSize: callout.length > 8 ? '1.6rem' : '2.4rem',
          fontWeight: 'bold',
          color: calloutColor,
          textShadow: calloutGlow,
          animation: phase === 'rally' ? 'fadeOut 1.5s ease-out forwards' : 'pointFlash 0.5s ease-out',
          letterSpacing: '0.04em',
        }}>
          {callout}
        </div>
      )}

      {matchResult && (
        <div style={{
          marginTop: callout ? '8px' : 0,
          fontSize: '1rem',
          fontWeight: 'bold',
          color: matchResultPlayerWon ? cssVar.player : cssVar.opponent,
          textShadow: matchResultPlayerWon ? cssVar.glowPlayer : cssVar.glowOpponent,
          letterSpacing: '0.12em',
        }}>
          {matchResult}
        </div>
      )}

      {advancePrompt && (
        <div style={{
          marginTop: '8px',
          fontSize: '0.7rem',
          color: cssVar.inkMuted,
          letterSpacing: '0.12em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.35em',
        }}>
          {phase === 'idle' && <ScoreboardPlayMark fontSize="0.85em" tone="opponent" cue />}
          <span>{advancePrompt}</span>
          {phase === 'idle' && <ScoreboardPlayMark fontSize="0.85em" tone="opponent" cue mirror />}
        </div>
      )}

      {!advancePrompt && teachLabel && (
        <div
          aria-hidden="true"
          style={{
            marginTop: '8px',
            fontSize: '0.68rem',
            color: cssVar.inkMuted,
            letterSpacing: '0.1em',
            textAlign: 'center',
            opacity: 0.9,
          }}
        >
          {teachLabel}
        </div>
      )}

      <style>{`
        @keyframes fadeOut {
          0% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(1); }
        }
        @keyframes pointFlash {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.72; }
          50% { opacity: 1; }
        }
        @keyframes startLightPulse {
          0%, 100% { opacity: 0.62; filter: brightness(0.88); }
          50% { opacity: 1; filter: brightness(1.12); }
        }
        .start-play-cue {
          animation: startLightPulse 1.8s ease-in-out infinite;
          text-shadow: none;
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .start-play-cue {
            animation: none !important;
            filter: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
