# 3D models

- `court.glb` — Court shell + lines (`mat_a` fill, `mat_b` accents). Authored ~8.42×4.62×9.76; scaled onto WSF colliders at runtime.
- `tin.glb` — Front-wall tin band (0–0.48 m), same origin as the court; tinted `#ff6600`.
- `player.glb` — Athlete body (1.5 m tall); rendered at scale 1.
- `racquet.glb` — Visual racquet; pivot at the grip. Hit detection uses a separate sensor collider.
- `ball.glb` — Ball mesh; scaled to the physics diameter (40 mm).

Reproduce sizes: `npm run measure:glb`
