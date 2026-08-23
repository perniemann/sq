<h1 align="center">
  <img src="public/sq-lockup.svg" alt="sq_" height="72" />
</h1>

<p align="center">
<!-- x-release-please-start-version -->
<strong>Version:</strong> 0.1.7
<!-- x-release-please-end -->
</p>

<p align="center">A 3D squash game you play in the browser against an AI opponent. WSF court dimensions, two-button controls, PARS-11 scoring.</p>

<p align="center">
  <a href="https://sq.perniemann.com">https://sq.perniemann.com</a>
</p>

<p align="center">
  <img src="public/design-media/capture-hero.png" alt="Idle court from behind the back wall: sq lockup and click-or-space on the front wall, cyan and orange athletes, diegetic 0–0 on the tin." width="850">
</p>

<p align="center">
  <img src="public/readme/plate-match-rail.svg" alt="Match flow: idle, then serving, then rally and point alternate, then game, then match. Space advances the match. Charging only works during a rally." width="850">
</p>

## Play

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

<p align="center">
  <img src="public/design-media/journey-idle.svg" alt="Idle lockup on the front wall" width="156">
  <img src="public/design-media/journey-serve.svg" alt="Serve ready on the tin" width="156">
  <img src="public/design-media/journey-rally.svg" alt="Rally score on the tin" width="156">
  <img src="public/design-media/journey-point.svg" alt="Point callout in striker colour" width="156">
  <img src="public/design-media/journey-match-over.svg" alt="Match over on the front wall" width="156">
</p>

## Controls

Hold Space to charge a shot, then release. How long you hold sets the length; drag while charging to set width and attack angle. Hold Shift to chase the ball.

<p align="center">
  <img src="public/design-media/capture-charge-prep.png" alt="Player close-up in the right service box: cyan athlete, orange ball, and early charge pose." width="850">
</p>

<p align="center">
  <img src="public/readme/plate-shot-axes.svg" alt="Shot controls: holding Space sets shot length, dragging left or right sets width, dragging up or down sets attack plane (front wall side is from above, back wall side is from below)." width="850">
</p>

| Action | Mouse / keyboard | Touch |
|--------|------------------|-------|
| Start / continue / charge shot (length) | Click or **Space** / **LMB** (hold to charge, release to hit) | Tap / hold **right** half |
| Aim (width; extreme → side-first boast) / attack plane (front=above · back=below) while charging | Drag X/Y, or **A**/**D** + **W**/**S** (arrows) | Drag X/Y on **right** half |
| Chase the ball | **Shift** / **RMB** | Hold **left** half |

## Returnability

The ball goes dead after every shot. It only becomes returnable again once it touches the front wall (WSF rule 6.2). A side or back wall touch doesn't count, and neither does the floor.

<p align="center">
  <img src="public/readme/plate-returnability.svg" alt="Returnability: the ball is dead until it touches the front wall. Side and back wall contact do not count. Once the front wall is hit, the ball tints in the striker's colour (WSF rule 6.2)." width="850">
</p>

Scoring is PARS-11: games to 11, win by 2 at 10-10, best of 3 games. Full controls and scoring: [docs/HOW-TO-PLAY.md](docs/HOW-TO-PLAY.md).

## Known limitations

| Area | Note |
|------|------|
| Returnability | Restores only on front-wall contact, as above |
| Hit zone | Racquet collider and proximity check are oversized on purpose, for forgiveness |
| Ball | WSF radius, but the mass is light so it moves faster |
| Bundle size | Rapier (physics) is most of the download |
| Scene | Re-renders more than it should |

## Stack

Vite 6 · React 19 · React Three Fiber 9 · Three.js r182 · Rapier · Zustand 5 · TypeScript 5.7 strict · Vitest

No backend, no env files, no network calls. Entirely client-side.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Local Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | ESLint |
| `npm test` | Vitest (unit) |
| `npm run test:watch` | Vitest watch mode |

## Deploy

Play at [https://sq.perniemann.com](https://sq.perniemann.com). CI builds the static site on `main`.

## Versioning

SemVer, with [Conventional Commits](https://www.conventionalcommits.org/) and [Release Please](https://github.com/googleapis/release-please):

- **Source of truth:** `package.json` → `version`
- **Runtime:** Vite injects `VITE_APP_VERSION` at config load; the idle HUD and document title show `vX.Y.Z`
- **Automation:** merges to `main` with `feat:` / `fix:` / breaking `!` open a Release Please PR that bumps SemVer, updates `CHANGELOG.md`, syncs this README version line, tags `vX.Y.Z`, and publishes a GitHub Release
- **Bootstrap:** `v0.1.0` is tagged as the baseline so Release Please can find the last release; without that tag it warns `Expected 1 releases, only found 0`
- **Pre-1.0:** `bump-minor-pre-major`, so features bump `0.y.0` and fixes bump `0.y.z` (no accidental 1.0)

Commit message prefixes that drive bumps:

- `fix:` → patch
- `feat:` → minor (while `< 1.0.0`)
- `feat!:` / `fix!:` / `BREAKING CHANGE:` → major (or next minor under pre-major policy)

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT, see [LICENSE](LICENSE).
