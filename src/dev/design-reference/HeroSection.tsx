import type { ReactElement } from 'react'
import { cssVar } from '../../theme/colors'
import { EvidenceBadge } from './components/EvidenceBadge'
import { drFontDisplay, drFontUtility } from './drStyles'

/**
 * Hero — thesis + first evidence. The one sentence a visitor should leave with, proven
 * immediately by the same court they're about to read about. Reveal is staged (kicker →
 * thesis → capture) via CSS below; `prefers-reduced-motion` collapses it to the end state.
 */
export function HeroSection(): ReactElement {
  return (
    <div style={{ marginBottom: 8 }}>
      <p
        className="dr-hero-kicker"
        style={{
          margin: '0 0 14px',
          fontFamily: drFontUtility,
          fontSize: 12,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: cssVar.inkMuted,
        }}
      >
        sq_ — browser squash on a WSF-dimension court
      </p>
      <h2
        className="dr-hero-thesis"
        style={{
          margin: '0 0 28px',
          maxWidth: '20ch',
          fontFamily: drFontDisplay,
          fontWeight: 700,
          fontSize: 'clamp(1.9rem, 5vw, 3rem)',
          lineHeight: 1.08,
          letterSpacing: '-0.01em',
          color: cssVar.ink,
        }}
      >
        The scoreboard isn&rsquo;t drawn over the court.{' '}
        <span style={{ color: cssVar.player, textShadow: cssVar.glowPlayer }}>
          It&rsquo;s drawn on it.
        </span>
      </h2>

      <figure className="dr-hero-figure" style={{ margin: 0 }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 10',
            overflow: 'hidden',
            background: cssVar.void,
            border: `1px solid color-mix(in oklch, ${cssVar.inkMuted} 35%, transparent)`,
          }}
        >
          <img
            src="/design-media/capture-hero.png"
            alt="sq_ idle screen — title lockup rendered on the court's front wall, players waiting in the service boxes"
            width={1600}
            height={1000}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <figcaption
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 8,
            margin: '10px 0 0',
            fontFamily: drFontUtility,
            fontSize: 12,
            color: cssVar.inkMuted,
          }}
        >
          <span>
            Idle screen, live capture — <code>components/WorldHud.tsx</code>. No
            floating scoreboard, no separate menu scene: this is the game.
          </span>
          <EvidenceBadge source="capture" />
        </figcaption>
      </figure>

      <style>{`
        @keyframes drHeroReveal {
          from { opacity: 0; transform: translateY(0.6em); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dr-hero-kicker, .dr-hero-thesis, .dr-hero-figure {
          animation: drHeroReveal 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .dr-hero-thesis { animation-delay: 90ms; }
        .dr-hero-figure { animation-delay: 220ms; }
        @media (prefers-reduced-motion: reduce) {
          .dr-hero-kicker, .dr-hero-thesis, .dr-hero-figure {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  )
}
