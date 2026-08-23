import { useEffect, useState, type ReactElement } from 'react'
import { FeedbackSection } from './FeedbackSection'
import { HeroSection } from './HeroSection'
import { KitSection } from './KitSection'
import { MapSection } from './MapSection'
import { PlaySection } from './PlaySection'
import { SystemSection } from './SystemSection'
import { TOC } from './journey-media'
import {
  drAside,
  drFontUtility,
  drH1,
  drHeader,
  drHeaderInner,
  drLede,
  drLink,
  drMain,
  drPage,
  drShell,
  drSkipLink,
  drTocLabel,
  drTocLink,
  drTocList,
} from './drStyles'

/**
 * Public design reference — prior-art-informed IA: Map · Play · Feedback · System · Kit.
 * Visual language matches the game (void / cool-warm accents, Chakra Petch + Plex Mono).
 */
export default function DesignReferencePage(): ReactElement {
  const [activeHref, setActiveHref] = useState<string>(TOC[0].href)

  useEffect(() => {
    document.title = 'Design reference · sq_'
    const html = document.documentElement
    const body = document.body
    const root = document.getElementById('root')
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      rootOverflow: root?.style.overflow ?? '',
      rootHeight: root?.style.height ?? '',
      bodyHeight: body.style.height,
    }
    html.style.overflow = 'auto'
    body.style.overflow = 'auto'
    body.style.height = 'auto'
    if (root) {
      root.style.overflow = 'auto'
      root.style.height = 'auto'
      root.style.minHeight = '100%'
    }
    return () => {
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      body.style.height = prev.bodyHeight
      if (root) {
        root.style.overflow = prev.rootOverflow
        root.style.height = prev.rootHeight
        root.style.minHeight = ''
      }
    }
  }, [])

  useEffect(() => {
    const ids = TOC.map(({ href }) => href.slice(1))
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el != null)
    if (nodes.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const top = visible[0]
        if (top?.target.id) setActiveHref(`#${top.target.id}`)
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] },
    )
    for (const n of nodes) observer.observe(n)
    return () => observer.disconnect()
  }, [])

  return (
    <div style={drPage}>
      <a
        href="#dr-main"
        style={drSkipLink}
        onFocus={(e) => {
          e.currentTarget.style.left = '8px'
        }}
        onBlur={(e) => {
          e.currentTarget.style.left = '-9999px'
        }}
      >
        Skip to reference content
      </a>

      <header style={drHeader}>
        <div style={drHeaderInner}>
          <div>
            <h1 style={drH1}>Design reference</h1>
            <p style={drLede}>
              Every claim below cites the source file that backs it. No secrets, no
              invented screens.
            </p>
            <p style={{ margin: '10px 0 0', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <a href="#dr-map" style={drLink}>
                Jump to map
              </a>
              <a href="/" style={drLink}>
                Back to game
              </a>
            </p>
          </div>
        </div>
      </header>

      <div style={drShell}>
        <aside style={drAside} aria-label="Table of contents">
          <p style={drTocLabel}>On this page</p>
          <nav>
            <ul style={drTocList}>
              {TOC.map(({ href, label }) => {
                const current = activeHref === href
                return (
                  <li key={href}>
                    <a
                      href={href}
                      aria-current={current ? 'true' : undefined}
                      style={{
                        ...drTocLink,
                        color: current ? 'var(--color-player)' : drTocLink.color,
                        textDecoration: current ? 'underline' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--color-player)'
                        e.currentTarget.style.textDecoration = 'underline'
                      }}
                      onMouseLeave={(e) => {
                        if (activeHref === href) return
                        e.currentTarget.style.color = 'var(--color-ink-muted)'
                        e.currentTarget.style.textDecoration = 'none'
                      }}
                    >
                      {label}
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        <main id="dr-main" style={drMain}>
          <div
            style={{
              paddingBottom: 32,
              borderBottom:
                '1px solid color-mix(in oklch, var(--color-ink-muted) 28%, transparent)',
            }}
          >
            <HeroSection />
          </div>
          <div
            className="dr-sections-reveal"
            style={{ display: 'flex', flexDirection: 'column', gap: 56 }}
          >
            <MapSection />
            <PlaySection />
            <FeedbackSection />
            <SystemSection />
            <KitSection />
            <p
              style={{
                margin: 0,
                fontFamily: drFontUtility,
                fontSize: 11,
                color: 'var(--color-ink-muted)',
              }}
            >
              sq_ · dark-only · Chakra Petch + IBM Plex Mono · Map · Play · Feedback ·
              System · Kit
            </p>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes drSectionsReveal {
          from { opacity: 0; transform: translateY(0.8em); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dr-sections-reveal {
          animation: drSectionsReveal 560ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 320ms;
        }
        @media (prefers-reduced-motion: reduce) {
          .dr-sections-reveal {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  )
}
