import { useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import logoSvg from '../assets/sq-logo.svg?url'
import { cssVar } from '../theme/colors'
import { FONT_DISPLAY_STACK, FONT_UTILITY_STACK } from '../theme/fonts'
import { measureQDescenderPx } from './measureDescender'

export type StartLockupProps = {
  versionLabel: string
  startLabel: string
  startA11y: string
}

/**
 * Idle title lockup — diegetic wall type matching tin grammar (display + utility mono).
 */
export function StartLockup({
  versionLabel,
  startLabel,
  startA11y,
}: StartLockupProps): ReactElement {
  const titleRef = useRef<HTMLDivElement>(null)
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
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'max-content',
        maxWidth: 'min(92vw, 28rem)',
        boxSizing: 'border-box',
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      {/* Page H1 lives in index.html SEO shell for crawlers; visual lockup is not a second heading. */}
      <div
        ref={titleRef}
        aria-hidden="true"
        className="start-lockup-title"
        style={{
          margin: 0,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: 0,
          fontSize: 'clamp(2.75rem, 12vw, 5rem)',
          lineHeight: 1,
          color: cssVar.ink,
          textShadow: 'none',
          opacity: 0.92,
          fontFamily: FONT_DISPLAY_STACK,
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        <span>s</span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'flex-end',
          // Optical gap between Chakra Petch `s`/`q` (sidebearings + tracking)
          gap: 0,
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
              // Pull into SVG left pad so ink-to-ink matches letter sidebearings
              marginLeft: '-0.04em',
              transform: markNudgePx > 0 ? `translateY(${markNudgePx}px)` : undefined,
            }}
          />
        </span>
      </div>

      <p
        aria-label={`Version ${versionLabel}`}
        className="start-lockup-version"
        style={{
          margin: '0.2rem 0 0',
          fontSize: 'clamp(0.62rem, 1.8vw, 0.72rem)',
          letterSpacing: '0.14em',
          fontFamily: FONT_UTILITY_STACK,
          color: cssVar.inkMuted,
          opacity: 1,
        }}
      >
        {versionLabel}
      </p>

      <p
        aria-label={startA11y}
        className="start-lockup-cta"
        style={{
          fontSize: 'clamp(0.72rem, 2.45vw, 0.88rem)',
          color: cssVar.opponent,
          margin: 'clamp(14px, 2.2vh, 22px) 0 0',
          letterSpacing: '0.1em',
          fontFamily: FONT_UTILITY_STACK,
          fontWeight: 700,
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
          opacity: 0.95,
        }}
      >
        <span className="start-prompt-label">{startLabel}</span>
      </p>

      <style>{`
        /* Reveal: mark → version → CTA (Orient/Confirm on idle enter) */
        @keyframes startLockupReveal {
          from { opacity: 0; transform: translateY(0.35em); }
          to { opacity: 1; transform: translateY(0); }
        }
        .start-lockup-title,
        .start-lockup-version,
        .start-lockup-cta {
          animation: startLockupReveal 420ms ease-out both;
        }
        .start-lockup-version { animation-delay: 70ms; }
        .start-lockup-cta { animation-delay: 140ms; }
        @media (prefers-reduced-motion: reduce) {
          .start-lockup-title,
          .start-lockup-version,
          .start-lockup-cta {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  )
}
