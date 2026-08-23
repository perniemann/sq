# readme plates

Claim diagrams for the repository README. Void-plated so ink stays legible on GitHub light hosts.

| File | Claim |
|------|--------|
| [plate-match-rail.svg](plate-match-rail.svg) | `idle → serving → rally ⇄ point → game / match` |
| [plate-shot-axes.svg](plate-shot-axes.svg) | Hold is length; aim X is width; stick Y is attack plane |
| [plate-returnability.svg](plate-returnability.svg) | `canHit` restores only after the front wall (WSF 6.2) |

Journey stills live in [`../design-media/`](../design-media/) — scene evidence, not argument diagrams.

Hand-authored SVG. Tokens from `src/theme/colors.ts`.

**Motion contract:** base CSS keeps every plate fully visible (opacity 1, strokes drawn). Hide offsets live only in `@keyframes from` blocks, never as static pre-animation CSS, so GitHub `<img>` embeds that skip SVG animation still render the full diagram. Entrance is one pass (~1.5–2s): title fade, structure stroke-draw, nodes rise with stagger, then a single small alive cue (rally glow, attack-plane blink, live ball halo). All `animation` rules live inside `@media (prefers-reduced-motion: no-preference)`.
