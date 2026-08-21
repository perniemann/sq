/**
 * Emit authored journey SVG plates into public/design-media/.
 * These are fixtures (not live WebGL captures) matching HEX + phase grammar.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'design-media')
mkdirSync(OUT, { recursive: true })

const C = {
  void: '#070a0e',
  ink: '#eef6f7',
  muted: '#9aadb2',
  player: '#1ad9e8',
  opponent: '#f06e14',
  ball: '#ff8f2e',
  match: '#d94fff',
  line: '#f2f4f5',
}

function plate({
  title,
  phase,
  accent,
  centerLabel,
  scoreL,
  scoreR,
  sub,
}) {
  const glow = accent
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.void}"/>
      <stop offset="100%" stop-color="#0c1218"/>
    </linearGradient>
    <filter id="g" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="960" height="600" fill="${C.void}"/>
  <!-- court perspective -->
  <polygon points="180,120 780,120 900,520 60,520" fill="url(#floor)" stroke="${C.line}" stroke-opacity="0.35" stroke-width="1.5"/>
  <line x1="180" y1="120" x2="780" y2="120" stroke="${glow}" stroke-opacity="0.7" stroke-width="2" filter="url(#g)"/>
  <line x1="220" y1="200" x2="740" y2="200" stroke="${C.line}" stroke-opacity="0.25" stroke-width="1"/>
  <line x1="300" y1="340" x2="660" y2="340" stroke="${C.line}" stroke-opacity="0.2" stroke-width="1"/>
  <line x1="480" y1="120" x2="480" y2="520" stroke="${C.line}" stroke-opacity="0.12" stroke-width="1"/>
  <!-- tin band -->
  <rect x="200" y="460" width="560" height="28" fill="${C.void}" stroke="${C.line}" stroke-opacity="0.4"/>
  <text x="240" y="480" fill="${C.player}" font-family="Bahnschrift, 'Segoe UI', sans-serif" font-size="16" font-weight="700">${scoreL}</text>
  <text x="720" y="480" fill="${C.opponent}" font-family="Bahnschrift, 'Segoe UI', sans-serif" font-size="16" font-weight="700" text-anchor="end">${scoreR}</text>
  <text x="480" y="480" fill="${glow}" font-family="Bahnschrift, 'Segoe UI', sans-serif" font-size="14" font-weight="700" text-anchor="middle" filter="url(#g)">${centerLabel}</text>
  <!-- ball -->
  <circle cx="520" cy="280" r="7" fill="${C.ball}" filter="url(#g)"/>
  <!-- chrome -->
  <text x="48" y="48" fill="${C.player}" font-family="Bahnschrift, 'Segoe UI', sans-serif" font-size="28" font-weight="700" letter-spacing="-0.02em">sq_</text>
  <text x="48" y="72" fill="${C.muted}" font-family="'IBM Plex Mono', Consolas, monospace" font-size="11">${phase}</text>
  <text x="912" y="48" fill="${C.muted}" font-family="'IBM Plex Mono', Consolas, monospace" font-size="11" text-anchor="end">${title}</text>
  ${sub ? `<text x="480" y="560" fill="${C.muted}" font-family="'IBM Plex Mono', Consolas, monospace" font-size="12" text-anchor="middle">${sub}</text>` : ''}
</svg>
`
}

const plates = [
  {
    file: 'journey-idle.svg',
    title: 'Idle lockup',
    phase: 'phase: idle',
    accent: C.opponent,
    centerLabel: 'PRESS SPACE',
    scoreL: '0',
    scoreR: '0',
    sub: 'Brand + version on the front wall',
  },
  {
    file: 'journey-serve.svg',
    title: 'Serve',
    phase: 'phase: serving',
    accent: C.player,
    centerLabel: 'READY',
    scoreL: '0',
    scoreR: '0',
    sub: 'Space charges · aim while held',
  },
  {
    file: 'journey-rally.svg',
    title: 'Rally',
    phase: 'phase: rally',
    accent: C.player,
    centerLabel: '4 – 3',
    scoreL: '4',
    scoreR: '3',
    sub: 'Diegetic tin · canHit tint',
  },
  {
    file: 'journey-point.svg',
    title: 'Point callout',
    phase: 'phase: point',
    accent: C.player,
    centerLabel: 'WIN',
    scoreL: '5',
    scoreR: '3',
    sub: 'Callout in striker colour',
  },
  {
    file: 'journey-match-over.svg',
    title: 'Match over',
    phase: 'phase: matchOver',
    accent: C.match,
    centerLabel: 'VICTORY',
    scoreL: '11',
    scoreR: '7',
    sub: 'Magenta reserved for match point',
  },
]

for (const p of plates) {
  const svg = plate(p)
  writeFileSync(join(OUT, p.file), svg, 'utf8')
  console.log('wrote', p.file)
}

writeFileSync(
  join(OUT, 'README.md'),
  [
    '# design-media',
    '',
    'Play-section evidence for `/design`.',
    '',
    '- `journey-*.svg` — authored court plates (fixtures). Prefer these in CI/headless.',
    '- Live WebGL PNG capture: `node scripts/capture-design-media.mjs` with `npm run dev`',
    '  and `?nobloom` (requires usable GPU WebGL; SwiftShader often yields black frames).',
    '',
  ].join('\n'),
  'utf8',
)
console.log('done')
