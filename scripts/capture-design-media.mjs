/**
 * Capture real journey/feedback stills from the running Vite game into public/design-media/.
 *
 * Usage: npm run dev (:5173), then `node scripts/capture-design-media.mjs`.
 *
 * Environment note: this sandbox's headless Chromium loses its WebGL context roughly
 * 800–1000ms after canvas mount (ANGLE/D3D11 + this GPU driver — reproduces with every
 * ANGLE backend tried, and in the Cursor-owned browser too, so it is not a flag issue).
 * Every capture therefore uses a *fresh page* and reads state back from the Zustand
 * stores immediately after mount, well inside that window — real GPU frames, not
 * software-rendered fallbacks.
 */
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'public', 'design-media')
const ORIGIN = process.env.SQ_CAPTURE_ORIGIN ?? 'http://localhost:5173'

const CHROME_EXECUTABLE =
  process.env.SQ_CAPTURE_CHROME ??
  (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined)

const LAUNCH_ARGS = ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']
const VIEWPORT = { width: 1600, height: 1000 }

/** Mid-rally pose for wide captures — centre lane, readable height, toward the front wall. */
const PLACE_RALLY_BALL = `
  await new Promise((r) => setTimeout(r, 80))
  window.__sqCapturePlaceBall?.(0.2, 1.1, -0.8)
`
/** Right service box hold pose for serve stills. */
const PLACE_SERVE_BALL = `
  await new Promise((r) => setTimeout(r, 80))
  window.__sqCapturePlaceBall?.(2.4, 1.0, 1.745)
`

const withBigBall = (query) =>
  query.includes('bigball') ? query : `${query}${query.includes('?') ? '&' : '?'}bigball`

/** Store patches run inside the page. Keep in sync with stores/gameStore.ts + hooks/useInput.ts. */
const PATCHES = {
  none: null,
  serving: `
    const { useGameStore } = await import('/src/stores/gameStore.ts')
    const s = useGameStore.getState()
    s.setDemoMode(false)
    s.resetMatch()
    await new Promise((r) => setTimeout(r, 60))
    s.setPhase('serving')
    s.setRallyState('serving')
    s.setCurrentStriker('player')
    ${PLACE_SERVE_BALL}
  `,
  rally: `
    const { useGameStore } = await import('/src/stores/gameStore.ts')
    const s = useGameStore.getState()
    s.setDemoMode(false)
    s.setPhase('rally')
    s.setRallyState('active')
    s.setCanHit(true)
    s.setCurrentStriker('player')
    useGameStore.setState({ score: { player: 4, opponent: 3 } })
    ${PLACE_RALLY_BALL}
  `,
  point: `
    const { useGameStore } = await import('/src/stores/gameStore.ts')
    const s = useGameStore.getState()
    s.setDemoMode(false)
    s.setPhase('point')
    s.setRallyState('ended')
    s.setCanHit(false)
    s.setPointResult('opponent', 'doubleBounce')
    useGameStore.setState({ score: { player: 6, opponent: 4 } })
    ${PLACE_RALLY_BALL}
  `,
  tinFault: `
    const { useGameStore } = await import('/src/stores/gameStore.ts')
    const s = useGameStore.getState()
    s.setDemoMode(false)
    s.setPhase('point')
    s.setRallyState('ended')
    s.setCanHit(false)
    s.setPointResult('player', 'tin')
    s.signalTinHit()
    useGameStore.setState({ score: { player: 7, opponent: 4 } })
  `,
  gameOver: `
    const { useGameStore } = await import('/src/stores/gameStore.ts')
    const s = useGameStore.getState()
    s.setDemoMode(false)
    s.setPhase('gameOver')
    s.setRallyState('ended')
    s.setCanHit(false)
    useGameStore.setState({
      score: { player: 11, opponent: 7 },
      matchState: {
        gamesWon: { player: 1, opponent: 0 },
        currentGame: 2,
        config: { pointsToWin: 11, mustWinBy: 2, gamesToWin: 2 },
      },
    })
  `,
  matchOver: `
    const { useGameStore } = await import('/src/stores/gameStore.ts')
    const s = useGameStore.getState()
    s.setDemoMode(false)
    s.setPhase('matchOver')
    s.setRallyState('ended')
    s.setCanHit(false)
    useGameStore.setState({
      score: { player: 11, opponent: 8 },
      matchState: {
        gamesWon: { player: 2, opponent: 0 },
        currentGame: 3,
        config: { pointsToWin: 11, mustWinBy: 2, gamesToWin: 2 },
      },
    })
  `,
  chargePrep: `
    const { useGameStore } = await import('/src/stores/gameStore.ts')
    const { useInputStore } = await import('/src/hooks/useInput.ts')
    const s = useGameStore.getState()
    s.setDemoMode(false)
    s.setPhase('rally')
    s.setRallyState('active')
    s.setCanHit(true)
    s.setCurrentStriker('player')
    useInputStore.setState({
      buttonA: { pressed: true, holdStart: Date.now() - 150, holdDuration: 0.15 },
    })
  `,
  chargePower: `
    const { useGameStore } = await import('/src/stores/gameStore.ts')
    const { useInputStore } = await import('/src/hooks/useInput.ts')
    const s = useGameStore.getState()
    s.setDemoMode(false)
    s.setPhase('rally')
    s.setRallyState('active')
    s.setCanHit(true)
    s.setCurrentStriker('player')
    useInputStore.setState({
      buttonA: { pressed: true, holdStart: Date.now() - 600, holdDuration: 0.6 },
    })
  `,
  tinFlashOnly: `
    const { useGameStore } = await import('/src/stores/gameStore.ts')
    useGameStore.getState().signalTinHit()
  `,
  ballOff: `
    const { useGameStore } = await import('/src/stores/gameStore.ts')
    const s = useGameStore.getState()
    s.setDemoMode(false)
    s.resetMatch()
    await new Promise((r) => setTimeout(r, 60))
    s.setPhase('serving')
    s.setRallyState('serving')
    s.setCurrentStriker('opponent')
    s.setCanHit(false)
  `,
  ballOn: `
    const { useGameStore } = await import('/src/stores/gameStore.ts')
    const s = useGameStore.getState()
    s.setDemoMode(false)
    s.resetMatch()
    await new Promise((r) => setTimeout(r, 60))
    s.setPhase('serving')
    s.setRallyState('serving')
    s.setCurrentStriker('player')
    s.setCanHit(true)
  `,
}

/**
 * Screen-space box tight on the served ball itself in the `?ballzoom` close-up view
 * (1600×1000 viewport, right service box, right after `serveBallWorldPosition`) — used
 * to verify the canHit tint actually rendered rather than trusting fixed waits. Sampled
 * well inside the ball's rendered hexagon (bbox roughly x:776-823 y:402-453) to avoid the
 * antialiased outline edge. This sandbox's WebGL context is also fragile enough (see
 * header) that the multi-frame tint-pulse animation sometimes gets frozen mid-blend.
 */
const BALL_HOTSPOT = { left: 785, top: 412, width: 30, height: 30 }

async function averagePixel(path, box) {
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true })
  const { width, channels } = info
  let r = 0, g = 0, b = 0, n = 0
  for (let y = box.top; y < box.top + box.height; y++) {
    for (let x = box.left; x < box.left + box.width; x++) {
      const idx = (y * width + x) * channels
      r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; n++
    }
  }
  return { r: r / n, g: g / n, b: b / n }
}

// Absolute margins, not ratios — a blown-out white/grey frame (r≈g≈b) would otherwise
// satisfy a ratio check trivially since it has no dominant channel either way.
const isCyanish = ({ r, g, b }) => b > r + 40 && g > r + 20
const isOrangeish = ({ r, g, b }) => r > g + 15 && r > b + 30

/** name, query string, patch key, ms before patch, ms after patch (before screenshot), options */
const SHOTS = [
  ['capture-hero', '?nodemo', 'none', 650, 0],
  ['capture-serving', withBigBall('?nodemo'), 'serving', 420, 150],
  ['capture-rally', withBigBall('?nodemo'), 'rally', 420, 150],
  ['capture-point', withBigBall('?nodemo'), 'point', 420, 150],
  ['capture-tin', withBigBall('?nodemo'), 'tinFault', 420, 150],
  ['capture-game-over', '?nodemo', 'gameOver', 420, 150],
  ['capture-match-over', '?nodemo', 'matchOver', 420, 150],
  ['capture-charge-prep', '?nodemo&ball', 'chargePrep', 420, 120],
  ['capture-charge-power', '?nodemo&ball', 'chargePower', 420, 120],
  ['capture-tin-idle', '?nodemo&tin', 'none', 500, 0],
  ['capture-tin-flash', '?nodemo&tin', 'tinFlashOnly', 500, 100],
  // Reduced motion + a pixel check: the tint pulse is a multi-frame animation and this
  // sandbox's WebGL context can freeze mid-blend (see header), so a fixed wait alone
  // isn't reliable evidence the canHit colour actually painted before the screenshot.
  ['capture-ball-off', '?nodemo&ballzoom', 'ballOff', 420, 150, {
    reducedMotion: true,
    attempts: 8,
    verify: async (path) => isOrangeish(await averagePixel(path, BALL_HOTSPOT)),
  }],
  ['capture-ball-on', '?nodemo&ballzoom', 'ballOn', 420, 200, {
    reducedMotion: true,
    attempts: 8,
    verify: async (path) => isCyanish(await averagePixel(path, BALL_HOTSPOT)),
  }],
  ['capture-bloom-off', withBigBall('?nodemo&nobloom'), 'rally', 500, 200],
]

/**
 * Dev-server first-transform compiles (e.g. an uncommon module like useInput.ts) can be
 * slow enough that the pre-canvas "Loading…" fallback is still up after a generous poll.
 * That stall happens *before* the canvas ever renders a frame, so it does not eat into
 * the ~900ms post-mount budget before the WebGL context loss — safe to retry with a
 * fresh page rather than gamble on a single long wait that might overshoot the crash.
 */
async function waitUntilReady(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const ready = await page.evaluate(() => !document.body.innerText.includes('Loading'))
    if (ready) return true
    await page.waitForTimeout(80)
  }
  return false
}

async function runShot(browser, [name, query, patchKey, waitBefore, waitAfter, options = {}]) {
  const attempts = options.attempts ?? 4
  for (let attempt = 1; attempt <= attempts; attempt++) {
    // Back off the post-mount waits on retries — a crash on a prior attempt means this
    // page's budget before context loss is tighter than usual right now.
    const backoff = attempt >= 3 ? 0.5 : 1
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 })
    if (options.reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' })
    let crashed = false
    page.on('console', (m) => {
      if (m.text().includes('Context Lost')) crashed = true
    })
    try {
      await page.goto(`${ORIGIN}/${query}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForSelector('canvas', { timeout: 30000 })
      const ready = await waitUntilReady(page, 1800)
      if (!ready) {
        console.warn(`${name}: attempt ${attempt} still loading after 1.8s, retrying with a fresh page`)
        await page.close()
        continue
      }
      const patch = PATCHES[patchKey]
      if (waitBefore) {
        const prePatchWait = patch ? Math.min(waitBefore, 120) : waitBefore
        await page.waitForTimeout(Math.round(prePatchWait * backoff))
      }
      if (patch) {
        await page.evaluate(new Function(`return (async () => { ${patch} })()`))
      }
      // A patch can trigger a brief re-suspend (e.g. entering 'serving' resets the ball
      // to its service position); give it a moment to clear rather than screenshotting
      // mid-fallback.
      const readyAfterPatch = await waitUntilReady(page, 900)
      if (!readyAfterPatch) {
        console.warn(`${name}: attempt ${attempt} still loading after patch, retrying with a fresh page`)
        await page.close()
        continue
      }
      if (waitAfter) await page.waitForTimeout(Math.round(waitAfter * backoff))
      const stillReady = await page.evaluate(() => !document.body.innerText.includes('Loading'))
      if (!stillReady) {
        console.warn(`${name}: attempt ${attempt} fell back to loading before the shot, retrying with a fresh page`)
        await page.close()
        continue
      }
      if (crashed) {
        console.warn(`${name}: attempt ${attempt} context lost, retrying with a fresh page`)
        await page.close()
        continue
      }
      const path = join(OUT, `${name}.png`)
      await page.screenshot({ path, type: 'png' })
      if (options.verify && !(await options.verify(path))) {
        // A single fixed wait can land on a stale frame — e.g. re-entering `serving`
        // sometimes remounts the whole Canvas tree a second time, briefly resetting the
        // ball's material to its default colour before the next frame repaints it. Poll
        // a few more frames on this same page (no reload) before giving up on it, since
        // the underlying store state is already correct and only the paint is lagging.
        let verified = false
        for (let i = 0; i < 6 && !crashed; i++) {
          await page.waitForTimeout(80)
          await page.screenshot({ path, type: 'png' })
          if (await options.verify(path)) {
            verified = true
            break
          }
        }
        if (!verified) {
          console.warn(`${name}: attempt ${attempt} failed pixel verification, retrying with a fresh page`)
          await page.close()
          continue
        }
      }
      console.log(`${name}: ok`)
      await page.close()
      return
    } catch (err) {
      console.error(`${name}: attempt ${attempt} FAILED`, err.message)
      await page.close()
    }
  }
  console.error(`${name}: gave up after ${attempts} attempts`)
}

function shotsToRun() {
  const only = process.env.SQ_CAPTURE_ONLY?.split(',').map((s) => s.trim()).filter(Boolean)
  if (!only?.length) return SHOTS
  return SHOTS.filter(([name]) => only.includes(name))
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    args: LAUNCH_ARGS,
    ...(CHROME_EXECUTABLE ? { executablePath: CHROME_EXECUTABLE } : {}),
  })
  for (const shot of shotsToRun()) {
    await runShot(browser, shot)
  }
  await browser.close()
  console.log('done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
