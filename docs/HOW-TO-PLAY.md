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

- **Keyboard:** hold **Space**, aim left/right with **A**/**D** or ←/→, attack plane with **W**/**S** or ↑/↓, release to hit
- **Mouse:** hold **left button**, drag horizontally to aim and vertically for attack plane, release to hit
- **Touch:** hold the **right** half of the screen, drag to aim (X) and attack plane (Y), release to hit

Hold early while the ball is live for more **length** (roughly 120–750 ms: tap → drive → full length). Charge sets pace / depth; **aim L/R** sets **width** (extreme aim can hit a **side wall first** — a legal boast); stick **toward the front wall** = shot **from above**, **toward you** = **from below**. Clean contact (sweet spot + swing timing) tracks your aim; rushed or edge hits drift. Release starts the swing. Charging slows your chase a little. Short taps advance menus (start, next point, next game).

### Chase (Button B)

- **Keyboard:** hold **Shift**
- **Mouse:** hold **right button**
- **Touch:** hold the **left** half of the screen

Chase moves you toward the ball. Timing chase with your shot is the core loop.

## Rally readability

- The **3D ball** itself tints cyan/orange when it is **live / returnable** — the prior return has hit the **front wall** (WSF). Color matches the current striker. Side/back walls alone do not make it returnable.
- Charge cone under your feet is a **180° destination arc**: drag/aim right = court right, left = court left (neutral = straight ahead; extremes can boast off a side wall first). Soft **LOB / STRAIGHT / SMASH / BOAST** labels brighten with your stick (still continuous — no snap). The large centre word is the **live shot type** that will fire (DRIVE, BOAST, LOB, …). Length ticks mark tap / drive / full-length bands; a side rail shows attack plane (toward front wall = from above / SMASH end, toward you = from below / LOB end; mid tick = neutral).

## Scoring (short)

- Games to 11, win by 2 at 10–10 (PARS)
- Match is best of 3 games
- Server alternates service boxes; fault / not-up / out / double-bounce rules apply as implemented in the rules layer

When a point ends, use Button A to continue. After a game, Button A starts the next game; after the match, Button A resets.

## Tips

- Watch the one-shot teach prompts on your first serve, return, and (if needed) first lost DOUBLE BOUNCE
- Neon shot callouts flash the shot type after a clean hit
- Append `?nobloom` to compare the scene without bloom; `?orbit` enables debug camera orbit when available
