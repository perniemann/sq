import { useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { useGameStore } from '../stores/gameStore'
import { useInputStore } from '../hooks/useInput'
import { getShotConfig } from '../systems/shotTypes'
import { getPointReasonDisplay } from '../systems/scoring'
import {
  INITIAL_TEACH_PROGRESS,
  activeTeachTip,
  advanceTeachProgress,
  teachTipLabel,
  type TeachProgress,
} from '../systems/teachPrompts'
import logoSvg from '../assets/sq-logo.svg?url'
import { cssVar } from '../theme/colors'
import { APP_VERSION, formatVersionLabel } from '../version'
import { measureQDescenderPx } from './measureDescender'

/** Touch devices have no Space key, so the prompts have to name the right gesture. */
const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const PROMPT = {
  /** Visible CTA — no "TO PLAY"; scoreboard ▶ carries the play cue. */
  start: IS_TOUCH ? 'TAP RIGHT SIDE' : 'CLICK OR SPACE',
  /** Screen-reader / live-region wording keeps the verb. */
  startA11y: IS_TOUCH ? 'Tap right side to start' : 'Click or press space to start',
  continue: IS_TOUCH ? 'TAP TO CONTINUE' : 'CLICK OR SPACE TO CONTINUE',
  nextGame: IS_TOUCH ? 'TAP FOR NEXT GAME' : 'CLICK OR SPACE FOR NEXT GAME',
} as const

function phasePrompt(phase: string): string | null {
  if (phase === 'idle') return PROMPT.start
  if (phase === 'point') return PROMPT.continue
  if (phase === 'gameOver') return PROMPT.nextGame
  return null
}

/** ▶/◀ mark matching scoreboard turn chevrons (`player` cyan / `opponent` orange). */
function ScoreboardPlayMark(props: {
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
        // Cue marks stay sharp; scoreboard turn marks keep neon glow
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

export default function HUD() {
  const score = useGameStore(state => state.score)
  const matchState = useGameStore(state => state.matchState)
  const phase = useGameStore(state => state.phase)
  const currentStriker = useGameStore(state => state.currentStriker)
  const lastShotType = useGameStore(state => state.lastShotType)
  const lastShotTime = useGameStore(state => state.lastShotTime)
  const pointReason = useGameStore(state => state.pointReason)
  const pointWinner = useGameStore(state => state.pointWinner)
  const gameBallHolder = useGameStore(state => state.gameBallHolder)
  const matchBallHolder = useGameStore(state => state.matchBallHolder)
  const demoMode = useGameStore(state => state.demoMode)
  const letCalled = useGameStore(state => state.letCalled)
  const servingPlayer = useGameStore(state => state.servingPlayer)
  const chasePressed = useInputStore(state => state.buttonB.pressed)
  const swingActive = useInputStore(state => state.swing.active)

  const showLastShot = lastShotTime && (Date.now() - lastShotTime) < 1500
  const lastShotName = lastShotType ? getShotConfig(lastShotType).displayName : null
  const pointReasonText = pointReason ? getPointReasonDisplay(pointReason) : null
  const { gamesWon, config } = matchState
  const gamesToWin = config.gamesToWin
  const showTurnIndicator = phase === 'rally' || phase === 'serving'
  const advancePrompt = phasePrompt(phase)
  const versionLabel = formatVersionLabel(APP_VERSION)

  const titleRef = useRef<HTMLHeadingElement>(null)
  const [markHeightPx, setMarkHeightPx] = useState<number | null>(null)
  const [markNudgePx, setMarkNudgePx] = useState(0)
  const [lockupWidthPx, setLockupWidthPx] = useState<number | null>(null)
  const [teachProgress, setTeachProgress] = useState<TeachProgress>(INITIAL_TEACH_PROGRESS)
  const prevPhaseRef = useRef(phase)

  // Fresh match from demo — show tips once per real-match entry.
  const wasDemoRef = useRef(demoMode)
  useEffect(() => {
    if (wasDemoRef.current && !demoMode) {
      setTeachProgress({ ...INITIAL_TEACH_PROGRESS })
    }
    wasDemoRef.current = demoMode
  }, [demoMode])

  // Serve tip clears once the ball is live; return tip clears on chase or your return swing.
  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = phase
    if (prev === 'serving' && phase === 'rally') {
      setTeachProgress(p => advanceTeachProgress(p, 'served'))
    }
  }, [phase])

  useEffect(() => {
    if (chasePressed) {
      setTeachProgress(p => advanceTeachProgress(p, 'chased'))
    }
  }, [chasePressed])

  // Serve swing also ends in `rally` with striker flipped to opponent — ignore that one.
  useEffect(() => {
    if (swingActive && phase === 'rally' && currentStriker === 'player') {
      setTeachProgress(p => advanceTeachProgress(p, 'returned'))
    }
  }, [swingActive, phase, currentStriker])

  const teachId = activeTeachTip({
    demoMode,
    phase,
    servingPlayer,
    currentStriker,
    progress: teachProgress,
    touch: IS_TOUCH,
  })
  const teachLabel = teachId ? teachTipLabel(teachId, IS_TOUCH) : null

  // Mark: 4× q-descender, then −10%; nudge down by one rendered stroke width.
  // Also track lockup width so PRESS SPACE ▶/◀ align to sq+mark, not glass.
  useLayoutEffect(() => {
    if (!demoMode) return
    let cancelled = false

    const MARK_VIEWBOX = 31
    const MARK_STROKE = 4.25

    const measure = (): void => {
      const el = titleRef.current
      if (!el || cancelled) return
      const cs = getComputedStyle(el)
      const fontCss = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      const descenderPx = measureQDescenderPx(fontCss)
      if (descenderPx <= 0) return
      // 4× descender, then −10%, then −5% more → ×0.855
      const heightPx = descenderPx * 4 * 0.855
      setMarkHeightPx(heightPx)
      setMarkNudgePx(heightPx * (MARK_STROKE / MARK_VIEWBOX))
      setLockupWidthPx(el.getBoundingClientRect().width)
    }

    const run = (): void => {
      void document.fonts.ready.then(measure)
      measure()
    }
    run()

    const ro = new ResizeObserver(run)
    if (titleRef.current) ro.observe(titleRef.current)
    window.addEventListener('resize', run)
    return () => {
      cancelled = true
      ro.disconnect()
      window.removeEventListener('resize', run)
    }
  }, [demoMode])

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      padding: '20px',
      pointerEvents: 'none',
      fontFamily: 'monospace',
      zIndex: 1000,
      color: cssVar.ink,
    }}>
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
        }}
      >
        {demoMode
          ? `Demo mode. ${PROMPT.startA11y}.`
          : `${score.player} to ${score.opponent}. ` +
            (matchBallHolder ? 'Match point. ' : gameBallHolder ? 'Game point. ' : '') +
            (phase === 'point' && letCalled ? 'Let. Rally replayed.' : '') +
            (phase === 'point' && !letCalled && pointReasonText && pointWinner
              ? `Point to ${pointWinner === 'player' ? 'you' : 'opponent'}: ${pointReasonText}.`
              : '') +
            (teachLabel ? ` ${teachLabel}.` : '')}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: '20px',
        opacity: demoMode ? 0.8 : 1,
        transition: 'opacity 0.3s ease',
      }}>
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

        {(gameBallHolder || matchBallHolder) && (
          <div style={{
            marginTop: '10px',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            color: matchBallHolder ? cssVar.matchPoint : cssVar.gamePoint,
            textShadow: matchBallHolder ? cssVar.glowMatch : cssVar.glowGame,
            animation: 'pulse 0.8s ease-in-out infinite',
            letterSpacing: '0.15em',
          }}>
            {matchBallHolder ? 'MATCH POINT' : 'GAME POINT'}
          </div>
        )}

        {!demoMode && advancePrompt && (
          <div style={{
            marginTop: '12px',
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

        {!demoMode && !advancePrompt && teachLabel && (
          <div
            aria-hidden="true"
            style={{
              marginTop: '12px',
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

        {!demoMode && phase === 'matchOver' && (
          <div style={{
            marginTop: '12px',
            fontSize: '1rem',
            fontWeight: 'bold',
            color: gamesWon.player > gamesWon.opponent ? cssVar.player : cssVar.opponent,
            textShadow: gamesWon.player > gamesWon.opponent
              ? cssVar.glowPlayer
              : cssVar.glowOpponent,
            letterSpacing: '0.12em',
          }}>
            {gamesWon.player > gamesWon.opponent ? 'VICTORY' : 'DEFEAT'}
          </div>
        )}
      </div>

      {demoMode && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          zIndex: 10,
        }}>
          {/*
            Glass wraps logo + PRESS SPACE. Prompt width = measured sq+mark
            so ▶ / ◀ still align to the logo, not the glass edges.
          */}
          <div style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: 'max-content',
            maxWidth: 'min(92vw, 28rem)',
            boxSizing: 'border-box',
            // Side inset matches bottom; top stays tight — width hugs content
            padding: 'clamp(0.075rem, 0.2vw, 0.15rem) clamp(0.85rem, 2.5vw, 1.5rem) clamp(0.85rem, 2.5vw, 1.5rem)',
            borderRadius: 0,
            background: 'color-mix(in oklch, var(--color-ink) 3%, transparent)',
            border: '1px solid color-mix(in oklch, var(--color-ink) 8%, transparent)',
            boxShadow: 'inset 0 1px 0 color-mix(in oklch, var(--color-ink) 6%, transparent)',
            backdropFilter: 'blur(4px) saturate(1.05)',
            WebkitBackdropFilter: 'blur(4px) saturate(1.05)',
          }}>
            <h1
              ref={titleRef}
              aria-label="sq_"
              style={{
                margin: 0,
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                fontSize: 'clamp(2.75rem, 12vw, 5rem)',
                lineHeight: 1,
                color: cssVar.ink,
                textShadow: 'none',
                opacity: 0.55,
                fontFamily: 'Outfit, Bahnschrift, "Segoe UI", system-ui, sans-serif',
                fontWeight: 800,
                letterSpacing: '-0.03em',
              }}
            >
              <span>s</span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'flex-end',
                gap: '0.06em',
              }}>
                <span style={{ lineHeight: 1 }}>q</span>
                <img
                  src={logoSvg}
                  alt=""
                  aria-hidden="true"
                  style={{
                    height: markHeightPx != null ? `${markHeightPx}px` : '0.855em',
                    width: 'auto',
                    display: 'block',
                    filter: 'none',
                    transform: markNudgePx > 0 ? `translateY(${markNudgePx}px)` : undefined,
                  }}
                />
              </span>
            </h1>

            <p
              aria-label={`Version ${versionLabel}`}
              style={{
                margin: '0.35rem 0 0',
                fontSize: 'clamp(0.62rem, 1.8vw, 0.72rem)',
                letterSpacing: '0.14em',
                fontFamily: 'monospace',
                color: cssVar.ink,
                opacity: 0.42,
              }}
            >
              {versionLabel}
            </p>

            <p
              aria-label={PROMPT.startA11y}
              style={{
                fontSize: 'clamp(0.72rem, 2.45vw, 0.88rem)',
                color: cssVar.opponent,
                margin: 'clamp(7px, 1.25vh, 14px) 0 0',
                letterSpacing: '0.08em',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35em',
                width: lockupWidthPx != null ? `${lockupWidthPx}px` : 'fit-content',
                boxSizing: 'border-box',
                // Match lockup ink @ 0.55 without fading the prompt text
                background: 'color-mix(in oklch, var(--color-ink) 55%, transparent)',
                borderRadius: 0,
                padding: '0.05em 0',
                textShadow: 'none',
                filter: 'none',
              }}
            >
              <span className="start-prompt-label">{PROMPT.start}</span>
            </p>
          </div>
        </div>
      )}

      {!demoMode && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}>
          {phase === 'point' && letCalled && (
            <div style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              color: cssVar.ink,
              textShadow: cssVar.glowInk,
              animation: 'pointFlash 0.5s ease-out',
            }}>
              LET
            </div>
          )}

          {phase === 'point' && !letCalled && pointReasonText && (
            <div style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              color: pointWinner === 'player' ? cssVar.player : cssVar.opponent,
              textShadow: pointWinner === 'player' ? cssVar.glowPlayer : cssVar.glowOpponent,
              animation: 'pointFlash 0.5s ease-out',
            }}>
              {pointReasonText}
            </div>
          )}

          {showLastShot && lastShotName && phase === 'rally' && (
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: cssVar.opponent,
              textShadow: cssVar.glowOpponent,
              animation: 'fadeOut 1.5s ease-out forwards',
            }}>
              {lastShotName.toUpperCase()}
            </div>
          )}
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
        /* Subtle light-intensity pulse — no size change, no blur halo */
        @keyframes startLightPulse {
          0%, 100% { opacity: 0.62; filter: brightness(0.88); }
          50% { opacity: 1; filter: brightness(1.12); }
        }
        .start-play-cue,
        .start-prompt-label {
          animation: startLightPulse 1.8s ease-in-out infinite;
          text-shadow: none;
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .start-play-cue,
          .start-prompt-label {
            animation: none !important;
            filter: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
