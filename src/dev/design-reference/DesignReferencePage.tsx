import { useEffect, type ReactElement } from 'react'
import '@fontsource/outfit/400.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/700.css'
import { FoundationsSection } from './FoundationsSection'
import { SpecimensSection } from './SpecimensSection'
import { SystemSection } from './SystemSection'
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

const TOC = [
  { href: '#dr-foundations', label: 'Foundations' },
  { href: '#dr-specimens', label: 'DOM specimens' },
  { href: '#dr-system', label: 'System & excluded' },
] as const

/**
 * Public design reference — tokens, static DOM specimens, system notes.
 * Visual language matches the game (void / cyan / orange, Outfit + Plex Mono).
 */
export default function DesignReferencePage(): ReactElement {
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
              Public catalog of sq_ tokens and DOM UI fixtures. Source paths are listed for
              makers; there are no secrets here. Live match UI is diegetic on the front wall.
            </p>
            <p style={{ margin: '10px 0 0' }}>
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
              {TOC.map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    style={drTocLink}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--color-player)'
                      e.currentTarget.style.textDecoration = 'underline'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--color-ink-muted)'
                      e.currentTarget.style.textDecoration = 'none'
                    }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main id="dr-main" style={drMain}>
          <FoundationsSection />
          <SpecimensSection />
          <SystemSection />
          <p
            style={{
              margin: 0,
              fontFamily: drFontUtility,
              fontSize: 11,
              color: 'var(--color-ink-muted)',
            }}
          >
            sq_ · dark-only · Outfit + IBM Plex Mono · HEX in theme/colors.ts
          </p>
        </main>
      </div>
    </div>
  )
}
