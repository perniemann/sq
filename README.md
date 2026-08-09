# sq_

<p align="center">
  <img src="public/sq-logo.svg" alt="sq_ mark" width="96" height="96" />
</p>

<!-- x-release-please-start-version -->
**Version:** 0.1.0
<!-- x-release-please-end -->

Browser-only 3D squash — WSF-dimension court, Rapier physics, Tron neon look, two-button input, PARS-11 best-of-3.

## Status

**Alpha (`0.1.x`).** Demo-mode matches already read as real squash; neon visuals and bloom are in good shape. UX/UI still need polish. The player movement and action controller is the largest remaining gap for pitchability — treat this release as a playable tech demo, not a finished game.

## Play

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

Full controls and scoring: [docs/HOW-TO-PLAY.md](docs/HOW-TO-PLAY.md).

### Quick controls

| Action | Mouse / keyboard | Touch |
|--------|------------------|-------|
| Start / continue / charge shot | Click or **Space** / **LMB** (hold to charge, release to hit) | Tap / hold **right** half |
| Aim while charging | Drag horizontally, or **A**/**D** / arrows | Drag on **right** half |
| Chase the ball | **Shift** / **RMB** | Hold **left** half |

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

No backend, env files, or network calls — entirely client-side.

## Versioning

Industry-standard SemVer + [Conventional Commits](https://www.conventionalcommits.org/) + [Release Please](https://github.com/googleapis/release-please):

- **Source of truth:** `package.json` → `version`
- **Runtime:** Vite injects `VITE_APP_VERSION` at config load; the idle HUD and document title show `vX.Y.Z`
- **Automation:** merges to `main` with `feat:` / `fix:` / breaking `!` open a Release Please PR that bumps SemVer, updates `CHANGELOG.md`, syncs this README version line, tags `vX.Y.Z`, and publishes a GitHub Release
- **Pre-1.0:** `bump-minor-pre-major` — features bump `0.y.0`, fixes bump `0.y.z` (no accidental 1.0)

Commit message prefixes that drive bumps:

- `fix:` → patch
- `feat:` → minor (while `< 1.0.0`)
- `feat!:` / `fix!:` / `BREAKING CHANGE:` → major (or next minor under pre-major policy)

See [CHANGELOG.md](CHANGELOG.md).

## Stack

Vite 6 · React 19 · React Three Fiber 9 · Three.js r182 · Rapier · Zustand 5 · TypeScript 5.7 strict · Vitest

## License

Private / unpublished unless otherwise noted.
