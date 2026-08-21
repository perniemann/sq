/**
 * Post-vite: emit dist/design/index.html with substantial non-clipped primary copy
 * and entry /assets tags only (Vite base stays '/'). Omits three/rapier/drei preloads.
 *
 * Run after `vite build`. Does not use .seo-crawl.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')
const SRC_INDEX = join(DIST, 'index.html')
const OUT_DIR = join(DIST, 'design')
const OUT = join(OUT_DIR, 'index.html')

const CANONICAL = 'https://sq.perniemann.com/design'
const TITLE = 'Design reference · sq_'
const DESCRIPTION =
  'sq_ design reference: color tokens, typography, DOM UI fixtures, and system notes for the browser 3D squash game.'

/** Game-stack chunks — do not modulepreload on /design. */
const GAME_CHUNK_RE = /\/assets\/(?:three|rapier|drei)-[^"']+\.js/

/**
 * Extract stylesheet + entry module script (+ optional CSS) from Vite index.html.
 * Always close `<script …>` with `</script>`. Skip three/rapier/drei preloads.
 */
function extractDesignAssetTags(html) {
  const tags = []

  const stylesheetRe =
    /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["'](\/assets\/[^"']+)["'][^>]*>/gi
  let m
  while ((m = stylesheetRe.exec(html)) !== null) {
    tags.push(m[0])
  }

  // Also match href-before-rel order
  const stylesheetAlt =
    /<link\b[^>]*href=["'](\/assets\/[^"']+\.css)["'][^>]*>/gi
  while ((m = stylesheetAlt.exec(html)) !== null) {
    if (!tags.includes(m[0]) && /rel=["']stylesheet["']/.test(m[0])) {
      tags.push(m[0])
    }
  }

  const scriptRe =
    /<script\b([^>]*)\bsrc=["'](\/assets\/[^"']+)["']([^>]*)>\s*<\/script>/gi
  while ((m = scriptRe.exec(html)) !== null) {
    tags.push(m[0])
  }

  // Self-opening script without closing tag in source (Vite usually closes)
  const scriptOpenRe =
    /<script\b([^>]*)\bsrc=["'](\/assets\/[^"']+)["']([^>]*)>/gi
  while ((m = scriptOpenRe.exec(html)) !== null) {
    const full = m[0]
    if (tags.some((t) => t.includes(m[2]))) continue
    const closed = full.endsWith('</script>')
      ? full
      : `${full}</script>`
    tags.push(closed)
  }

  return tags.filter((t) => !GAME_CHUNK_RE.test(t))
}

function assertBalancedScripts(html) {
  const opens = (html.match(/<script\b/gi) ?? []).length
  const closes = (html.match(/<\/script>/gi) ?? []).length
  if (opens !== closes) {
    throw new Error(
      `prerender-design-html: unbalanced script tags (open=${opens} close=${closes})`,
    )
  }
  const moduleIdx = html.search(/<script\b[^>]*type=["']module["'][^>]*src=/i)
  if (moduleIdx === -1) {
    throw new Error('prerender-design-html: missing entry module script')
  }
  const afterModule = html.slice(moduleIdx)
  const closeIdx = afterModule.search(/<\/script>/i)
  if (closeIdx === -1) {
    throw new Error('prerender-design-html: module script missing </script>')
  }
  const afterClose = afterModule.slice(closeIdx + '</script>'.length)
  if (!afterClose.includes('<div id="root">') || !afterClose.includes('<h1>')) {
    throw new Error(
      'prerender-design-html: #root / <h1> must appear after module </script>',
    )
  }
  if (html.includes('seo-crawl')) {
    throw new Error('prerender-design-html: must not use .seo-crawl')
  }
}

function main() {
  const built = readFileSync(SRC_INDEX, 'utf8')
  const assetTags = extractDesignAssetTags(built)
  if (assetTags.length === 0) {
    console.error('prerender-design-html: no /assets tags found in dist/index.html')
    process.exit(1)
  }

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: TITLE,
    url: CANONICAL,
    description: DESCRIPTION,
    isPartOf: {
      '@type': 'WebSite',
      name: 'sq_',
      url: 'https://sq.perniemann.com/',
    },
  })

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/sq-favicon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="/sq-favicon-32.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${TITLE}</title>
    <meta name="description" content="${DESCRIPTION}" />
    <link rel="canonical" href="${CANONICAL}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="sq_" />
    <meta property="og:title" content="${TITLE}" />
    <meta property="og:description" content="${DESCRIPTION}" />
    <meta property="og:url" content="${CANONICAL}" />
    <meta property="og:image" content="https://sq.perniemann.com/sq-favicon-32.png" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${TITLE}" />
    <meta name="twitter:description" content="${DESCRIPTION}" />
    <script type="application/ld+json">${jsonLd}</script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        width: 100%;
        min-height: 100%;
        overflow: auto;
        background: #070a0e;
        color: #eef6f7;
        font-family: "Chakra Petch", Bahnschrift, "Segoe UI", sans-serif;
      }
      #root { min-height: 100%; }
      .dr-static {
        max-width: 42rem;
        margin: 0 auto;
        padding: 2rem 1.25rem 4rem;
        line-height: 1.55;
      }
      .dr-static h1 {
        font-size: 1.75rem;
        font-weight: 800;
        color: #00ffff;
        letter-spacing: -0.02em;
        margin-bottom: 0.75rem;
      }
      .dr-static p, .dr-static li {
        color: #9aadb2;
        font-size: 0.95rem;
        margin-bottom: 0.75rem;
      }
      .dr-static a { color: #00ffff; }
      .dr-static h2 {
        font-size: 1.1rem;
        margin: 1.5rem 0 0.5rem;
        color: #eef6f7;
      }
      .dr-static ul { padding-left: 1.25rem; margin-bottom: 1rem; }
    </style>
    ${assetTags.join('\n    ')}
  </head>
  <body>
    <div id="root">
      <main class="dr-static">
        <h1>Design reference</h1>
        <p>
          Public catalog of sq_ visual tokens and DOM UI fixtures for the browser-only
          3D squash game. Cyan and orange identity accents on a near-black void substrate;
          Chakra Petch for display type and IBM Plex Mono for utility labels.
        </p>
        <p>
          This page lists foundations (HEX and CSS tokens), static DOM specimens
          (start lockup, scoreboard, tin gameplay, error fallback), and system notes
          for bloom, bounce profiles, and diegetic WorldHud. Source paths are included
          for makers; there are no secrets in this catalog.
        </p>
        <p><a href="https://sq.perniemann.com/">Back to game</a></p>
        <h2>On this page</h2>
        <ul>
          <li><a href="#dr-foundations">Foundations: tokens &amp; typography</a></li>
          <li><a href="#dr-specimens">DOM specimens</a></li>
          <li><a href="#dr-system">System &amp; excluded modules</a></li>
        </ul>
        <h2 id="dr-foundations">Foundations</h2>
        <p>
          Color tokens live in src/theme/colors.ts (HEX) and src/theme/tokens.css
          (CSS variables and glow). Typography roles are defined in src/theme/fonts.ts.
        </p>
        <h2 id="dr-specimens">DOM specimens</h2>
        <p>
          Static fixtures for StartLockup, Scoreboard, TinGameplay, and ErrorBoundary
          fallback chrome. Live HUD is store-bound and shown as an aria-live stub only.
        </p>
        <h2 id="dr-system">System</h2>
        <p>
          Bloom, displayAlpha, bounce profiles (?bounce=), and diegetic WorldHud notes.
          Canvas modules (Scene, Player, Ball, Court, WorldHud, GameCamera) are documented
          as excluded from live specimens.
        </p>
      </main>
    </div>
  </body>
</html>
`

  assertBalancedScripts(html)
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT, html, 'utf8')
  console.log(`Wrote ${OUT} (${html.length} bytes, ${assetTags.length} asset tags)`)
}

try {
  main()
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}
