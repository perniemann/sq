---
name: project
description: Project-specific domain guidance for sq_, a browser 3D squash game built on React Three Fiber and Rapier.
---

# sq_ domain guidance

## Purpose

A physics-driven squash game on a WSF-dimension court, rendered in a black/cyan/orange
neon aesthetic. The player controls one side with two buttons: Space charges a shot
(120–750 ms hold sets power) and advances game phases, Shift chases the ball. The
opponent is AI. Scoring is PARS-11, win by 2 at 10–10, best of 3 games.

## Architecture

- `src/stores/gameStore.ts` — the single source of truth. Phase machines are string
  unions: `GamePhase` (idle → serving → rally ⇄ point → gameOver/matchOver),
  `RallyState`, `MovementPhase` (idle/splitStep/chasing/approaching/recovering),
  `ChargePhase` (none/racquetPrep/bodyCoil/powerLoad/followThrough), `ServiceBox`.
- `src/systems/` — pure functions, no React or R3F imports. `scoring.ts` owns PARS
  rules; `shotContext.ts` analyses position/rotation/charge into a shot and impulse,
  with `shotTypes.ts` as its facade; `hitAccuracy.ts` models the sweet spot;
  `ai.ts` drives the opponent; `swingAnimation.ts` and `courtPositions.ts` support them.
- `src/hooks/` — the bridge layer: input, hit handling, collision handling, serve reset.
- `src/components/Scene.tsx` — the per-frame game-logic hub. `Player.tsx` owns kinematic
  movement and the racquet sensor. `Ball.tsx` syncs position and detects out-of-bounds.

## Rules fidelity

Scoring, service-box alternation, the NOT UP first-wall rule, and deuce handling are
written against official WSF/PARS rules and the code cites them in comments. Check the
rule before changing the behaviour, and update the comment alongside the code.

## Deliberate physics choices

Ball radius 0.02 m is WSF-accurate but mass 0.024 kg is light on purpose (faster, bouncier
feel). The racquet collider (0.8 × 0.7 × 0.6 m) plus a 1.2 m proximity hit zone are
oversized for forgiveness. Do not "correct" these toward realism without being asked.

## Gotchas

`Scene` drives AI with a hard-coded `1/60` rather than the real `delta`, so behaviour
drifts on variable frame rates. `useFrame` callbacks run in mount order, so nothing
enforces the Ball → Scene → Player read/write sequence. Debug logging is gated on
`DEBUG` in `src/config.ts`. There is no test framework — verify with `npm run typecheck`
and by running `npm run dev`.
