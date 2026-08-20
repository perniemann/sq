import { useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import logoSvg from '../assets/sq-logo.svg?url'
import { cssVar } from '../theme/colors'
import { measureQDescenderPx } from './measureDescender'

export type StartLockupProps = {
  versionLabel: string
  startLabel: string
  startA11y: string
}

/**
 * Exact demo title lockup — glass / border / blur removed; markup otherwise unchanged.
 */
export function StartLockup({
  versionLabel,
  startLabel,
  startA11y,
}: StartLockupProps): ReactElement {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [markHeightPx, setMarkHeightPx] = useState<number | null>(null)
  const [markNudgePx, setMarkNudgePx] = useState(0)
  const [lockupWidthPx, setLockupWidthPx] = useState<number | null>(null)

  useLayoutEffect(() => {
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
  }, [])

  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: 'max-content',
      maxWidth: 'min(92vw, 28rem)',
      boxSizing: 'border-box',
      textAlign: 'center',
      pointerEvents: 'none',
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
        aria-label={startA11y}
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
          background: 'transparent',
          borderRadius: 0,
          padding: '0.05em 0',
          textShadow: 'none',
          filter: 'none',
        }}
      >
        <span className="start-prompt-label">{startLabel}</span>
      </p>

      <style>{`
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
