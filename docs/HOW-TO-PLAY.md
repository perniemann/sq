<h1 align="center">
  <img src="../public/sq-lockup.svg" alt="sq_" height="64" />
</h1>

<p align="center">
<!-- x-release-please-start-version -->
<strong>Version:</strong> 0.1.0
<!-- x-release-please-end -->
</p>

<p align="center"><strong>How to play</strong></p>

See also [README](../README.md).

sq_ is a browser squash match against AI. The court uses real WSF dimensions; scoring follows PARS-11 (best of 3 games).

## Start a match

1. Run `npm run dev` and open the app in a modern desktop or mobile browser.
2. Demo mode plays AI vs AI until you interact.
3. Click / press **Space** / tap the **right** side to leave demo and start playing.

## Controls

### Shot (Button A)

- **Keyboard:** hold **Space**, aim with **A**/**D** or ←/→, release to hit
- **Mouse:** hold **left button**, drag horizontally to aim, release to hit
- **Touch:** hold the **right** half of the screen, drag to aim, release to hit

Hold longer for more power (roughly 120–750 ms). Short taps advance menus (start, next point, next game).

### Chase (Button B)

- **Keyboard:** hold **Shift**
- **Mouse:** hold **right button**
- **Touch:** hold the **left** half of the screen

Chase moves you toward the ball. Timing chase with your shot is the core loop.

## Scoring (short)

- Games to 11, win by 2 at 10–10 (PARS)
- Match is best of 3 games
- Server alternates service boxes; fault / not-up / out / double-bounce rules apply as implemented in the rules layer

When a point ends, use Button A to continue. After a game, Button A starts the next game; after the match, Button A resets.

## Tips

- Watch the one-shot teach prompts on your first serve and return
- Neon shot callouts flash the shot type after a clean hit
- Append `?nobloom` to compare the scene without bloom; `?orbit` enables debug camera orbit when available
