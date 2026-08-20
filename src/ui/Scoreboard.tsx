import type { CSSProperties, ReactElement } from 'react'
import { cssVar } from '../theme/colors'

/** ▶/◀ mark matching scoreboard turn chevrons (`player` cyan / `opponent` orange). */
export function ScoreboardPlayMark(props: {
  fontSize?: string
  marginTop?: string
  tone?: 'player' | 'opponent'
  /** Soft light-intensity pulse — Delight/Orient for the start CTA only. */
  cue?: boolean
  /** Point left (◀) instead of right (▶). */
  mirror?: boolean
  /** Stroke-only triangle (PRESS SPACE flanking marks). */
  outline?: boolean
}): ReactElement {
  const tone = props.tone ?? 'player'
  const ink = tone === 'opponent' ? cssVar.opponent : cssVar.player
  return (
    <span
      aria-hidden="true"
      className={props.cue ? 'start-play-cue' : undefined}
      style={{
        fontSize: props.fontSize ?? '1.2rem',
        color: props.outline ? 'transparent' : ink,
        WebkitTextStroke: props.outline ? `1.35px ${ink}` : undefined,
        textShadow: props.cue || props.outline
          ? 'none'
          : tone === 'opponent' ? cssVar.glowOpponent : cssVar.glowPlayer,
        lineHeight: 1,
        marginTop: props.marginTop,
        display: 'inline-block',
      }}
    >
      {props.mirror ? '◀' : '▶'}
    </span>
  )
}

export type ScoreboardProps = {
  score: { player: number; opponent: number }
  gamesWon: { player: number; opponent: number }
  gamesToWin: number
  showTurnIndicator: boolean
  currentStriker: 'player' | 'opponent'
  /** Dim in demo — same as the old overlay. */
  dimmed?: boolean
  style?: CSSProperties
}

/** Exact pre-diegetic scoreboard row — moved, not redesigned. */
export function Scoreboard({
  score,
  gamesWon,
  gamesToWin,
  showTurnIndicator,
  currentStriker,
  dimmed = false,
  style,
}: ScoreboardProps): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'monospace',
        color: cssVar.ink,
        opacity: dimmed ? 0.8 : 1,
        transition: 'opacity 0.3s ease',
        ...style,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
      }}>
        <span style={{
          opacity: showTurnIndicator && currentStriker === 'player' ? 0.9 : 0,
          transition: 'opacity 0.15s',
        }}>
          <ScoreboardPlayMark marginTop="0.6rem" />
        </span>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <span style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            color: cssVar.player,
            textShadow: cssVar.glowPlayer,
            lineHeight: 1,
          }}>
            {score.player}
          </span>
          <div style={{
            display: 'flex',
            gap: '4px',
            marginTop: '6px',
          }}>
            {Array.from({ length: gamesToWin }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: i < gamesWon.player ? cssVar.player : cssVar.playerPipOff,
                  boxShadow: i < gamesWon.player ? cssVar.glowPlayer : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <span style={{
          color: cssVar.inkMuted,
          fontSize: '2rem',
          fontWeight: 'bold',
          lineHeight: 1,
          marginTop: '0.3rem',
        }}>
          :
        </span>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <span style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            color: cssVar.opponent,
            textShadow: cssVar.glowOpponent,
            lineHeight: 1,
          }}>
            {score.opponent}
          </span>
          <div style={{
            display: 'flex',
            gap: '4px',
            marginTop: '6px',
          }}>
            {Array.from({ length: gamesToWin }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: i < gamesWon.opponent ? cssVar.opponent : cssVar.opponentPipOff,
                  boxShadow: i < gamesWon.opponent ? cssVar.glowOpponent : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <span style={{
          fontSize: '1.2rem',
          color: cssVar.opponent,
          textShadow: cssVar.glowOpponent,
          opacity: showTurnIndicator && currentStriker === 'opponent' ? 0.9 : 0,
          marginTop: '0.6rem',
          transition: 'opacity 0.15s',
        }}>
          ◀
        </span>
      </div>
    </div>
  )
}
